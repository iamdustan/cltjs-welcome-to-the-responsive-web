/*
 * deck.core
 * deck.hash
 * */

// {{{ deck.core

/*!
Deck JS - deck.core
Copyright (c) 2011 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/deck.js/blob/master/MIT-license.txt
https://github.com/imakewebthings/deck.js/blob/master/GPL-license.txt
*/

/*
The deck.core module provides all the basic functionality for creating and
moving through a deck.  It does so by applying classes to indicate the state of
the deck and its slides, allowing CSS to take care of the visual representation
of each state.  It also provides methods for navigating the deck and inspecting
its state, as well as basic key bindings for going to the next and previous
slides.  More functionality is provided by wholly separate extension modules
that use the API provided by core.
*/
(function($, deck, document, undefined) {
	var slides, // Array of all the uh, slides...
	current, // Array index of the current slide
	
	events = {
		/*
		This event fires whenever the current slide changes, whether by way of
		next, prev, or go. The callback function is passed two parameters, from
		and to, equal to the indices of the old slide and the new slide
		respectively.
		
		$(document).bind('deck.change', function(event, from, to) {
		   alert('Moving from slide ' + from + ' to ' + to);
		});
		*/
		change: 'deck.change',
		
		/*
		This event fires at the end of deck initialization. Extensions should
		implement any code that relies on user extensible options (key bindings,
		element selectors, classes) within a handler for this event. Native
		events associated with Deck JS should be scoped under a .deck event
		namespace, as with the example below:
		
		var $d = $(document);
		$.deck.defaults.keys.myExtensionKeycode = 70; // 'h'
		$d.bind('deck.init', function() {
		   $d.bind('keydown.deck', function(event) {
		      if (event.which === $.deck.getOptions().keys.myExtensionKeycode) {
		         // Rock out
		      }
		   });
		});
		*/
		initialize: 'deck.init' 
	},
	
	options = {},
	$d = $(document),
	
	/*
	Internal function. Updates slide and container classes based on which
	slide is the current slide.
	*/
	updateStates = function() {
		var oc = options.classes,
		osc = options.selectors.container,
		$container = $(osc),
		old = $container.data('onSlide'),
		$all = $();
		
		// Container state
		$container.removeClass(oc.onPrefix + old)
			.addClass(oc.onPrefix + current)
			.data('onSlide', current);
		
		// Remove and re-add child-current classes for nesting
		$('.' + oc.current).parentsUntil(osc).removeClass(oc.childCurrent);
		slides[current].parentsUntil(osc).addClass(oc.childCurrent);
		
		// Remove previous states
		$.each(slides, function(i, el) {
			$all = $all.add(el);
		});
		$all.removeClass([
			oc.before,
			oc.previous,
			oc.current,
			oc.next,
			oc.after
		].join(" "));
		
		// Add new states back in
		slides[current].addClass(oc.current);
		if (current > 0) {
			slides[current-1].addClass(oc.previous);
		}
		if (current + 1 < slides.length) {
			slides[current+1].addClass(oc.next);
		}
		if (current > 1) {
			$.each(slides.slice(0, current - 1), function(i, el) {
				el.addClass(oc.before);
			});
		}
		if (current + 2 < slides.length) {
			$.each(slides.slice(current+2), function(i, el) {
				el.addClass(oc.after);
			});
		}
	},
	
	/* Methods exposed in the jQuery.deck namespace */
	methods = {
		
		/*
		jQuery.deck(selector, options)
		
		selector: string | jQuery | array
		options: object, optional
				
		Initializes the deck, using each element matched by selector as a slide.
		May also be passed an array of string selectors or jQuery objects, in
		which case each selector in the array is considered a slide. The second
		parameter is an optional options object which will extend the default
		values.
		
		$.deck('.slide');
		
		or
		
		$.deck([
		   '#first-slide',
		   '#second-slide',
		   '#etc'
		]);
		*/	
		init: function(elements, opts) {
			var startTouch,
			$c,
			tolerance,
			esp = function(e) {
				e.stopPropagation();
			};
			
			options = $.extend(true, {}, $[deck].defaults, opts);
			slides = [];
			current = 0;
			$c = $[deck]('getContainer');
			tolerance = options.touch.swipeTolerance;
			
			// Hide the deck while states are being applied to kill transitions
			$c.addClass(options.classes.loading);
			
			// Fill slides array depending on parameter type
			if ($.isArray(elements)) {
				$.each(elements, function(i, e) {
					slides.push($(e));
				});
			}
			else {
				$(elements).each(function(i, e) {
					slides.push($(e));
				});
			}
			
			/* Remove any previous bindings, and rebind key events */
			$d.unbind('keydown.deck').bind('keydown.deck', function(e) {
				if (e.which === options.keys.next || $.inArray(e.which, options.keys.next) > -1) {
					methods.next();
					e.preventDefault();
				}
				else if (e.which === options.keys.previous || $.inArray(e.which, options.keys.previous) > -1) {
					methods.prev();
					e.preventDefault();
				}
			});
			
			/* Bind touch events for swiping between slides on touch devices */
			$c.unbind('touchstart.deck').bind('touchstart.deck', function(e) {
				if (!startTouch) {
					startTouch = $.extend({}, e.originalEvent.targetTouches[0]);
				}
			})
			.unbind('touchmove.deck').bind('touchmove.deck', function(e) {
				$.each(e.originalEvent.changedTouches, function(i, t) {
					if (startTouch && t.identifier === startTouch.identifier) {
						if (t.screenX - startTouch.screenX > tolerance || t.screenY - startTouch.screenY > tolerance) {
							$[deck]('prev');
							startTouch = undefined;
						}
						else if (t.screenX - startTouch.screenX < -1 * tolerance || t.screenY - startTouch.screenY < -1 * tolerance) {
							$[deck]('next');
							startTouch = undefined;
						}
						return false;
					}
				});
				e.preventDefault();
			})
			.unbind('touchend.deck').bind('touchend.deck', function(t) {
				$.each(t.originalEvent.changedTouches, function(i, t) {
					if (startTouch && t.identifier === startTouch.identifier) {
						startTouch = undefined;
					}
				});
			})
			.scrollLeft(0).scrollTop(0)
			/* Stop propagation of key events within editable elements of slides */
			.undelegate('input, textarea, select, button, meter, progress, [contentEditable]', 'keydown', esp)
			.delegate('input, textarea, select, button, meter, progress, [contentEditable]', 'keydown', esp);
			
			/*
			Kick iframe videos, which dont like to redraw w/ transforms.
			Remove this if Webkit ever fixes it.
			 */
			$.each(slides, function(i, $el) {
				$el.unbind('webkitTransitionEnd.deck').bind('webkitTransitionEnd.deck',
				function(event) {
					if ($el.hasClass($[deck]('getOptions').classes.current)) {
						var embeds = $(this).find('iframe').css('opacity', 0);
						window.setTimeout(function() {
							embeds.css('opacity', 1);
						}, 100);
					}
				});
			});
			
			updateStates();
			
			// Show deck again now that slides are in place
			$c.removeClass(options.classes.loading);
			$d.trigger(events.initialize);
		},
		
		/*
		jQuery.deck('go', index)
		
		index: integer
		
		Moves to the slide at the specified index. Index is 0-based, so
		$.deck('go', 0); will move to the first slide. If index is out of bounds
		or not a number the call is ignored.
		*/
		go: function(index) {
			if (typeof index != 'number' || index < 0 || index >= slides.length) return;
			
			$d.trigger(events.change, [current, index]);
			current = index;
			updateStates();
		},
		
		/*
		jQuery.deck('next')
		
		Moves to the next slide. If the last slide is already active, the call
		is ignored.
		*/
		next: function() {
			methods.go(current+1);
		},
		
		/*
		jQuery.deck('prev')
		
		Moves to the previous slide. If the first slide is already active, the
		call is ignored.
		*/
		prev: function() {
			methods.go(current-1);
		},
		
		/*
		jQuery.deck('getSlide', index)
		
		index: integer, optional
		
		Returns a jQuery object containing the slide at index. If index is not
		specified, the current slide is returned.
		*/
		getSlide: function(index) {
			var i = typeof index !== 'undefined' ? index : current;
			if (typeof i != 'number' || i < 0 || i >= slides.length) return null;
			return slides[i];
		},
		
		/*
		jQuery.deck('getSlides')
		
		Returns all slides as an array of jQuery objects.
		*/
		getSlides: function() {
			return slides;
		},
		
		/*
		jQuery.deck('getContainer')
		
		Returns a jQuery object containing the deck container as defined by the
		container option.
		*/
		getContainer: function() {
			return $(options.selectors.container);
		},
		
		/*
		jQuery.deck('getOptions')
		
		Returns the options object for the deck, including any overrides that
		were defined at initialization.
		*/
		getOptions: function() {
			return options;
		},
		
		/*
		jQuery.deck('extend', name, method)
		
		name: string
		method: function
		
		Adds method to the deck namespace with the key of name. This doesn’t
		give access to any private member data — public methods must still be
		used within method — but lets extension authors piggyback on the deck
		namespace rather than pollute jQuery.
		
		$.deck('extend', 'alert', function(msg) {
		   alert(msg);
		});

		// Alerts 'boom'
		$.deck('alert', 'boom');
		*/
		extend: function(name, method) {
			methods[name] = method;
		}
	};
	
	/* jQuery extension */
	$[deck] = function(method, arg) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else {
			return methods.init(method, arg);
		}
	};
	
	/*
	The default settings object for a deck. All deck extensions should extend
	this object to add defaults for any of their options.
	
	options.classes.after
		This class is added to all slides that appear after the 'next' slide.
	
	options.classes.before
		This class is added to all slides that appear before the 'previous'
		slide.
		
	options.classes.childCurrent
		This class is added to all elements in the DOM tree between the
		'current' slide and the deck container. For standard slides, this is
		mostly seen and used for nested slides.
		
	options.classes.current
		This class is added to the current slide.
		
	options.classes.loading
		This class is applied to the deck container during loading phases and is
		primarily used as a way to short circuit transitions between states
		where such transitions are distracting or unwanted.  For example, this
		class is applied during deck initialization and then removed to prevent
		all the slides from appearing stacked and transitioning into place
		on load.
		
	options.classes.next
		This class is added to the slide immediately following the 'current'
		slide.
		
	options.classes.onPrefix
		This prefix, concatenated with the current slide index, is added to the
		deck container as you change slides.
		
	options.classes.previous
		This class is added to the slide immediately preceding the 'current'
		slide.
		
	options.selectors.container
		Elements matched by this CSS selector will be considered the deck
		container. The deck container is used to scope certain states of the
		deck, as with the onPrefix option, or with extensions such as deck.goto
		and deck.menu.
		
	options.keys.next
		The numeric keycode used to go to the next slide.
		
	options.keys.previous
		The numeric keycode used to go to the previous slide.
		
	options.touch.swipeTolerance
		The number of pixels the users finger must travel to produce a swipe
		gesture.
	*/
	$[deck].defaults = {
		classes: {
			after: 'deck-after',
			before: 'deck-before',
			childCurrent: 'deck-child-current',
			current: 'deck-current',
			loading: 'deck-loading',
			next: 'deck-next',
			onPrefix: 'on-slide-',
			previous: 'deck-previous'
		},
		
		selectors: {
			container: '.deck-container'
		},
		
		keys: {
			// enter, space, page down, right arrow, down arrow,
			next: [13, 32, 34, 39, 40],
			// backspace, page up, left arrow, up arrow
			previous: [8, 33, 37, 38]
		},
		
		touch: {
			swipeTolerance: 60
		}
	};
	
	$d.ready(function() {
		$('html').addClass('ready');
	});
	
	/*
	FF + Transforms + Flash video don't get along...
	Firefox will reload and start playing certain videos after a
	transform.  Blanking the src when a previously shown slide goes out
	of view prevents this.
	*/
	$d.bind('deck.change', function(e, from, to) {
		var oldFrames = $[deck]('getSlide', from).find('iframe'),
		newFrames = $[deck]('getSlide', to).find('iframe');
		
		oldFrames.each(function() {
	    	var $this = $(this),
	    	curSrc = $this.attr('src');
            
            if(curSrc) {
            	$this.data('deck-src', curSrc).attr('src', '');
            }
		});
		
		newFrames.each(function() {
			var $this = $(this),
			originalSrc = $this.data('deck-src');
			
			if (originalSrc) {
				$this.attr('src', originalSrc);
			}
		});
	});
})(jQuery, 'deck', document);

