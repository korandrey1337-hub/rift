(function () {
  'use strict';
  var events = window.HubGameEvents.create('capsule-rift');
  window.RiftHub = {
    start: function (stage) { return { id: events.runId(), stage: stage }; },
    end: function (run, won, wave, abandoned) {
      if (!run) return;
      if (!events.runEnd(run.id, { won: won, depth: run.stage, wave: wave, abandoned: !!abandoned })) return;
      if (won) {
        events.achievement('arena_winner');
        if (run.stage >= 30) events.achievement('rift_veteran');
      }
    },
    pull: function (save) {
      events.achievement('first_capsule');
      if (save.party.length >= 3) events.achievement('full_squad');
    },
    fuse: function () { events.achievement('triplets'); },
    contracts: function (left) { if (left === 0) events.achievement('contractor'); }
  };
})();
