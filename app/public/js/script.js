
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

now.changeToSlide = function( to, from ) {
  $.deck('go', to)
};

