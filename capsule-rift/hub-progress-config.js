window.HUB_PROGRESS = {
  game: 'capsule-rift',
  keys: ['capsule-rift-agent-v2', 'hub-events:capsule-rift:v1'],
  score: function (keys) {
    var save = JSON.parse(keys['capsule-rift-agent-v2'] || '{}');
    return Math.max(save.stage || 1, save.stats && save.stats.highestStage || 1);
  }
};
