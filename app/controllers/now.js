var nowjs = require('now')

exports = module.exports = function(server) {
  var everyone = nowjs.initialize( server );

  console.log( 'initializing nowjs' );
  everyone.now.getServerInfo = function( callback ) {
    console.log( 'everyone.now.getServerInfo' );
    db.doQuery( callback );
  }

  everyone.now.distributeMessage = function( message ) {
    console.log( 'everyone.now.receiveMessage' );
    everyone.now.receiveMessage(this.now.name, message);
  };

  everyone.now.moveToSlide = function( to, from ) {
    console.log( 'everyone.now.receiveSlide', to, from );
    everyone.now.changeToSlide( to, from );
  };
}

