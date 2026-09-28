# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import html
import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import (
    BotCommand,
    BotCommandScopeChat,
    BotCommandScopeDefault,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from aiogram.utils.backoff import BackoffConfig


BASE_DIR = Path(__file__).resolve().parent


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env(BASE_DIR / ".env")

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEB_APP_URL = os.getenv("WEB_APP_URL", "").strip()
MINI_APP_NAME = os.getenv("MINI_APP_NAME", "Capsule Rift").strip() or "Capsule Rift"
GAME_ID = os.getenv("GAME_ID", "capsule_rift").strip() or "capsule_rift"
SYNC_BOT_PROFILE = os.getenv("SYNC_BOT_PROFILE", "0").strip().lower() in {"1", "true", "yes", "on"}
DB_PATH = Path(os.getenv("DB_PATH", "capsule_rift.sqlite3"))
if not DB_PATH.is_absolute():
    DB_PATH = BASE_DIR / DB_PATH

ADMIN_IDS = {
    int(part.strip())
    for part in os.getenv("ADMIN_IDS", "").replace(";", ",").split(",")
    if part.strip().isdigit()
}

BOT_USERNAME = ""
BOT_SHORT_DESCRIPTION = "Гача-JRPG про космического агента, капсулы героев и автобои."
BOT_DESCRIPTION = (
    "Capsule Rift — Telegram Mini App про космического агента, который собирает героев "
    "из капсул, усиливает дубликаты и отправляет отряд в автобои разлома."
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("capsule-rift-bot")

dp = Dispatcher()


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS players (
                telegram_id INTEGER PRIMARY KEY,
                username    TEXT,
                first_name  TEXT,
                source      TEXT,
                starts      INTEGER NOT NULL DEFAULT 0,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen   DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS web_app_events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                game        TEXT NOT NULL,
                event       TEXT NOT NULL,
                payload     TEXT,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def is_https_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.netloc)


def extract_start_source(message_text: Optional[str]) -> Optional[str]:
    parts = (message_text or "").split(maxsplit=1)
    if len(parts) < 2:
        return None
    source = parts[1].strip()
    return source[:128] if source else None


def upsert_player(user_id: int, username: Optional[str], first_name: Optional[str], source: Optional[str]) -> None:
    with db() as conn:
        conn.execute(
            """
            INSERT INTO players (telegram_id, username, first_name, source, starts)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username = excluded.username,
                first_name = excluded.first_name,
                source = COALESCE(players.source, excluded.source),
                starts = players.starts + 1,
                last_seen = CURRENT_TIMESTAMP
            """,
            (user_id, username, first_name, source),
        )


def start_keyboard(is_admin_user: bool = False) -> Optional[ReplyKeyboardMarkup]:
    keyboard = []
    if is_https_url(WEB_APP_URL):
        keyboard.append([KeyboardButton(text="Играть", web_app=WebAppInfo(url=WEB_APP_URL))])
    if is_admin_user:
        keyboard.append([KeyboardButton(text="Админ-панель")])
    if not keyboard:
        return None
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        input_field_placeholder="Открой игру или админку",
    )


def admin_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Обновить статистику", callback_data="admin_refresh")],
        ]
    )


def build_start_text(is_admin_user: bool) -> str:
    lines = [
        f"<b>{html.escape(MINI_APP_NAME)}</b>",
        "",
        "Ты космический агент: собирай героев из капсул, усиливай копии и отправляй отряд в разлом.",
    ]
    if is_https_url(WEB_APP_URL):
        lines.append("")
        lines.append("Нажми кнопку <b>Играть</b>, чтобы открыть Mini App.")
    elif WEB_APP_URL:
        lines.append("")
        lines.append("Команды работают, но кнопка Mini App скрыта: для Telegram нужен HTTPS WEB_APP_URL.")
        lines.append(f"Сейчас указан: <code>{html.escape(WEB_APP_URL)}</code>")
    else:
        lines.append("")
        lines.append("Команды работают. Добавь HTTPS WEB_APP_URL в .env, чтобы появилась кнопка игры.")
    if is_admin_user:
        lines.append("")
        lines.append("Админка доступна через /admin или кнопку <b>Админ-панель</b>.")
    return "\n".join(lines)


def build_admin_stats_text() -> str:
    with db() as conn:
        players_total = scalar(conn, "SELECT COUNT(*) FROM players")
        players_today = scalar(conn, "SELECT COUNT(*) FROM players WHERE date(created_at) = date('now')")
        starts_total = scalar(conn, "SELECT COALESCE(SUM(starts), 0) FROM players")
        events_total = scalar(conn, "SELECT COUNT(*) FROM web_app_events WHERE game = ?", (GAME_ID,))
        last_seen = conn.execute("SELECT MAX(last_seen) FROM players").fetchone()[0]
        last_event = conn.execute(
            "SELECT MAX(created_at) FROM web_app_events WHERE game = ?",
            (GAME_ID,),
        ).fetchone()[0]

    mini_app_status = "HTTPS, кнопка игры включена" if is_https_url(WEB_APP_URL) else "нужен HTTPS WEB_APP_URL"
    return "\n".join(
        [
            f"<b>Админ-панель {html.escape(MINI_APP_NAME)}</b>",
            "",
            f"Игроков: <b>{_format_number(players_total)}</b>",
            f"Новых сегодня: <b>{_format_number(players_today)}</b>",
            f"Запусков /start: <b>{_format_number(starts_total)}</b>",
            f"Событий Mini App: <b>{_format_number(events_total)}</b>",
            f"Админов в env: <b>{_format_number(len(ADMIN_IDS))}</b>",
            "",
            f"Mini App: <b>{html.escape(mini_app_status)}</b>",
            f"Game ID: <code>{html.escape(GAME_ID)}</code>",
            f"База: <code>{html.escape(DB_PATH.name)}</code>",
            f"Последний игрок: <code>{html.escape(_fmt_date(last_seen))}</code>",
            f"Последнее событие: <code>{html.escape(_fmt_date(last_event))}</code>",
        ]
    )