// }}} deck.core

// {{{ deck.hash

/*!
Deck JS - deck.hash
Copyright (c) 2011 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/deck.js/blob/master/MIT-license.txt
https://github.com/imakewebthings/deck.js/blob/master/GPL-license.txt
*/

/*
This module adds deep linking to individual slides, enables internal links
to slides within decks, and updates the address bar with the hash as the user
moves through the deck. A permalink anchor is also updated. Standard themes
hide this link in browsers that support the History API, and show it for
those that do not. Slides that do not have an id are assigned one according to
the hashPrefix option. In addition to the on-slide container state class
kept by core, this module adds an on-slide state class that uses the id of each
slide.
*/
(function ($, deck, window, undefined) {
    var $d = $(document),
    $window = $(window),
    
    /* Collection of internal fragment links in the deck */
    $internals,
    
    /*
    Internal only function.  Given a string, extracts the id from the hash,
    matches it to the appropriate slide, and navigates there.
    */
    goByHash = function(str) {
        var id = str.substr(str.indexOf("#") + 1),
        slides = $[deck]('getSlides');
        
        $.each(slides, function(i, $el) {
            if ($el.attr('id') === id) {
                $[deck]('go', i);
                return false;
            }
        });
        
        // If we don't set these to 0 the container scrolls due to hashchange
        $[deck]('getContainer').scrollLeft(0).scrollTop(0);
    };
    
    /*
    Extends defaults/options.
    
    options.selectors.hashLink
        The element matching this selector has its href attribute updated to
        the hash of the current slide as the user navigates through the deck.
        
    options.hashPrefix
        Every slide that does not have an id is assigned one at initialization.
        Assigned ids take the form of hashPrefix + slideIndex, e.g., slide-0,
        slide-12, etc.
    */
    $.extend(true, $[deck].defaults, {
        selectors: {
            hashLink: '.deck-permalink'
        },
        
        hashPrefix: 'slide-'
    });
    
    
    $d.bind('deck.init', function() {
       var opts = $[deck]('getOptions');
        $internals = $();
        
        $.each($[deck]('getSlides'), function(i, $el) {
            var hash;
            
            /* Hand out ids to the unfortunate slides born without them */
            if (!$el.attr('id')) {
                $el.attr('id', opts.hashPrefix + i);
            }
            
            hash ='#' + $el.attr('id');
            
            /* Deep link to slides on init */
            if (hash === window.location.hash) {
                $[deck]('go', i);
            }
            
            /* Add internal links to this slide */
            $internals = $internals.add('a[href="' + hash + '"]');
        });
        
        if (!Modernizr.hashchange) {
            /* Set up internal links using click for the poor browsers
            without a hashchange event. */
            $internals.unbind('click.deckhash').bind('click.deckhash', function(e) {
                goByHash($(this).attr('href'));
            });
        }
        
        /* Set up first id container state class */
        $[deck]('getContainer').addClass(opts.classes.onPrefix + $[deck]('getSlide').attr('id'));
    })
    /* Update permalink, address bar, and state class on a slide change */
    .bind('deck.change', function(e, from, to) {
        var hash = '#' + $[deck]('getSlide', to).attr('id'),
        opts = $[deck]('getOptions'),
        osp = opts.classes.onPrefix,
        $c = $[deck]('getContainer');
        
        $c.removeClass(osp + $[deck]('getSlide', from).attr('id'));
        $c.addClass(osp + $[deck]('getSlide', to).attr('id'));
        
        $(opts.selectors.hashLink).attr('href', hash);
        if (Modernizr.history) {
            window.history.replaceState({}, "", hash);
        }
    });
    
    /* Deals with internal links in modern browsers */
    $window.bind('hashchange.deckhash', function(e) {
        if (e.originalEvent && e.originalEvent.newURL) {
            goByHash(e.originalEvent.newURL);
        }
        else {
            goByHash(window.location.hash);
        }
    });
})(jQuery, 'deck', this);

