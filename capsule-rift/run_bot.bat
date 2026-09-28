@echo off
cd /d "%~dp0"

set "PYTHON_EXE=.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=..\grocery_sort_bot\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

:loop
"%PYTHON_EXE%" "bot.py" 1>>"bot.out.log" 2>>"bot.err.log"
echo.>>"bot.err.log"
echo Bot stopped. Restarting in 5 seconds...>>"bot.err.log"
timeout /t 5 /nobreak >nul
goto loop
