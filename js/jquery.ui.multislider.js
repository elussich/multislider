;(function ( $, window, document, undefined ) {

    $.widget( "elussich.multislider" , {
		
		// private properties
		container: null,
		containerWidth: null,
		divisions: [],
		handlers: [],
		isDragging: false,
		CONTAINER_CLASS: 'multiSliderContainer',
		DIVISION_CLASS: 'multiSliderDivision',
		HANDLER_CLASS: 'multiSliderHandler',
		HANDLER_INDEX_DATA: 'index',
		events: {
			onCreate: 'created',
			onHandlerDown: 'handlerDown',
			onHandlerMove: 'handlerMove',
			onHandlerStop: 'handlerStop',
			onHandlerUp: 'handlerUp',
			onHandlerOver: 'handlerOver',
			onHandlerOut: 'handlerOut',
			onChange: 'changed'
		},

        // options to be used as defaults
        options: {
			percents: 3, // pass a qty of divisions, or an array of numbers (which they must sum 100)
			names: [], // pass an array of names (strings) to be written inside each division
			styles: [{}], // pass an array of style objects, like the ones used in the .css jQuery method: [{'color': 'white'}, {'font-size':'14px'}] to be used in each division
			overClass: 'handlerOver',
			//onCreate: function() {}, // callback for component created event (receive one param: container object)
			onDown: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
			onMove: function() {}, // callback for mousedown event on handler (receive three params: handler object, its index and percents)
			onStop: function() {}, // callback for mousedown event on handler (receive three params: handler object, its index and percents)
			onUp: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
			onOver: function() {}, // callback for mousedown event on handler (receive two params: handler object and its index)
			onOut: function() {} // callback for mousedown event on handler (receive two params: handler object and its index)

			// TODO: 'disable' param to block handlers
        },

        //Setup widget (eg. element creation, apply theming
        // , bind events etc.)
        _create: function () {
	
			var self = this;
	
			// empty element, just in case
			this.element.empty();

			// create container with position relative, width 100%, and append it to obj
			this.container = $('<div/>', {
				'class': this.CONTAINER_CLASS
			}).css({
				'position': 'relative'
			}).appendTo(this.element);
			
			// update total width
			this.container.width(this.element.width());
			
			// avoid text selection
			this._deSelect();
			
			// parse percents into desired data
			this._parsePercents();
							
			// set necessary divisions
			this._setDivisions();

			// TODO: set default name if there are not so many names as divisions
			this._setNames();
			this._setStyles();

			// set handlers
			this._setHandlers();

			// callback for create event (eventName, event Object, uiObject)
			this._trigger(this.events.onCreate, event, {
				container: self.container,
				percents: self.options.percents
			});

        },

		/**
		 * Avoid text selection within the component
		 *
		 * @method
		 */
		_deSelect: function() {

			// disable text selection
			// BUG: IE still selects text inside
			this.container.onselectstart = function() { return false; }; 
			this.container.unselectable = "on";
			this.container.css('user-select', 'none'); 
			this.container.css('-o-user-select', 'none'); 
			this.container.css('-moz-user-select', 'none'); 
			this.container.css('-khtml-user-select', 'none'); 
			this.container.css('-webkit-user-select', 'none');
		
		},		
		
		/**
		 * Parse the way we calculate divisions.
		 * Percents could be an array of numbers that sum 100, or an integer defining number of even divisions.
		 *
		 * @method
		 */
		_parsePercents: function() {
		
			// check if percents is a number or an array
			if (typeof this.options.percents === 'number') {
			
				// store parts
				var parts = this.options.percents;
				// calculate floor value for each part
				var value = Math.floor(100 / this.options.percents);
				// avoid inconsistencies with decimals
				var realSum = 0;
				// convert percents into an array with even divisions
				this.options.percents = [];
				for (var i = 0; i < parts; i++) {
					this.options.percents.push(value);
					realSum += value;
				}
				// calculate diff and add it to the first one
				this.options.percents[0] = this.options.percents[0] + (100 - realSum);
		
			// check if percents is an array of valid numbers
			} else if (typeof this.options.percents === 'object') {
		
				// check if percents sum 100
				var sum = 0;
				for (var j = 0; j < this.options.percents.length; j++) {
					sum += this.options.percents[j];
				}
				if (sum != 100) {
					$.error( 'Percentages are inconsistent' );
				}
				
			}			
		
		},
		
		/**
		 * Create divisions inside the component
		 *
		 * @method
		 */
		_setDivisions: function() {
		
			// remove previous divisions
			$.each(this.divisions, function(i, e){
				$(e).remove();
			});
			this.divisions = [];
		
			// left margin applied to last division
			var lastMargin = 0;
		
			// loop thru percents
			for (var i = 0; i < this.options.percents.length; i++) {
			
				// add divisions
				var division = $('<div/>', {
					'class': this.DIVISION_CLASS
				})
				// and also a span inside them... just to have somewhere to write on...
				.append( $('<span/>') )
				.appendTo(this.container);
			
				// calculate width of the division by its respective percent against the total width of the component
				var newWidth = Math.round( ( this.container.innerWidth() * this.options.percents[i] ) / 100  );
				// update each division with new width, and inherit height
				division.css({
					'width': newWidth + 'px',
					'height': 'inherit'
				});
			
				// set css for all divisions
				if (i < (this.options.percents.length - 1)) {				
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
				this.divisions.push(division);
			
			}

		},
	
		/**
		 * Create handlers to be dragged
		 *
		 * @method
		 */
		_setHandlers: function() {

			// remove any existing handlers first...
			$.each(this.handlers, function(i, e){
				$(e).remove();
			});
			this.handlers = [];

			// add handlers (one less than divisions present)
			for (var h = 1; h < this.options.percents.length; h++) {

				// create handlers with position absolute and append them to container
				var handler = $('<div/>', {
					'class': this.HANDLER_CLASS
				})
				.css('position', 'absolute')
				.prependTo(this.container);

				// calculate horizontal position for each handler by summing all widths of previous divisions
				var handlerPosition = 0;
				for (var i = 0; i < h; i++) {
					handlerPosition += $(this.divisions)[i].width();
				}
			
				// set its position and save its index into a $.data object
				handler.css('left', handlerPosition + 'px').data(this.HANDLER_INDEX_DATA, parseInt(h - 1));
			
				// assign behavior
				this._setHandlerBehavior(handler);
			
				// store it
				this.handlers.push(handler);

			}

		},
			
		/**
		 * Set behavior for each of the handlers created.
		 * Controls click, move and over/out events.
		 *
		 * @method
		 */
		_setHandlerBehavior: function(handler) {
			
			// store reference to widget
			var self = this;

			// store handler index
			var handlerIndex = handler.data(this.HANDLER_INDEX_DATA);
		
			// start drag
			handler.off('mousedown').on('mousedown', function(event) {

				// switch
				self.isDragging = true;

				// store the position where we mousedown
				var downX = event.pageX - handler.offset().left;

				// store initial widths for involved divisions
				var prevInitialWidth = $(self.divisions)[handlerIndex].width();
				var nextInitialWidth = $(self.divisions)[handlerIndex + 1].width();

				// get local value for the handler at the moment of clicking
				var currentX = handler.position().left;

				// set limits for dragging by checking left and right divisions widths
				var leftLimit = currentX - prevInitialWidth + handler.outerWidth();
				var rightLimit = currentX + nextInitialWidth - handler.outerWidth(); // sustract whole width of the handler on this one
			
				// callback for handler down event (eventName, eventObject, uiObject)
				self._trigger(self.events.onHandlerDown, event, {
					handler: handler,
					handlerIndex: handlerIndex
				});

				// bind movement
				self.container.off('mousemove').on('mousemove', function(event) {

					if (self.isDragging) {

						// get local value for horizontal position (mouse position - container offset - mousedown position)
						var moveX = event.pageX - self.container[0].offsetLeft - downX;

						// limit movement
						if ( moveX < rightLimit && moveX > leftLimit ) {

							// move handler along
							handler.css('left', moveX + 'px');

							// calculate summed widths of divisions that come before
							var offsetX = 0;
							for (var i = 0; i < handlerIndex; i++) {
								offsetX += $(self.divisions)[i].width();
							}

							// calculate difference between initial state and current movement
							var diff = parseInt(prevInitialWidth - moveX + offsetX );								
						
							// resize divisions accordingly								
							$(self.divisions)[handlerIndex].css('width', parseInt(moveX - offsetX) + 'px');							
							// check if next handler is NOT the LAST handler
							if (handlerIndex < (self.options.percents.length - 2)) {
								$(self.divisions)[handlerIndex + 1].css('width', parseInt(nextInitialWidth +  diff) + 'px');
							// else, define left margin for last division
							} else {
								$(self.divisions)[handlerIndex + 1].css('margin-left', moveX + 'px');
							}
						
							// calculate new percents
							self._setPercents();
							
							// callback for handler move event (eventName, eventObject, uiObject)
							self._trigger(self.events.onHandlerMove, event, {
								handler: handler,
								handlerIndex: handlerIndex,
								percents: self.options.percents
							});

						// stop movement
						} else {				

							// switch
							self.isDragging = false;

							// set new percentages
							self._setPercents();
							
							// callback for handler stop event (eventName, eventObject, uiObject)
							self._trigger(self.events.onHandlerStop, event, {
								handler: handler,
								handlerIndex: handlerIndex,
								percents: self.options.percents
							});

						}

					}

				});

				// listen for mouse up on whole document, and stop moving
				$(document).off('mouseup').on('mouseup', function(event) {

					// switch
					self.isDragging = false;
				
					// unbind movement
					self.container.unbind('mousemove');

					// set new percentages
					self._setPercents();
					
					// callback for handler up event (eventName, eventObject, uiObject)
					self._trigger(self.events.onHandlerUp, event, {
						handler: handler,
						handlerIndex: handlerIndex,
						percents: self.options.percents
					});

				});
			
			});

			// on over
			handler.off('mouseenter').on('mouseenter', function() {

				// add class
				handler.addClass(self.options.overClass);
				
				// callback for handler over event (eventName, eventObject, uiObject)
				self._trigger(self.events.onHandlerOver, event, {
					handler: handler
				});

			});				

			// on out
			handler.off('mouseleave').on('mouseleave', function() {

				// remove class
				handler.removeClass(self.options.overClass);				
				
				// callback for handler out event (eventName, eventObject, uiObject)
				self._trigger(self.events.onHandlerOut, event, {
					handler: handler
				});

			});
		
		},
			
		/**
		 * Set names for each division from an array of strings
		 *
		 * @method
		 */
		_setNames: function() {
			var widget = this;
			$.each(widget.divisions, function(index, element){
				// set names to divisions
				$(element).find('span').text(widget.options.names[index]);				
			});			
		},
	
	
		/**
		 * Set styles for each division from an array of css objects
		 *
		 * @method
		 */
		_setStyles: function() {
			// wrapper
			var widget = this;
			$.each(widget.divisions, function(index, element) {
				// set styles to divisions
				if (widget.options.styles[index] == null) {
					// if there are no styles left, concatenate all styles after the last one and try again...
					widget.options.styles = widget.options.styles.concat(widget.options.styles);
					$(element).css(widget.options.styles[parseInt(widget.options.styles.length - index)]);
				} else {
					$(element).css(widget.options.styles[index]);
				}
			});			
		},
	
		/**
		 * Set percents from each division
		 *
		 * @method
		 */
		_setPercents: function() {

			// main array
			var percents = [];
			// temp sum
			var tempSum = 0;

			// get all divisions BUT the last one (it will be calculated afterwards to fit 100%, and avoid inconsistencies...)
			for (var i = 0; i < (this.divisions.length - 1); i++) {

				// take each width and calculate its percent
				var w = $(this.divisions)[i].width();
				percents.push( Math.round( (w*100) / this.container.width() ) );
				// sum up all percents temporarily
				tempSum += percents[i];

			}
			// last percent is calculated from difference between 100 and temp sum
			percents[this.divisions.length - 1] = 100 - tempSum;

			// prevent extremes from being 0...
			if (percents[this.divisions.length - 1] <= 0) {
				percents[this.divisions.length - 1] = 1;
				percents[this.divisions.length - 2] = parseInt(percents[this.divisions.length - 2]) - 1;
			}
			if (percents[0] <= 0) {
				percents[0] = 1;
				percents[1] = percents[1] - 1;
			}
			// update final value
			this.options.percents = percents;			
		
		},


        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        destroy: function () {

            this.element.empty();
            // For UI 1.8, destroy must be invoked from the base widget
            $.Widget.prototype.destroy.call(this);
        },

		/**
		 * Returns an array with the current percents for the component.
		 *
		 * @method
		 * @return {Array}  current percents 
		 */	
		getPercents: function() {

				// get percents from data object
				return this.options.percents;

		},
	
		/**
		 * Change the divisions of an initialized plugin by providing a new set of percents.
		 * 
		 * @method
		 * @param newPercents  new array of percents to be parsed
		 * @param onChange  callback function to be executed when change process has ended 
		 */
		change: function(newPercents) {	

			// update percents
			this.options.percents = newPercents;
			
			// parse new percents
			this._parsePercents();

			// update divisions
			this._setDivisions();
			
			// update names & colors
			this._setNames();
			this._setStyles();

			// update handlers
			this._setHandlers();
			
			// callback for change percents event (eventName, eventObject, uiObject)
			this._trigger(this.events.onChange, event, {
				container: this.container,
				percents: this.options.percents
			});
			
		}

        // Respond to any changes the user makes to the
        // option method
        /*_setOption: function ( key, value ) {
            switch (key) {
            case "someValue":
                //this.options.someValue = doSomethingWith( value );
                break;
            default:
                //this.options[ key ] = value;
                break;
            }
            $.Widget.prototype._setOption.apply( this, arguments );
        }*/

    });

})( jQuery, window, document );