;(function($) {
    'use strict';

    var tourIsVisible = false;
    var tourHasStarted = false;
    var $tour = $('#ui-tour').detach();
    var $modal = $('#ui-tour-mask').detach().show();
    var highlightTimer;

    var Tour = {

        init: function () {
            var $doc = $(document);
            $('body').append($modal).append($tour).addClass('noscroll');

            $('.tour-highlight').on('tour-step', function () {
                Mozilla.UITour.showHighlight(this.dataset.target);
            });

            $('.tour-info').on('tour-step', function () {
                Mozilla.UITour.showInfo(this.dataset.target, this.dataset.title, this.dataset.text);
            });

            $('.tour-menu').on('tour-step', function () {
                Mozilla.UITour.showMenu(this.dataset.target);
            });

            // temporary click handler to start the tour until we get a button in the door hanger
            $modal.one('click', Tour.startTour);

            $doc.on('transitionend', '.ui-tour-list li.current', Tour.onTourStep);
            $doc.on('visibilitychange', Tour.handleVisibilityChange);
            $('.tour-init').trigger('tour-step');
            $('button.step').on('click', Tour.goToNextTourStep);
        },

        updateControls: function () {
            var $current = $('.ui-tour-list li.current');
            var step = $('.ui-tour-list li.current').data('step');
            var $closeButton = $('button.close');

            if ($current.hasClass('last')) {
                $closeButton.off().one('click', Tour.closeTour);
                $closeButton.addClass('done').text(window.trans('done'));
            } else {
                $closeButton.off().one('click', Tour.compactTour);
                $closeButton.removeClass('done').text(window.trans('close'));
            }

            if ($current.hasClass('first')) {
                $('button.prev').attr('disabled', 'disabled');
            } else if ($current.hasClass('last')) {
                $('button.next').attr('disabled', 'disabled');
            } else {
                $('button.step').removeAttr('disabled');
            }
        },

        rotateHighLights: function () {
            var targets = ['bookmarks', 'appMenu', 'selectedTabStart'];
            var i = 0;
            Mozilla.UITour.showHighlight('selectedTabStart');
            highlightTimer = setInterval(function () {
                Mozilla.UITour.showHighlight(targets[i]);
                i = (targets.length === i) ? 0 : i + 1;
            }, 1000);
        },

        onTourStep: function (e) {
            if (e.originalEvent.propertyName === 'transform') {
                var $current = $('.ui-tour-list li.current');
                var step = $current.data('step');
                Mozilla.UITour.hideInfo();
                Mozilla.UITour.hideHighlight();
                $current.find('.step-target').delay(100).trigger('tour-step');
                $('.progress-step .step').text(step);
                $('.progress-step .progress').attr('aria-valuenow', step);

                // hide menu panel when not needed as it's now sticky.
                if (!$current.hasClass('app-menu')) {
                    Mozilla.UITour.hideMenu('appMenu');
                }
                // if we're on the last step, rotate the menu highlights
                if ($current.hasClass('last')) {
                    Tour.rotateHighLights();
                } else {
                    clearInterval(highlightTimer);
                }
            }
        },

        goToNextTourStep: function (e) {
            e.preventDefault();
            if ($(this).hasClass('up')) {
                return;
            }
            var step = $(this).hasClass('prev') ? 'prev' : 'next';
            var $current = $('.ui-tour-list li.current');
            if (step === 'prev') {
                $current.removeClass('current next-out').addClass('prev-out');
                $current.prev().addClass('current');
            } else if (step === 'next') {
                $current.removeClass('current prev-out').addClass('next-out');
                $current.next().addClass('current');
            }
            Tour.updateControls();
        },

        goToStep: function (step) {
            $('.ui-tour-list .tour-step.current').removeClass('current');
            $('.ui-tour-list .tour-step[data-step="' + step + '"]').addClass('current');
            $('.ui-tour-list .tour-step:gt(' + step + ')').addClass('prev-out');
            $('.ui-tour-list .tour-step:lt(' + step + ')').addClass('next-out');
            Tour.updateControls();
        },

        closeTour: function () {
            clearInterval(highlightTimer);
            Mozilla.UITour.hideHighlight();
            $tour.removeClass('in');
            $modal.fadeOut(function () {
                $('body').removeClass('noscroll');
                tourIsVisible = false;
                $(document).off('.ui-tour').focus();
            });
        },

        compactTour: function () {
            var title = $('.ui-tour-list .tour-step.current h2').text();
            tourIsVisible = false;
            Mozilla.UITour.hideHighlight();
            Mozilla.UITour.hideMenu('appMenu');
            $tour.removeClass('in').addClass('compact');
            $tour.attr('aria-expanded', false);
            $('.ui-tour-list').fadeOut('fast');
            $('.progress-step').fadeOut('fast');
            $('.ui-tour-controls .prev').fadeOut();
            $('.ui-tour-controls .close').fadeOut();
            $('.ui-tour-controls .next').addClass('up').text(window.trans('open')).focus();
            $('button.up').one('click', Tour.expandTour);
            $modal.fadeOut('slow', function () {
                $('body').removeClass('noscroll');
                $('.compact-title').html('<h2>' + title + '</h2>').fadeIn();
                $('.progress-step').addClass('compact').fadeIn();
            });
        },

        expandTour: function () {
            tourIsVisible = true;
            $tour.removeClass('compact').addClass('in').focus();
            $tour.attr('aria-expanded', true);
            $('.compact-title').fadeOut('fast');
            $('.progress-step').fadeOut('fast');
            $('.ui-tour-controls .prev').fadeIn();
            $('.ui-tour-controls .close').fadeIn();
            $('.ui-tour-controls .up').removeClass('up').text(window.trans('next'));
            $('button.close').one('click', Tour.compactTour).focus();
            $modal.fadeIn('slow', function () {
                $('body').addClass('noscroll');
                $('.ui-tour-list li.current .step-target').trigger('tour-step');
                $('.ui-tour-list').fadeIn();
                $('.progress-step').removeClass('compact').fadeIn();
            });
        },

        startTour: function () {
            tourIsVisible = true;

            $('button.close').one('click', Tour.compactTour);

            $('button.step').removeAttr('disabled');
            Tour.updateControls();

            $modal.fadeIn('fast', function () {
                $tour.addClass('in').focus();
                $tour.attr('aria-expanded', true);
                tourIsVisible = true;
                tourHasStarted = true;
            });

            $('.mask-inner').addClass('out');

            Mozilla.UITour.hideInfo();
            $('.ui-tour-list li.current .step-target').trigger('tour-step');

            // close with escape key
            $(document).on('keyup.ui-tour', function(e) {
              if (e.keyCode === 27 && tourIsVisible) {
                Tour.compactTour();
              }
            });

            // prevent focusing out of modal while open
            $(document).on('focus.ui-tour', 'body', function(e) {
              // .contains must be called on the underlying HTML element, not the jQuery object
              if (tourIsVisible && !$tour[0].contains(e.target)) {
                e.stopPropagation();
                $tour.focus();
              }
            });
        },

        handleVisibilityChange: function () {
            var $current = $('.ui-tour-list li.current');
            var step = $current.data('step');

            if (document.hidden) {
                clearInterval(highlightTimer);
                Mozilla.UITour.hideHighlight();
                Mozilla.UITour.hideInfo();
                Mozilla.UITour.hideMenu('appMenu');
            } else {
                if (tourIsVisible) {
                    $current.find('.step-target').delay(100).trigger('tour-step');
                    $('.progress-step .step').text(step);
                    $('.progress-step .progress').attr('aria-valuenow', step);
                    if ($current.hasClass('last')) {
                        Tour.rotateHighLights();
                    }
                } else if (!tourHasStarted) {
                    $('.tour-init').trigger('tour-step');
                }
            }
        }
    };

    // TODO - also check version number for Australis release
    if (isFirefox() && !isMobile()) {
        Tour.init();
    }

})(window.jQuery);