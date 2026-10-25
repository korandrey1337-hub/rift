HubCloud.init(window.HUB_PROGRESS).then(async function () {
  await import('./hub-events.js');
  await import('./hub-gameplay.js');
  var game = document.createElement('script');
  game.src = './game.js?v=hub-events-20261025';
  document.body.appendChild(game);
});
