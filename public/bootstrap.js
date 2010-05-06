$(function() {
  Chaos.bootstrap();
});

/**
 * Bootstrap of this Application
 */
Chaos.bootstrap = function() {

  var messageBox = $('#bootMessageArea');

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
    msgs = [];
    if ($.browser.mozilla) {
      msgs.push(MESSAGES.DETECTED_FIREFOX);
      msgs.push(MESSAGES.ANIMATION_OFF);
    } 
    msgs.push(MESSAGES.INIT_SCREEN_FINISH);

    Chaos.effect.pourMessages(messageBox, msgs, function() {
      clearMessageArea();
      flashBackimage();
      animateBackground();
      Chaos.setupImageLoader();
    });
  }

  function onFailure() {
    Chaos.effect.pourMessages(messageBox, [MESSAGES.ERROR, MESSAGES.DETECTED_IE]);
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
    messageBox.fadeTo('normal', 0.6, function() {
      Chaos.effect.pourText(messageBox, MESSAGES.INIT_SCREEN, callback);
    }).show();
  }

  function clearMessageArea() {
    messageBox.fadeOut(1000);
  }
}
