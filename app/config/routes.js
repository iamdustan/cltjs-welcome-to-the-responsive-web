var home = require('../controllers/home');

exports = module.exports = function(server) {

  server.all('/', home.index);
  server.all('/master', home.master);
}