// }}} deck.hash



// {{{ syntax highlighter
/* Copyright (C) 2007, 2008 gnombat@users.sourceforge.net */
/* License: http://shjs.sourceforge.net/doc/gplv3.html */

if(!this.sh_languages){this.sh_languages={}}var sh_requests={};function sh_isEmailAddress(a){if(/^mailto:/.test(a)){return false}return a.indexOf("@")!==-1}function sh_setHref(b,c,d){var a=d.substring(b[c-2].pos,b[c-1].pos);if(a.length>=2&&a.charAt(0)==="<"&&a.charAt(a.length-1)===">"){a=a.substr(1,a.length-2)}if(sh_isEmailAddress(a)){a="mailto:"+a}b[c-2].node.href=a}function sh_konquerorExec(b){var a=[""];a.index=b.length;a.input=b;return a}function sh_highlightString(B,o){if(/Konqueror/.test(navigator.userAgent)){if(!o.konquered){for(var F=0;F<o.length;F++){for(var H=0;H<o[F].length;H++){var G=o[F][H][0];if(G.source==="$"){G.exec=sh_konquerorExec}}}o.konquered=true}}var N=document.createElement("a");var q=document.createElement("span");var A=[];var j=0;var n=[];var C=0;var k=null;var x=function(i,a){var p=i.length;if(p===0){return}if(!a){var Q=n.length;if(Q!==0){var r=n[Q-1];if(!r[3]){a=r[1]}}}if(k!==a){if(k){A[j++]={pos:C};if(k==="sh_url"){sh_setHref(A,j,B)}}if(a){var P;if(a==="sh_url"){P=N.cloneNode(false)}else{P=q.cloneNode(false)}P.className=a;A[j++]={node:P,pos:C}}}C+=p;k=a};var t=/\r\n|\r|\n/g;t.lastIndex=0;var d=B.length;while(C<d){var v=C;var l;var w;var h=t.exec(B);if(h===null){l=d;w=d}else{l=h.index;w=t.lastIndex}var g=B.substring(v,l);var M=[];for(;;){var I=C-v;var D;var y=n.length;if(y===0){D=0}else{D=n[y-1][2]}var O=o[D];var z=O.length;var m=M[D];if(!m){m=M[D]=[]}var E=null;var u=-1;for(var K=0;K<z;K++){var f;if(K<m.length&&(m[K]===null||I<=m[K].index)){f=m[K]}else{var c=O[K][0];c.lastIndex=I;f=c.exec(g);m[K]=f}if(f!==null&&(E===null||f.index<E.index)){E=f;u=K;if(f.index===I){break}}}if(E===null){x(g.substring(I),null);break}else{if(E.index>I){x(g.substring(I,E.index),null)}var e=O[u];var J=e[1];var b;if(J instanceof Array){for(var L=0;L<J.length;L++){b=E[L+1];x(b,J[L])}}else{b=E[0];x(b,J)}switch(e[2]){case -1:break;case -2:n.pop();break;case -3:n.length=0;break;default:n.push(e);break}}}if(k){A[j++]={pos:C};if(k==="sh_url"){sh_setHref(A,j,B)}k=null}C=w}return A}function sh_getClasses(d){var a=[];var b=d.className;if(b&&b.length>0){var e=b.split(" ");for(var c=0;c<e.length;c++){if(e[c].length>0){a.push(e[c])}}}return a}function sh_addClass(c,a){var d=sh_getClasses(c);for(var b=0;b<d.length;b++){if(a.toLowerCase()===d[b].toLowerCase()){return}}d.push(a);c.className=d.join(" ")}function sh_extractTagsFromNodeList(c,a){var f=c.length;for(var d=0;d<f;d++){var e=c.item(d);switch(e.nodeType){case 1:if(e.nodeName.toLowerCase()==="br"){var b;if(/MSIE/.test(navigator.userAgent)){b="\r"}else{b="\n"}a.text.push(b);a.pos++}else{a.tags.push({node:e.cloneNode(false),pos:a.pos});sh_extractTagsFromNodeList(e.childNodes,a);a.tags.push({pos:a.pos})}break;case 3:case 4:a.text.push(e.data);a.pos+=e.length;break}}}function sh_extractTags(c,b){var a={};a.text=[];a.tags=b;a.pos=0;sh_extractTagsFromNodeList(c.childNodes,a);return a.text.join("")}function sh_mergeTags(d,f){var a=d.length;if(a===0){return f}var c=f.length;if(c===0){return d}var i=[];var e=0;var b=0;while(e<a&&b<c){var h=d[e];var g=f[b];if(h.pos<=g.pos){i.push(h);e++}else{i.push(g);if(f[b+1].pos<=h.pos){b++;i.push(f[b]);b++}else{i.push({pos:h.pos});f[b]={node:g.node.cloneNode(false),pos:h.pos}}}}while(e<a){i.push(d[e]);e++}while(b<c){i.push(f[b]);b++}return i}function sh_insertTags(k,h){var g=document;var l=document.createDocumentFragment();var e=0;var d=k.length;var b=0;var j=h.length;var c=l;while(b<j||e<d){var i;var a;if(e<d){i=k[e];a=i.pos}else{a=j}if(a<=b){if(i.node){var f=i.node;c.appendChild(f);c=f}else{c=c.parentNode}e++}else{c.appendChild(g.createTextNode(h.substring(b,a)));b=a}}return l}function sh_highlightElement(d,g){sh_addClass(d,"sh_sourceCode");var c=[];var e=sh_extractTags(d,c);var f=sh_highlightString(e,g);var b=sh_mergeTags(c,f);var a=sh_insertTags(b,e);while(d.hasChildNodes()){d.removeChild(d.firstChild)}d.appendChild(a)}function sh_getXMLHttpRequest(){if(window.ActiveXObject){return new ActiveXObject("Msxml2.XMLHTTP")}else{if(window.XMLHttpRequest){return new XMLHttpRequest()}}throw"No XMLHttpRequest implementation available"}function sh_load(language,element,prefix,suffix){if(language in sh_requests){sh_requests[language].push(element);return}sh_requests[language]=[element];var request=sh_getXMLHttpRequest();var url=prefix+"sh_"+language+suffix;request.open("GET",url,true);request.onreadystatechange=function(){if(request.readyState===4){try{if(!request.status||request.status===200){eval(request.responseText);var elements=sh_requests[language];for(var i=0;i<elements.length;i++){sh_highlightElement(elements[i],sh_languages[language])}}else{throw"HTTP error: status "+request.status}}finally{request=null}}};request.send(null)}function sh_highlightDocument(g,k){var b=document.getElementsByTagName("pre");for(var e=0;e<b.length;e++){var f=b.item(e);var a=sh_getClasses(f);for(var c=0;c<a.length;c++){var h=a[c].toLowerCase();if(h==="sh_sourcecode"){continue}if(h.substr(0,3)==="sh_"){var d=h.substring(3);if(d in sh_languages){sh_highlightElement(f,sh_languages[d])}else{if(typeof(g)==="string"&&typeof(k)==="string"){sh_load(d,f,g,k)}else{throw'Found <pre> element with class="'+h+'", but no such language exists'}}break}}}};
// }}} syntax highlighter

