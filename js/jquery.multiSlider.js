(function($){
	
	var MultiSlider = (function(){
		
		/**
		 * Collection of private properties and methods.
		 *
		 * @private
		 */
		var defaults,
			obj,
			container,
			containerWidth,
			divisions = [];
			handlers = [],
			isDragging = false,
			CONTAINER_CLASS = 'multiSliderContainer',
			DIVISION_CLASS = 'multiSliderDivision',
			HANDLER_CLASS = 'multiSliderHandler',
			HANDLER_INDEX_DATA = 'index';
			
		/**
		 * Avoid text selection within the component
		 *
		 * @method
		 */
		function deSelect() {

			// disable text selection
			// BUG: IE still selects text inside
			container.onselectstart = function() { return false; }; 
			container.unselectable = "on";
			container.css('user-select', 'none'); 
			container.css('-o-user-select', 'none'); 
			container.css('-moz-user-select', 'none'); 
			container.css('-khtml-user-select', 'none'); 
			container.css('-webkit-user-select', 'none');
			
		}		
			
		/**
		 * Parse the way we calculate divisions.
		 * Percents could be an array of numbers that sum 100, or an integer defining number of even divisions.
		 *
		 * @method
		 */
		function parsePercents() {
			
			// check if percents is a number or an array
			if (typeof defaults.percents === 'number') {
				
				// store parts
				var parts = defaults.percents;
				// calculate floor value for each part
				var value = Math.floor(100 / defaults.percents);
				// avoid inconsistencies with decimals
				var realSum = 0;
				// convert percents into an array with even divisions
				defaults.percents = [];
				for (var i = 0; i < parts; i++) {
					defaults.percents.push(value);
					realSum += value;
				}
				// calculate diff and add it to the first one
				defaults.percents[0] = defaults.percents[0] + (100 - realSum);
			
			// check if percents is an array of valid numbers
			} else if (typeof defaults.percents === 'object') {
			
				// check if percents sum 100
				var sum = 0;
				for (var j = 0; j < defaults.percents.length; j++) {
					sum += defaults.percents[j];
				}
				if (sum != 100) {
					$.error( 'Percentages are inconsistent' );
				}
					
			}			
			
		}
			
		/**
		 * Create divisions inside the component
		 *
		 * @method
		 */
		function setDivisions() {
			
			// remove previous divisions
			$.each(divisions, function(i, e){
				$(e).remove();
			});
			divisions = [];
			
			// left margin applied to last division
			var lastMargin = 0;
			
			// loop thru percents
			for (var i = 0; i < defaults.percents.length; i++) {
				
				// add divisions
				var division = $('<div/>', {
					'class': DIVISION_CLASS
				})
				// and also a span inside them... just to have somewhere to write on...
				.append( $('<span/>') )
				.appendTo(container);
				
				// calculate width of the division by its respective percent against the total width of the component
				var newWidth = Math.round( ( container.innerWidth() * defaults.percents[i] ) / 100  );
				// update each division with new width, and inherit height
				division.css({
					'width': newWidth + 'px',
					'height': 'inherit'
				});
				
				// set css for all divisions
				if (i < (defaults.percents.length - 1)) {				
					division.css({
						'float': 'left',
						'height': 'inherit'
					})
					// update last margin
					lastMargin += newWidth;
				// but beware! last division has width auto, no float and left margin
				// calculated from the sum of all previous divisions
				} else {
					division.css({
						'float': 'none',
						'width': 'auto',
						'margin-left': lastMargin + 'px'
					})
				}
					
				// store division
				divisions.push(division);
				
			}

		}
		
		/**
		 * Create handlers to be dragged
		 *
		 * @method
		 */
		function setHandlers() {

			// remove any existing handlers first...
			$.each(handlers, function(i, e){
				$(e).remove();
			});
			handlers = [];

			// add handlers (one less than divisions present)
			for (var h = 1; h < defaults.percents.length; h++) {

				// create handlers with position absolute and append them to container
				var handler = $('<div/>', {
					'class': HANDLER_CLASS
				})
				.css('position', 'absolute')
				.prependTo(container);

				// calculate horizontal position for each handler by summing all widths of previous divisions
				var handlerPosition = 0;
				for (var i = 0; i < h; i++) {
					handlerPosition += $(divisions)[i].width();
				}
				
				// set its position and save its index into a $.data object
				handler.css('left', handlerPosition + 'px').data(HANDLER_INDEX_DATA, parseInt(h - 1));
				
				// assign behavior
				setHandlerBehavior(handler);
				
				// store it
				handlers.push(handler);

			}

		}
				
		/**
		 * Set behavior for each of the handlers created.
		 * Controls click, move and over/out events.
		 *
		 * @method
		 */
		function setHandlerBehavior(element) {

			// store handler and its index			
			var handler = $(element);
			var handlerIndex = handler.data(HANDLER_INDEX_DATA);
			
			// start drag
			handler.unbind('mousedown').bind('mousedown', function(event) {

				// switch
				isDragging = true;

				// store the position where we mousedown
				var downX = event.pageX - handler.offset().left;

				// store initial widths for involved divisions
				var prevInitialWidth = $(divisions)[handlerIndex].width();
				var nextInitialWidth = $(divisions)[handlerIndex + 1].width();

				// get local value for the handler at the moment of clicking
				var currentX = handler.position().left;

				// set limits for dragging by checking left and right divisions widths
				var leftLimit = currentX - prevInitialWidth + handler.outerWidth();
				var rightLimit = currentX + nextInitialWidth - handler.outerWidth(); // sustract whole width of the handler on this one
				
				// callback function for mouse down on handler
				if (typeof defaults.onDown === 'function') {
					defaults.onDown(handler, handlerIndex); // send two params: handler and its index
				} else {
					$.error(defaults.onDown + ' is not a function or has not been defined.');
				}

				// bind movement
				container.unbind('mousemove').bind('mousemove', function(event) {

					if (isDragging) {

						// get local value for horizontal position (mouse position - container offset - mousedown position)
						var moveX = event.pageX - this.offsetLeft - downX;

						// limit movement
						if ( moveX < rightLimit && moveX > leftLimit ) {

							// move handler along
							handler.css('left', moveX + 'px');

							// calculate summed widths of divisions that come before
							var offsetX = 0;
							for (var i = 0; i < handlerIndex; i++) {
								offsetX += $(divisions)[i].width();
							}

							// calculate difference between initial state and current movement
							var diff = parseInt(prevInitialWidth - moveX + offsetX );								
							
							// resize divisions accordingly								
							$(divisions)[handlerIndex].css('width', parseInt(moveX - offsetX) + 'px');							
							// check if next handler is NOT the LAST handler
							if (handlerIndex < (defaults.percents.length - 2)) {
								$(divisions)[handlerIndex + 1].css('width', parseInt(nextInitialWidth +  diff) + 'px');
							// else, define left margin for last division
							} else {
								$(divisions)[handlerIndex + 1].css('margin-left', moveX + 'px');
							}
							
							// calculate new percents
							setPercents();

							// callback function for handler move
							if (typeof defaults.onMove === 'function') {
								defaults.onMove(handler, handlerIndex, defaults.percents); // send three params: handler, its index and percents
							} else {
								$.error(defaults.onMove + ' is not a function or has not been defined.');
							}

						// stop movement
						} else {				

							// switch
							isDragging = false;

							// set new percentages
							setPercents();

							// callback function for handler stop
							if (typeof defaults.onStop === 'function') {
								defaults.onStop(handler, handlerIndex, container.data('percents')); // send three params: handler, its index and percents
							} else {
								$.error(defaults.onStop + ' is not a function or has not been defined.');
							}

						}

					}

				});

				// listen for mouse up on whole document, and stop moving
				$(document).unbind('mouseup').bind('mouseup', function(event) {

					// switch
					isDragging = false;
					
					// unbind movement
					container.unbind('mousemove');

					// set new percentages
					setPercents();

					// callback function for handler up
					if (typeof defaults.onUp == 'function') {
						defaults.onUp(handler, handlerIndex, container.data('percents')); // send three params: handler, its index and percents
					} else {
						$.error(defaults.onUp + ' is not a function or has not been defined.');
					}

				});
				
			});

			// on over
			handler.unbind('mouseenter').bind('mouseenter', function() {

				// add class
				handler.addClass(defaults.overClass);

				// callback function for hovering the handler
				if (typeof defaults.onOver == 'function') {
					defaults.onOver( $(this) ); // one param: handler
				} else {
					$.error(defaults.onOver + ' is not a function or has not been defined.');
				}

			});				

			// on out
			handler.unbind('mouseleave').bind('mouseleave', function() {

				// remove class
				handler.removeClass(defaults.overClass);

				// callback function for hovering the handler
				if (typeof defaults.onOut == 'function') {
					defaults.onOut( $(this) ); // one param: handler
				} else {
					$.error(defaults.onOut + ' is not a function or has not been defined.');
				}

			});
			
		}
				
		/**
		 * Set names for each division from an array of strings
		 *
		 * @method
		 */
		function setNames() {
			$.each(divisions, function(index, element){
				// set names to divisions
				$(element).find('span').text(defaults.names[index]);				
			});			
		}
		
		
		/**
		 * Set styles for each division from an array of css objects
		 *
		 * @method
		 */
		function setStyles() {
			$.each(divisions, function(index, element) {
				// set styles to divisions
				if (defaults.styles[index] == null) {
					// if there are no styles left, concatenate all styles after the last one and try again...
					defaults.styles = defaults.styles.concat(defaults.styles);
					$(element).css(defaults.styles[parseInt(defaults.styles.length - index)]);
				} else {
					$(element).css(defaults.styles[index]);
				}
			});			
		}
		
		/**
		 * Set percents from each division
		 *
		 * @method
		 */
		function setPercents() {

			// main array
			var percents = [];
			// temp sum
			var tempSum = 0;

			// get all divisions BUT the last one (it will be calculated afterwards to fit 100%, and avoid inconsistencies...)
			for (var i = 0; i < (divisions.length - 1); i++) {

				// take each width and calculate its percent
				var w = $(divisions)[i].width();
				percents.push( Math.round( (w*100) / container.width() ) );
				// sum up all percents temporarily
				tempSum += percents[i];

			}
			// last percent is calculated from difference between 100 and temp sum
			percents[divisions.length - 1] = 100 - tempSum;

			// prevent extremes from being 0...
			if (percents[divisions.length - 1] <= 0) {
				percents[divisions.length - 1] = 1;
				percents[divisions.length - 2] = parseInt(percents[divisions.length - 2]) - 1;
			}
			if (percents[0] <= 0) {
				percents[0] = 1;
				percents[1] = percents[1] - 1;
			}
			// update final value
			defaults.percents = percents;			
			
		}
		
		/**
		 * Collection of public methods and properties
		 *
		 * @public
		 */
		return {
			
			/**
			 * Initialize plugin with needed operations
			 *
			 * @method
			 * @param options  A hash of options to override defaults.
			 */	
			init: function(options) {

				// set defaults
				defaults = {
					percents: 3, // pass a qty of divisions, or an array of numbers (which they must sum 100)
					names: [], // pass an array of names (strings) to be written inside each division
					styles: [{}], // pass an array of style objects, like the ones used in the .css jQuery method: [{'color': 'white'}, {'font-size':'14px'}] to be used in each division
					overClass: 'handlerOver',
					onInit: function() {}, // callback for component created event (receive one param: container object)
					onDown: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
					onMove: function() {}, // callback for mousedown event on handler (receive three params: handler object, its index and percents)
					onStop: function() {}, // callback for mousedown event on handler (receive three params: handler object, its index and percents)
					onUp: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
					onOver: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
					onOut: function() {} // callback for mousedown event on handler (receive two params: handler object and its index)

					// TODO: 'disable' param to block handlers

				};
				
				return this.each(function() {

					// merge options with defaults
					if (options) {
						$.extend(defaults, options);
					}

					// assign "this" (and empty it, just in case)
					obj = $(this);
					obj.empty();

					// create container with position relative, width 100%, and append it to obj
					container = $('<div/>', {
						'class': CONTAINER_CLASS
					}).css({
						'position': 'relative',
						'width': '100%'
					}).appendTo(obj);
					// update total width
					containerWidth = container.width();
					
					// avoid text selection
					deSelect();
					
					// parse percents into desired data
					parsePercents();
									
					// set necessary divisions
					setDivisions();

					// TODO: set default name if there are not so many names as divisions
					setNames();
					setStyles();

					// set handlers
					setHandlers();		

					// callback function for component finally created
					if (typeof defaults.onInit === 'function') {
						defaults.onInit( obj ); // one param: container object
					} else {
						$.error(defaults.onInit + ' is not a function or has not been defined.');
					}

				});
				
			},
		
			/**
			 * Returns an array with the current percents for the component.
			 *
			 * @method
			 * @return {Array}  current percents 
			 */	
			getPercents: function() {

				// check if exists
				if ( obj ) {

					// get percents from data object
					return defaults.percents;

				} else {
					$.error('MultiSlider has not been initialized');
				}

			},
		
			/**
			 * Change the divisions of an initialized plugin by providing a new set of percents.
			 * 
			 * @method
			 * @param newPercents  new array of percents to be parsed
			 * @param onChange  callback function to be executed when change process has ended 
			 */
			change: function(newPercents, onChange) {

				return this.each(function() {
					
					// check if exists
					if ( obj ) {

						// update percents
						defaults.percents = newPercents;
						
						// parse new percents
						parsePercents();

						// update divisions
						setDivisions();
						
						// update names & colors
						setNames();
						setStyles();

						// update handlers
						setHandlers();

						// check and execute callback function
						if (typeof onChange === 'function') {
							onChange.call(this, container, newPercents); // two arguments: container, percents
						} else {
							$.error(defaults.onChange + ' is not a function or has not been defined.');
						}

					} else {
						$.error('MultiSlider has not been initialized');
					}

				});
				
			}
			
		}
		
	});
			
	/**
	 * Extends fn object from jQuery to attach MultiSlider component to an element in the form of a plugin.
	 *
	 * @method
	 */
	$.fn.multiSlider = function(method) {
		
		// create instance of Multislider class or use the existing one
		var msInstance;
		if ($(this).data('instance')) {
			// retrieve stored instance
			msInstance = $(this).data('instance');
		} else {
			msInstance = new MultiSlider();
			// store instance in data jQuery object
			$(this).data('instance', msInstance);
		}
		
		// Method calling logic
		if ( msInstance[method] ) {
			return msInstance[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return msInstance.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.multiSlider.' );
		}
			
	}
	
})(jQuery);