async def send_admin_panel(message: Message) -> None:
    user_id = message.from_user.id
    if not is_admin(user_id):
        log.info("admin panel denied for %s", user_id)
        await message.answer("Нет доступа к админ-панели.")
        return
    log.info("admin panel opened by %s", user_id)
    await message.answer(build_admin_stats_text(), reply_markup=admin_keyboard())


@dp.message(Command("start"))
async def cmd_start(message: Message) -> None:
    user = message.from_user
    source = extract_start_source(message.text)
    log.info("/start from %s source=%s", user.id, source or "-")
    upsert_player(user.id, user.username, user.first_name, source=source)
    await message.answer(build_start_text(is_admin(user.id)), reply_markup=start_keyboard(is_admin(user.id)))


@dp.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    await send_admin_panel(message)


@dp.message(F.text.casefold() == "админ-панель")
async def cmd_admin_button(message: Message) -> None:
    await send_admin_panel(message)


@dp.message(F.web_app_data)
async def on_web_app_data(message: Message) -> None:
    raw_data = (message.web_app_data.data or "").strip()
    try:
        payload = json.loads(raw_data)
    except json.JSONDecodeError:
        log.warning("Bad web_app_data from %s", message.from_user.id)
        return
    if not isinstance(payload, dict):
        return

    game = str(payload.get("game") or GAME_ID)
    event = str(payload.get("event") or payload.get("type") or "web_app_data")
    if game != GAME_ID:
        return

    with db() as conn:
        conn.execute(
            """
            INSERT INTO web_app_events (telegram_id, game, event, payload)
            VALUES (?, ?, ?, ?)
            """,
            (message.from_user.id, game, event[:64], json.dumps(payload, ensure_ascii=False)),
        )
    await message.answer("Статистика Capsule Rift получена.")


@dp.callback_query(F.data == "admin_refresh")
async def on_admin_refresh(callback) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    try:
        await callback.message.edit_text(build_admin_stats_text(), reply_markup=admin_keyboard())
    except TelegramBadRequest as exc:
        if "message is not modified" not in str(exc):
            raise
    await callback.answer("Обновлено")


def scalar(conn: sqlite3.Connection, query: str, params=()) -> int:
    row = conn.execute(query, params).fetchone()
    return int((row[0] if row else 0) or 0)


def _format_number(value) -> str:
    try:
        return f"{int(value):,}".replace(",", " ")
    except Exception:
        return "0"


def _fmt_date(value) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "-"
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(raw[:19], fmt)
            return dt.strftime("%d.%m.%Y %H:%M") if "H" in fmt else dt.strftime("%d.%m.%Y")
        except ValueError:
            pass
    return raw


async def on_startup(bot: Bot) -> None:
    global BOT_USERNAME
    init_db()
    me = await bot.get_me()
    BOT_USERNAME = me.username or ""
    await bot.delete_webhook(drop_pending_updates=True)
    await bot.set_my_commands(
        [BotCommand(command="start", description="Открыть игру")],
        scope=BotCommandScopeDefault(),
    )
    for admin_id in ADMIN_IDS:
        try:
            await bot.set_my_commands(
                [
                    BotCommand(command="start", description="Открыть игру"),
                    BotCommand(command="admin", description="Админ-панель"),
                ],
                scope=BotCommandScopeChat(chat_id=admin_id),
            )
        except Exception as exc:
            log.warning("Could not set admin commands for admin chat: %s", exc)
    if SYNC_BOT_PROFILE:
        try:
            await bot.set_my_short_description(BOT_SHORT_DESCRIPTION)
            await bot.set_my_description(BOT_DESCRIPTION)
        except Exception as exc:
            log.warning("Could not update bot profile: %s", exc)
    log.info("Bot username: @%s", BOT_USERNAME)
    log.info("Database: %s", DB_PATH)
    log.info("Mini App URL status: %s", "https" if is_https_url(WEB_APP_URL) else "not https")


async def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is empty. Create .env from .env.example.")
    if not ADMIN_IDS:
        log.warning("ADMIN_IDS is empty. /admin will be unavailable.")

    dp.startup.register(on_startup)
    session = AiohttpSession(timeout=20)
    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML), session=session)
    await dp.start_polling(
        bot,
        polling_timeout=10,
        backoff_config=BackoffConfig(min_delay=1.0, max_delay=3.0, factor=1.3, jitter=0.2),
        allowed_updates=dp.resolve_used_update_types(),
    )


if __name__ == "__main__":
    asyncio.run(main())
