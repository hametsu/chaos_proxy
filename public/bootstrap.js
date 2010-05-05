$(function() {
  Chaos.bootstrap();
});

/**
 * Bootstrap of this Application
 */
Chaos.bootstrap = function() {

  initMessageArea(initScreen);

  function initScreen() {
    context.enableCSSAnimation = $.browser.safari;
    context.screenHeight = $(window).height();
    context.screenWidth = $(window).width();
    $('#initialMask').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#dummy').css({
      'height' : context.screenHeight
    });
    $('#background').css({
      'height' : context.screenHeight + 50,
      'width' :  context.screenWidth + 50,
      'background' : 'url(./back.jpg) 50% 50% #FFF repeat'
    });
    $('#contentArea').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#aboutUsArea').css({
      'top' : '180px',
      'right' : '-186px'
    });
    $('#aboutChaosProxyArea').css({
      'top' : '225px',
      'right' : '-186px'
    });
    $('div.slideMenu').fadeTo(0, 0.8).show().hover(function() {
      $(this).animate({
        'right' : '-1px',
        'opacity' : 1
      }, 'normal');
    }, function() {
      $(this).animate({
        'right' : '-186px',
        'opacity' : 0.8
      }, 'normal');
    });

    // Wait for background image load
    setTimeout(function() {
      $('#initialMask').fadeTo('slow', 0.01, function() {
        if ($.browser.msie) {
          onFailure();
        } else {
          onSuccess();
        }
      });
    }, 1000);
  }

  function onSuccess() {
    Chaos.effect.pourText($('#message2'), MESSAGES.INIT_SCREEN_FINISH, function() {
      clearMessageArea();
      flashBackimage();
      animateBackground();
      Chaos.setupImageLoader();
    });
  }

  function onFailure() {
    Chaos.effect.pourText($('#message2'), MESSAGES.ERROR, function() {
      Chaos.effect.pourText($('#message3'), MESSAGES.DETECTED_IE, lng.emptyFn);
    });
  }

  function animateBackground() {
    if (context.enableCSSAnimation) {
      $('#background').addClass('moveBackGround');
    }
  }

  function flashBackimage() {
    var mask = $('#initialMask');
    setInterval(function() {
      mask.fadeTo('normal', 0.4, function() {
        mask.fadeTo('slow', 0.01);
      });
    }, SETTINGS.FLASH_EFFECT_INTERVAL);
  }

  function initMessageArea(callback) {
    $('#messageArea').fadeTo('normal', 0.6, function() {
      Chaos.effect.pourText($('#message1'), MESSAGES.INIT_SCREEN, callback);
    }).show();
  }

  function clearMessageArea() {
    $('#messageArea').fadeOut(1000);
  }
}

