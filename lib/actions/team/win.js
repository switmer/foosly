const getScope = require('utilities/scope');
const state = require('utilities/state');
const gamesStore = require('stores/games');
const usersStore = require('stores/users');
const respond = require('utilities/respond');
const leaderboard = require('actions/stats/leaderboard').callback;

exports.callbackId = require('./id');
exports.name = 'team';
exports.callback = async (msg, val) => {
  const scope = getScope(msg.meta.team_id, msg.meta.channel_id);
  const currentGame = await state.get(scope);
  await Promise.all([
    // Register players wins/losses
    Promise.all(currentGame.teams.map((team, index) =>
      Promise.all(team.map(id => incrementStat(scope, val == index ? 'wins' : 'losses', id)))
    )),

    // Record game
    gamesStore.add(scope, {
      winner: currentGame.teams[val],
      loser: currentGame.teams[val == 0 ? 1 : 0],
      timestamp: new Date().getTime()
    }),

    // Reset scope
    state.del(scope)
  ]);

  respond(msg, require('responses/winner')(currentGame.players, currentGame.teams[val]).json());
  return leaderboard(msg);
};

async function incrementStat (scope, key, id) {
  const users = await usersStore.get(scope);
  const user = users.find(u => u.id === id);

  if (user) {
    return usersStore.update(scope, { id }, Object.assign(user, {
      [key]: user[key] + 1
    }));
  } else {
    return usersStore.add(scope, Object.assign({
      id,
      wins: 0,
      losses: 0
    }, { [key]: 1 }));
  }
}
