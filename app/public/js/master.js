
$.extend(true, $.deck.defaults, {
   selectors: {
      hashLink: '.deck-permalink'
   },

   hashPrefix: 'slide-'
});


$.deck('.slide');

setTimeout(function() {
  window.scrollTo(0, 1)
  $('#hcard-Dustan-Kasten').css({ bottom: 0 });
}, 100);


sh_highlightDocument();

$(document).bind('deck.change', function( event, from, to ) {
  now.moveToSlide( to, from );
});


