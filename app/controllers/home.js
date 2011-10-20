exports = module.exports = {

  index: function(req, res, next) {
    res.status(200, 'info', 'This is a message');
    res.context({ message: "Hello, slave!" }, 'home/index', req.param('format'));
  },

  master: function(req, res, next) {
    res.status(200, 'info', 'You are the master' );
    res.context({ message: "Hello, master." }, 'home/master', req.param('format'));
  }
}