// {{{ sh css
if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['css'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /(?:\.|#)[A-Za-z0-9_]+/g,
      'sh_selector',
      -1
    ],
    [
      /\{/g,
      'sh_cbracket',
      10,
      1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\}/g,
      'sh_cbracket',
      -2
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /[A-Za-z0-9_-]+[ \t]*:/g,
      'sh_property',
      -1
    ],
    [
      /[.%A-Za-z0-9_-]+/g,
      'sh_value',
      -1
    ],
    [
      /#(?:[A-Za-z0-9_]+)/g,
      'sh_string',
      -1
    ]
  ]
];

// }}} sh css

// {{{ js min
if(!this.sh_languages){this.sh_languages={}}sh_languages.javascript=[[[/\/\/\//g,"sh_comment",1],[/\/\//g,"sh_comment",7],[/\/\*\*/g,"sh_comment",8],[/\/\*/g,"sh_comment",9],[/\b(?:abstract|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|final|finally|for|function|goto|if|implements|in|instanceof|interface|native|new|null|private|protected|prototype|public|return|static|super|switch|synchronized|throw|throws|this|transient|true|try|typeof|var|volatile|while|with)\b/g,"sh_keyword",-1],[/(\+\+|--|\)|\])(\s*)(\/=?(?![*\/]))/g,["sh_symbol","sh_normal","sh_symbol"],-1],[/(0x[A-Fa-f0-9]+|(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?)(\s*)(\/(?![*\/]))/g,["sh_number","sh_normal","sh_symbol"],-1],[/([A-Za-z$_][A-Za-z0-9$_]*\s*)(\/=?(?![*\/]))/g,["sh_normal","sh_symbol"],-1],[/\/(?:\\.|[^*\\\/])(?:\\.|[^\\\/])*\/[gim]*/g,"sh_regexp",-1],[/\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,"sh_number",-1],[/"/g,"sh_string",10],[/'/g,"sh_string",11],[/~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,"sh_symbol",-1],[/\{|\}/g,"sh_cbracket",-1],[/\b(?:Math|Infinity|NaN|undefined|arguments)\b/g,"sh_predef_var",-1],[/\b(?:Array|Boolean|Date|Error|EvalError|Function|Number|Object|RangeError|ReferenceError|RegExp|String|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt)\b/g,"sh_predef_func",-1],[/(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,"sh_function",-1]],[[/$/g,null,-2],[/(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,"sh_url",-1],[/<\?xml/g,"sh_preproc",2,1],[/<!DOCTYPE/g,"sh_preproc",4,1],[/<!--/g,"sh_comment",5],[/<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,"sh_keyword",-1],[/<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,"sh_keyword",6,1],[/&(?:[A-Za-z0-9]+);/g,"sh_preproc",-1],[/<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,"sh_keyword",-1],[/<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,"sh_keyword",6,1],[/@[A-Za-z]+/g,"sh_type",-1],[/(?:TODO|FIXME|BUG)(?:[:]?)/g,"sh_todo",-1]],[[/\?>/g,"sh_preproc",-2],[/([^=" \t>]+)([ \t]*)(=?)/g,["sh_type","sh_normal","sh_symbol"],-1],[/"/g,"sh_string",3]],[[/\\(?:\\|")/g,null,-1],[/"/g,"sh_string",-2]],[[/>/g,"sh_preproc",-2],[/([^=" \t>]+)([ \t]*)(=?)/g,["sh_type","sh_normal","sh_symbol"],-1],[/"/g,"sh_string",3]],[[/-->/g,"sh_comment",-2],[/<!--/g,"sh_comment",5]],[[/(?:\/)?>/g,"sh_keyword",-2],[/([^=" \t>]+)([ \t]*)(=?)/g,["sh_type","sh_normal","sh_symbol"],-1],[/"/g,"sh_string",3]],[[/$/g,null,-2]],[[/\*\//g,"sh_comment",-2],[/(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,"sh_url",-1],[/<\?xml/g,"sh_preproc",2,1],[/<!DOCTYPE/g,"sh_preproc",4,1],[/<!--/g,"sh_comment",5],[/<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,"sh_keyword",-1],[/<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,"sh_keyword",6,1],[/&(?:[A-Za-z0-9]+);/g,"sh_preproc",-1],[/<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,"sh_keyword",-1],[/<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,"sh_keyword",6,1],[/@[A-Za-z]+/g,"sh_type",-1],[/(?:TODO|FIXME|BUG)(?:[:]?)/g,"sh_todo",-1]],[[/\*\//g,"sh_comment",-2],[/(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,"sh_url",-1],[/(?:TODO|FIXME|BUG)(?:[:]?)/g,"sh_todo",-1]],[[/"/g,"sh_string",-2],[/\\./g,"sh_specialchar",-1]],[[/'/g,"sh_string",-2],[/\\./g,"sh_specialchar",-1]]];
// }}} js min





