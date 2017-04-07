;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
  playerContainer = document.querySelector('.userPlaylist'),
  playBtn,
  playSvg,
  playSvgPath,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  wheelVolumeValue = 0,
  volumeLength,
  repeating = false,
  seeking = false,
  seekingVol = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plUl,
  plLi,
  tplList =
            '<li class="pl-list" data-track="{count}">'+
              '<div class="pl-list__track">'+
                ' <button class="pl-list__play icon_btn"><i class="la la-headphones"></i></button>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
              '<button class="pl-list__remove icon_btn">'+
                '<i class="la la-minus-circle"></i>'+
              '</button>'+
            '</li>',
  // settings
  settings = {
    volume        : 0.1,
    changeDocTitle: true,
    confirmClose  : true,
    autoPlay      : false,
    buffered      : true,
    notification  : true,
    playList      : []
  };

  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return 'Player already init';
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap__controls--toggle');
    playSvg        = playBtn.querySelector('.icon-play');
    playSvgPath    = playSvg.querySelector('path');
    prevBtn        = player.querySelector('.ap__controls--prev');
    nextBtn        = player.querySelector('.ap__controls--next');
    repeatBtn      = player.querySelector('.ap__controls--repeat');
    volumeBtn      = player.querySelector('.volume-btn');
    plBtn          = player.querySelector('.ap__controls--playlist');
    curTime        = player.querySelector('.track__time--current');
    durTime        = player.querySelector('.track__time--duration');
    trackTitle     = player.querySelector('.track__title');
    progressBar    = player.querySelector('.progress__bar');
    preloadBar     = player.querySelector('.progress__preload');
    volumeBar      = player.querySelector('.volume__bar');

    playList = settings.playList;

    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.closest('.progress-container').addEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').addEventListener('mousemove', seek, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').addEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').addEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').addEventListener(wheel(), setVolume, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);

    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', errorHandler, false);
    audio.addEventListener('timeupdate', timeUpdate, false);
    audio.addEventListener('ended', doEnd, false);

    volumeBar.style.height = audio.volume * 100 + '%';
    volumeLength = volumeBar.css('height');

    if(settings.confirmClose) {
      window.addEventListener("beforeunload", beforeUnload, false);
    }

    if(isEmptyList()) {
      return false;
    }
    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
      plLi[index].classList.add('pl-list--current');
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
    }
  }

  function changeDocumentTitle(title) {
    if(settings.changeDocTitle) {
      if(title) {
        document.title = title;
      }
      else {
        document.title = docTitle;
      }
    }
  }

  function beforeUnload(evt) {
    if(!audio.paused) {
      var message = 'Music still playing';
      evt.returnValue = message;
      return message;
    }
  }

  function errorHandler(evt) {
    if(isEmptyList()) {
      return;
    }
    var mediaError = {
      '1': 'MEDIA_ERR_ABORTED',
      '2': 'MEDIA_ERR_NETWORK',
      '3': 'MEDIA_ERR_DECODE',
      '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    audio.pause();
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    plLi[index] && plLi[index].classList.remove('pl-list--current');
    changeDocumentTitle();
    throw new Error('Houston we have a problem: ' + mediaError[evt.target.error.code]);
  }

/**
 * UPDATE PL
 */
  function updatePL(addList) {
    if(!apActive) {
      return 'Player is not yet initialized';
    }
    if(!Array.isArray(addList)) {
      return;
    }
    if(addList.length === 0) {
      return;
    }

    var count = playList.length;
    var html  = [];
    playList.push.apply(playList, addList);
    addList.forEach(function(item) {
      html.push(
        tplList.replace('{count}', count++).replace('{title}', item.title)
      );
    });
    // If exist empty message
    if(plUl.querySelector('.pl-list--empty')) {
      plUl.removeChild( pl.querySelector('.pl-list--empty') );
      audio.src = playList[index].file;
      trackTitle.innerHTML = playList[index].title;
    }
    // Add song into playlist
    plUl.insertAdjacentHTML('beforeEnd', html.join(''));
    plLi = pl.querySelectorAll('li');
  }

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];

      playList.forEach(function(item, i) {
        html.push(
          tplList.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container',
        'id': 'pl',
        'innerHTML': '<ul class="pl-ul">' + (!isEmptyList() ? html.join('') : '<li class="pl-list--empty">PlayList is empty</li>') + '</ul>'
      });

      playerContainer.insertBefore(pl, playerContainer.firstChild);
      plUl = pl.querySelector('.pl-ul');
      plLi = plUl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();

      if(evt.target.matches('.pl-list__title')) {
        var current = parseInt(evt.target.closest('.pl-list').getAttribute('data-track'), 10);
        if(index !== current) {
          index = current;
          play(current);
        }
        else {
          playToggle();
        }
      }
      else {
          if(!!evt.target.closest('.pl-list__remove')) {
            var parentEl = evt.target.closest('.pl-list');
            var isDel = parseInt(parentEl.getAttribute('data-track'), 10);

            playList.splice(isDel, 1);
            parentEl.closest('.pl-ul').removeChild(parentEl);

            plLi = pl.querySelectorAll('li');

            [].forEach.call(plLi, function(el, i) {
              el.setAttribute('data-track', i);
            });

            if(!audio.paused) {

              if(isDel === index) {
                play(index);
              }

            }
            else {
              if(isEmptyList()) {
                clearAll();
              }
              else {
                if(isDel === index) {
                  if(isDel > playList.length - 1) {
                    index -= 1;
                  }
                  audio.src = playList[index].file;
                  trackTitle.innerHTML = playList[index].title;
                  progressBar.style.width = 0;
                }
              }
            }
            if(isDel < index) {
              index--;
            }
          }

      }
    }

    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-list--current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-list--current');
      }
      plLi[current].classList.add('pl-list--current');
    }


/**
 * Player methods
 */
  function play(currentIndex) {

    if(isEmptyList()) {
      return clearAll();
    }

    index = (currentIndex + playList.length) % playList.length;

    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    // Change document title
    changeDocumentTitle(playList[index].title);

    // Audio play
    audio.play();

    // Show notification
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });

    // Toggle play button
    playBtn.classList.add('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));

    // Set active song playlist
    plActive();
  }

  function prev() {
    play(index - 1);
  }

  function next() {
    play(index + 1);
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function clearAll() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    if(!plUl.querySelector('.pl-list--empty')) {
      plUl.innerHTML = '<li class="pl-list--empty">PlayList is empty</li>';
    }
    changeDocumentTitle();
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {

      if(audio.currentTime === 0) {
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing'
        });
      }
      changeDocumentTitle(playList[index].title);

      audio.play();

      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
    }
    else {
      changeDocumentTitle();
      audio.pause();
      playBtn.classList.remove('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = settings.volume * 100 + '%';
        audio.volume = settings.volume;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      volumeBtn.classList.remove('has-muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      volumeBtn.classList.add('has-muted');
    }
  }

  function repeatToggle() {
    if(repeatBtn.classList.contains('is-active')) {
      repeating = false;
      repeatBtn.classList.remove('is-active');
    }
    else {
      repeating = true;
      repeatBtn.classList.add('is-active');
    }
  }

  function plToggle() {
    plBtn.classList.toggle('is-active');
    //pl.classList.toggle('h-show');
  }

  function timeUpdate() {
    if(audio.readyState === 0 || seeking) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    if(settings.buffered) {
      var buffered = audio.buffered;
      if(buffered.length) {
        var loaded = Math.round(100 * buffered.end(0) / audio.duration);
        preloadBar.style.width = loaded + '%';
      }
    }
  }

  /**
   * TODO shuffle
   */
  function shuffle() {
    if(shuffle) {
      index = Math.round(Math.random() * playList.length);
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('is-playing');
        playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        return;
      }
      else {
        play(0);
      }
    }
    else {
      play(index + 1);
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset)  * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      if(evt.type === wheel()) {
        value = parseInt(volumeLength, 10);
        var delta = evt.deltaY || evt.detail || -evt.wheelDelta;
        value = (delta > 0) ? value - 10 : value + 10;
      }
      else {
        var offset = (el.offset().top + el.offsetHeight) - window.pageYOffset;
        value = Math.round((offset - evt.clientY));
      }
      if(value > 100) value = wheelVolumeValue = 100;
      if(value < 0) value = wheelVolumeValue = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    !rightClick && progressBar.classList.add('progress__bar--active');
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seekingVol = true;
    setVolume(evt);
  }

  function seek(evt) {
    evt.preventDefault();
    if(seeking && rightClick === false && audio.readyState !== 0) {
      window.value = moveBar(evt, progressBar, 'horizontal');
    }
  }

  function seekingFalse() {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      audio.currentTime = audio.duration * (window.value / 100);
      progressBar.classList.remove('progress__bar--active');
    }
    seeking = false;
    seekingVol = false;
  }

  function setVolume(evt) {
    evt.preventDefault();
    volumeLength = volumeBar.css('height');
    if(seekingVol && rightClick === false || evt.type === wheel()) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        audio.muted = true;
        volumeBtn.classList.add('has-muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('has-muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    attr.tag = 'AP music player';
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        setTimeout(notice.close.bind(notice), 5000);
      }
    });
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    if(settings.confirmClose) {
      window.removeEventListener('beforeunload', beforeUnload, false);
    }

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.closest('.progress-container').removeEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').removeEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').removeEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').removeEventListener(wheel(), setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', errorHandler, false);
    audio.removeEventListener('timeupdate', timeUpdate, false);
    audio.removeEventListener('ended', doEnd, false);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
    index = 0;

    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    volumeBtn.classList.remove('has-m b        uted');
    plBtn.classList.remove('is-active');
    repeatBtn.classList.remove('is-active');

    // Remove player from the DOM if necessary
    // player.parentNode.removeChild(player);
  }


/**
 *  Helpers
 */
  function wheel() {
    var wheel;
    if ('onwheel' in document) {
      wheel = 'wheel';
    } else if ('onmousewheel' in document) {
      wheel = 'mousewheel';
    } else {
      wheel = 'MozMousePixelScroll';
    }
    return wheel;
  }

  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };

  // matches polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.matchesSelector ||
      ElementPrototype.webkitMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      function(selector) {
          var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
          while (nodes[++i] && nodes[i] != node);
          return !!nodes[i];
      };
  }(Element.prototype);

  // closest polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.closest = ElementPrototype.closest ||
      function(selector) {
          var el = this;
          while (el.matches && !el.matches(selector)) el = el.parentNode;
          return el.matches ? el : null;
      };
  }(Element.prototype);

/**
 *  Public methods
 */
  return {
    init: init,
    update: updatePL,
    destroy: destroy
  };

})();

window.AP = AudioPlayer;

})(window);

// TEST: image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';

AP.init({
  playList: [
    {'icon': iconImage, 'title': 'The Best of Bach', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreamer.mp3'},
    {'icon': iconImage, 'title': 'District Four', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3'},
    {'icon': iconImage, 'title': 'Christmas Rap', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Christmas%20Rap.mp3'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket%20Power.mp3'}
  ]
});

// TEST: update playlist
//document.getElementById('addSongs').addEventListener('click', function(e) {
//  e.preventDefault();
  AP.update([
    {'icon': iconImage, 'title': 'District Four', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3'},
    {'icon': iconImage, 'title': 'Christmas Rap', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Christmas%20Rap.mp3'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'https://www.youtube.com/watch?v=ApbZfl7hIcg'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'https://www.youtube.com/watch?v=ApbZfl7hIcg'}
  ]);
//})


},{}],2:[function(require,module,exports){
(function($, undefined) {
    "use strict";

    $.embedplayer = {
        modules: [],
        modules_by_origin: {},
        defaults: {
            matches: function() { return false; },
            init: function(data, callback) { callback(); },
            play: function(data) {},
            pause: function(data) {},
            toggle: function(data) {
                if (data.state === "playing") {
                    data.module.pause.call(this, data);
                    playToggle();
                } else {
                    data.module.play.call(this, data);
                    playToggle();
                }
            },
            stop: function(data) { data.module.pause(data); },
            next: function(data) {},
            prev: function(data) {},
            listen: function(data, events) {},
            volume: function(data, callback) { callback(NaN); },
            duration: function(data, callback) { callback(NaN); },
            currenttime: function(data, callback) { callback(NaN); },
            setVolume: function(data, volume) {},
            seek: function(data, position) {},
            link: function(data) { return null; },
            parseMessage: function(event) {},
            processMessage: function(data, message, trigger) {},
            origin: []
        },
        register: function(module) {
            module = make_module(module);
            $.embedplayer.modules.push(module);
            for (var origin in module.origin) {
                if (origin in $.embedplayer.modules_by_origin) {
                    throw new TypeError("already have embedplayer module for origin: " + origin);
                }
                $.embedplayer.modules_by_origin[origin] = module;
            }
        },
        origin: function(url) {
            if (/^\/\//.test(url)) {
                return location.protocol + "//" + url.split("/")[2];
            } else if (/^[-_a-z0-9]+:/i.test(url)) {
                return /^([-_a-z0-9]+:(?:\/\/)?[^\/]*)/i.exec(url)[1];
            } else {
                return location.protocol + '//' + location.host;
            }
        },
        parseParams: function(search) {
            var params = {};
            if (search) {
                search = search.split("&");
                for (var i = 0; i < search.length; ++i) {
                    var param = search[i].split("=");
                    params[decodeURIComponent(param[0])] = decodeURIComponent(param.slice(1).join("="));
                }
            }
            return params;
        },
        trigger: function(self, data, type, properties) {
            var state = null;

            switch (type) {
                case "timeupdate":
                case "volumechange":
                case "durationchange":
                case "error":
                    break;

                case "ready":
                    state = "ready";
                    break;

                case "play":
                    state = "playing";
                    break;

                case "pause":
                    state = "paused";
                    break;

                case "finish":
                    state = "finished";
                    break;

                case "buffering":
                    state = "buffering";
                    break;
            }

            if (state && state === data.state) {
                return;
            }

            if (state !== null) {
                data.state = state;
            }

            if (data.listening[type] === true) {
                var $self = $(self);
                if (state) $self.trigger($.Event('embedplayer:statechange', { state: state }));
                $self.trigger($.Event('embedplayer:' + type, properties));
            }
        }
    };

    function playToggle() {
        if (true) {
            playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
        } else {
            playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        }
    }

    function make_module(module) {
        module = $.extend({}, $.embedplayer.defaults, module);
        var origins = {};
        if (module.origin) {
            if (!$.isArray(module.origin)) {
                module.origin = [module.origin];
            }
            for (var i = 0; i < module.origin.length; ++i) {
                var origin = module.origin[i];
                if (/^\/\//.test(origin)) {
                    origins[location.protocol + origin] = true;
                } else {
                    origins[origin] = true;
                }
            }
        }
        module.origin = origins;
        return module;
    }

    function init(self, options) {
        var data = $.data(self, 'embedplayer');
        if (!data) {
            var module = null;

            if (options) {
                module = make_module(options);
                for (var origin in module.origin) {
                    if (origin in $.embedplayer.modules_by_origin) {
                        throw new TypeError("already have embedplayer module for origin: " + origin);
                    }
                    $.embedplayer.modules_by_origin[origin] = module;
                }
            } else {
                for (var i = 0; i < $.embedplayer.modules.length; ++i) {
                    var candidate = $.embedplayer.modules[i];
                    if (candidate.matches.call(self)) {
                        module = candidate;
                        break;
                    }
                }
            }

            if (!module) {
                throw new TypeError("unsupported embed");
            }

            data = {
                module: module,
                state: 'init',
                listening: {
                    ready: false,
                    play: false,
                    pause: false,
                    finish: false,
                    buffering: false,
                    timeupdate: false,
                    volumechange: false,
                    durationchange: false,
                    error: false
                },
                detail: {}
            };

            $.data(self, 'embedplayer', data);

            var ok = false;
            try {
                module.init.call(self, data, function(player_id) {
                    data.player_id = player_id;
                    $.attr(self, 'data-embedplayer-id', player_id === undefined ? '' : player_id);
                });
                ok = true;
            } finally {
                if (!ok) {
                    // do it like that because catch and re-throw
                    // changes the stack trace in some browsers
                    $.removeData(self, 'embedplayer');
                }
            }
        }
        return data;
    }

    $.fn.embedplayer = function(command, options) {
        if (arguments.length === 0) {
            command = "init";
        } else if (arguments.length === 1 && typeof(command) === "object") {
            options = command;
            command = "init";
        }

        switch (command) {
            case "init":
                this.each(function() { init(this, options); });
                break;

            case "play":
            case "pause":
            case "stop":
            case "toggle":
            case "next":
            case "prev":
                this.each(function() {
                    var data = init(this, options);
                    data.module[command].call(this, data);
                });
                break;

            case "seek":
                var position = Number(arguments[1]);
                this.each(function() {
                    var data = init(this, options);
                    data.module.seek.call(this, data, position);
                });
                break;

            case "listen":
                var events = arguments.length > 1 ?
                    arguments[1] : ["ready", "play", "pause", "finish", "buffering", "timeupdate", "volumechange", "durationchange", "error"];
                if (!$.isArray(events)) {
                    events = $.trim(events).split(/\s+/);
                }
                this.each(function() {
                    var data = init(this);
                    data.module.listen.call(this, data, events);
                    for (var i = 0; i < events.length; ++i) {
                        data.listening[events[i]] = true;
                    }
                });
                break;

            case "volume":
                if (arguments.length > 1 && typeof(arguments[1]) !== "function") {
                    var volume = Number(arguments[1]);
                    this.each(function() {
                        var data = init(this);
                        data.module.setVolume.call(this, data, volume);
                    });
                } else if (this.length === 0) {
                    (arguments[1] || $.noop)(NaN);
                } else {
                    var data = init(this[0]);
                    return data.module.volume.call(this[0], data, arguments[1] || $.noop);
                }
                break;

            case "duration":
            case "currenttime":
                if (this.length === 0) {
                    (arguments[1] || $.noop)(NaN);
                } else {
                    var data = init(this[0]);
                    return data.module[command].call(this[0], data, arguments[1] || $.noop);
                }
                break;

            case "link":
                if (this.length === 0) {
                    return null;
                } else {
                    var data = init(this[0]);
                    return data.module.link.call(this[0], data);
                }
                break;

            case "supported":
                for (var i = 0; i < this.length; ++i) {
                    var self = this[i];
                    var supported = false;
                    for (var j = 0; j < $.embedplayer.modules.length; ++j) {
                        var candidate = $.embedplayer.modules[j];
                        if (candidate.matches.call(self)) {
                            supported = true;
                            break;
                        }
                    }
                    if (!supported) {
                        return false;
                    }
                }
                return this.length > 0;

            default:
                throw new TypeError("unknown command: " + command);
        }

        return this;
    };

    window.addEventListener("message", function(event) {
        var module = $.embedplayer.modules_by_origin[event.origin];
        if (module) {
            var message = module.parseMessage(event);
            if (message) {
                var iframes = 'player_id' in message ?
                    document.querySelectorAll('iframe[data-embedplayer-id="' + message.player_id + '"]') :
                    document.getElementsByTagName('iframe');
                for (var i = 0; i < iframes.length; ++i) {
                    var iframe = iframes[i];
                    if (iframe.contentWindow === event.source) {
                        var data = init(iframe);
                        data.module.processMessage.call(iframe, data, message, $.embedplayer.trigger.bind($.embedplayer, iframe, data));
                        break;
                    }
                }
            }
        }
    }, false);
})(jQuery);
},{}],3:[function(require,module,exports){
/* 2017. 03. 
*/


/* ======= Responsive Web ======= */
const hPX = {
    header: 50,
    audioPlayer : 80,
    inputBox : 45
}

const resizeMainHeight = function(){
  util.$("#main").style.height = window.innerHeight - hPX.header - hPX.audioPlayer +'px';
  util.$(".searchList").style.height = window.innerHeight - hPX.header - hPX.audioPlayer - hPX.inputBox + 'px';
}

window.addEventListener('resize',function(){
    resizeMainHeight();
});

document.addEventListener("DOMContentLoaded", function() {
    searchListView.callSearchAPI();
    resizeMainHeight();
});


/* ======= Utility ======= */
var util = {
    runAjax : function(url, listener, reqFunc){
        let oReq = new XMLHttpRequest();
        oReq.addEventListener(listener, reqFunc);
        oReq.open("GET", url);
        oReq.send();
    },
    $: function(selector) {
        return document.querySelector(selector);
    },
    $$: function(selector){
        return document.querySelectorAll(selector);
    },
    timeAgo: function(selector){

    var templates = {
        prefix: "",
        suffix: " ago",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years"
    };
    var template = function(t, n) {
        return templates[t] && templates[t].replace(/%d/i, Math.abs(Math.round(n)));
    };

    var timer = function(time) {
        if (!time)
            return;
        time = time.replace(/\.\d+/, ""); // remove milliseconds
        time = time.replace(/-/, "/").replace(/-/, "/");
        time = time.replace(/T/, " ").replace(/Z/, " UTC");
        time = time.replace(/([\+\-]\d\d)\:?(\d\d)/, " $1$2"); // -04:00 -> -0400
        time = new Date(time * 1000 || time);

        var now = new Date();
        var seconds = ((now.getTime() - time) * .001) >> 0;
        var minutes = seconds / 60;
        var hours = minutes / 60;
        var days = hours / 24;
        var years = days / 365;

        return templates.prefix + (
                seconds < 45 && template('seconds', seconds) ||
                seconds < 90 && template('minute', 1) ||
                minutes < 45 && template('minutes', minutes) ||
                minutes < 90 && template('hour', 1) ||
                hours < 24 && template('hours', hours) ||
                hours < 42 && template('day', 1) ||
                days < 30 && template('days', days) ||
                days < 45 && template('month', 1) ||
                days < 365 && template('months', days / 30) ||
                years < 1.5 && template('year', 1) ||
                template('years', years)
                ) + templates.suffix;
    };

    var elements = document.querySelectorAll('.videoTimeAgo');
    for (var i in elements) {
        var $this = elements[i];
        if (typeof $this === 'object') {
            $this.innerHTML = timer($this.getAttribute('title') || $this.getAttribute('datetime'));
        }
    }
    }
}


/* ======= Youtube API Setting ======= */
const setTargetURL = function(keyword, sGetToken){
    
    const baseURL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&';
    var setting = {
        order: 'viewCount',
        maxResults: 15,
        type: 'video',
        q: keyword,
        key: 'AIzaSyDjBfDWFgQa6bdeLc1PAM8EoDAFB_CGYig'
    }
 
    let sTargetURL = Object.keys(setting).map(function(k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(setting[k]);
    }).join('&')
    
    sTargetURL = baseURL + sTargetURL;
    
    if (sGetToken) {
        sTargetURL += "&pageToken=" + sGetToken;
    }
    return sTargetURL;
}


/* ======= Model ======= */
const youtubeAPISearchResult = {
    init: function(){
        this.allVideos = json; //처음 로딩될떄 모든 데이터를 가져옵니다.
    },
    selectedVideoID: null, //선택한 값
    nextPageTokenNumer: null //다음 페이지 토큰 값;
};

const videoSearchListController = {
    init: function(){
        searchListView.init();
    },
    getAllVideos: function(){
        return youtubeAPISearchResult.allVideos.items;
    },
    getNextPageToken: function(){
        return youtubeAPISearchResult.nextPageTokenNumer;
    },
    setNextPageToken: function(){
        youtubeAPISearchResult.nextPageTokenNumer = youtubeAPISearchResult.allVideos.nextPageToken;
    },
    getSelectedVideoID: function(){
        return youtubeAPISearchResult.selectedVideoID
    },
    setSelectedVideo: function(id){
        id = youtubeAPISearchResult.selectedVideoID
    }
}

const searchListView = {
   init: function(){
       this.content = util.$(".searchList");
       this.template = util.$("#searchVideo").innerHTML;
       this.render();
       this.showPreview();
    
   },
   render: function(){
       videos = videoSearchListController.getAllVideos();
       let sHTML = '';
       for (let i=0; i < videos.length; i++) {
           let videoImageUrl =  videos[i].snippet.thumbnails.default.url;
           let videoTitle =  videos[i].snippet.title;
           let publishedAt = videos[i].snippet.publishedAt;
           let videoId = videos[i].id.videoId
           sDom = this.template.replace("{videoImage}", videoImageUrl)
           .replace("{videoTitle}", videoTitle)
           .replace("{time}", publishedAt)
           .replace("{videoPublishedAt}", publishedAt)
           .replace("{videoId}", videoId);
            sHTML = sHTML + sDom;
        }
        this.content.insertAdjacentHTML('beforeend', sHTML);
    },
    
    callSearchAPI: function(){
        util.$(".goSearch").addEventListener('click', function(event) {
            util.$(".searchList").innerHTML = "";
            this.searchKeyword = util.$("#search_box").value;
            sUrl = setTargetURL(this.searchKeyword);
            util.runAjax(sUrl, "load", function(){
                json = JSON.parse(this.responseText);
                youtubeAPISearchResult.init();
                videoSearchListController.init();
                videoSearchListController.setNextPageToken();
                searchListView.moreResult();
                util.timeAgo();
            });
        });
    },

    moreResult: function(){
        this.searchKeyword = util.$("#search_box").value;
        util.$(".searchList").addEventListener("scroll", function(){
            if(this.scrollHeight - this.scrollTop === this.clientHeight) {
                nextPageTok = videoSearchListController.getNextPageToken();
                sUrl = setTargetURL(this.searchKeyword, nextPageTok);
                util.runAjax(sUrl, "load",function(){
                    json = JSON.parse(this.responseText);
                    
                    youtubeAPISearchResult.init();
                    
                    videoSearchListController.init();
                    util.timeAgo();
                    videoSearchListController.setNextPageToken();
                });
            }
        });  
    },
    showPreview: function(){
        util.$(".searchList").addEventListener('click', function(evt) {
            target = evt.target;
            if (target.tagName === 'I'){
                target = target.parentNode;
                (console.log(target));
            }
            if (target.tagName !== "BUTTON"){ 
                target = util.$(".videoInfo"); 
                util.$(".previewModal").dataset.id = '';
                util.$(".previewModal").classList.remove("hide");
                sDom = util.$("#previewVideo").innerHTML;
                sHTML = sDom.replace("{data-id}", target.dataset.id);
                util.$(".previewModal").innerHTML = sHTML;
                util.$(".searchList").classList.add("modal-open");
                return (function() {
                    this.hidePreview();
                }).call(searchListView);
            }
            console.log(target);
            // elem =  elem.closest(".videoInfo");  
            // (console.log(elem));      
            // if (!elem) return;
            
        });
        
    },
    hidePreview: function(){
        util.$(".close_btn").addEventListener('click', function(evt) {
            let button =  evt.target.closest("button");
            util.$(".previewModal").classList.add("hide");
            util.$(".searchList").classList.remove("modal-open");
        });
    },
    

}
 
},{}],4:[function(require,module,exports){
///////////// NAME SPACE START ///////////////
var nameSpace = {};
nameSpace.$getval = '';
nameSpace.getvideoId = [];
nameSpace.playList = [];
nameSpace.jdata = [];
nameSpace.albumStorage = localStorage;
///////////// NAME SPACE END ///////////////

//DEVMODE/////////// NAV control START ////////////
//functionality1 : navigation control
var nav = function() {
    //get each btn in nav with dom delegation with jquery and event propagation
    $(".nav_parent").on("click", "li", function(event) {
        event.preventDefault(); //bubbling prevent
        var className = $(this).attr('class');
        console.log(className);
        if (className == "album_btn") {
            $(".searchList").hide(); //검색 결과 Clear
            $(".addNewMedia").hide(); //검색 창 Clear
        } else if (className == "popular_btn") {
            console.log("POPULAR.....?");
            $(".searchList").hide(); //검색 결과 Clear
            $(".addNewMedia").hide(); //검색 창 Clear
        } else {
            console.log("SEARCH BTN!!!!")
            $(".searchList").show(); //검색 결과 Clear
            $(".addNewMedia").show(); //검색 창 Clear
        }
    });
};
//DEVMODE/////////// NAV control END ////////////

nav(); //nav 실행
///////////// SEARCH API START /////////////////
var fnGetList = function(sGetToken) {
    nameSpace.$getval = $("#search_box").val();
    if (nameSpace.$getval == "") {
        alert == ("검색어입력바랍니다.");
        $("#search_box").focus();
        return;
    }
    //Cleansing Dom, VideoId
    nameSpace.getvideoId = []; //getvideoId array초기화
    // $(".searchList").empty(); //검색 결과 View초기화
    $(".videoPlayer").empty(); //player Dom초기화

    //querysection//
    //15개씩

    var sTargetUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance&maxResults=15&type=video" + "&q=" + encodeURIComponent(nameSpace.$getval) + "&key=AIzaSyDjBfDWFgQa6bdeLc1PAM8EoDAFB_CGYig";
    if (sGetToken) {
        sTargetUrl += "&pageToken=" + sGetToken;
        console.log(sTargetUrl);
    }

    $.ajax({
        type: "POST",
        url: sTargetUrl,
        dataType: "jsonp",
        success: function(jdata) {
            nameSpace.jdata = jdata; //jdata.
            
            searchResultView();
            $(jdata.items).each(function(i) {
                nameSpace.getvideoId.push(jdata.items[i].id.videoId); //nameSpace.getvideoId에 검색된 videoID 배열로 추가
            }).promise().done(function() {
                // console.log(nameSpace.getvideoId[0]);
                $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[0] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
                //playVideoSelect();
                 if (jdata.nextPageToken) {
                     getMoreSearchResult(jdata.nextPageToken);
                }
            });
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
};
///////////// SEARCH API END ///////////////////

//스크롤 다운시 함수 실행하기.
var getMoreSearchResult = function(nextPageToken){
    $(".searchList").scroll(function () {
        if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
            fnGetList(nextPageToken);
        }
    });
}




    
//////////// SEARCH RESULT VIEW START ///////////////
var searchResultView = function() {
    var searchResultList = '';
    for (var i = 0; i < nameSpace.jdata.items.length; i++) {
        var getTemplate = $('#searchVideo')[0]; //template queryselect
        var getHtmlTemplate = getTemplate.innerHTML; //get html in template
        var adaptTemplate = getHtmlTemplate.replace("{videoImage}", nameSpace.jdata.items[i].snippet.thumbnails.default.url)
            .replace("{videoTitle}", nameSpace.jdata.items[i].snippet.title)
            .replace("{videoViews}", "TBD")
            .replace("{id}", i);
        searchResultList = searchResultList + adaptTemplate;
    }
    $('.searchList').empty().append(searchResultList);
};


//////////// SEARCH RESULT VIEW END ///////////////


//////// PLAY SELECT VIDEO START ////////////////
var playVideoSelect = function() {
    $(".searchList").on("click", "li", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        $(".videoPlayer").empty(); //player Dom초기화
        $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[tagId] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
    });
};
//////// PLAY SELECT VIDEO END ////////////////

//DEVMODE/////////// ADD PLAY LIST TO ALBUM START /////////////////
var addPlayList = function() {
    $(".searchVideo li button").on("click", "button", function() { // 검색된 list click했을경우.
        console.log("AAAA");
        var tagId = $(this).attr('id');
        // var tagId = $(this).attr('id');
        localStorage.setItem();

        console.log($(this));
    });
};
//DEVMODE/////////// ADD PLAY LIST TO ALBUM END /////////////////



// // Layout 변경
// window.addEventListener('resize',function(){
//   resizeMainHeight();
// });

// resizeMainHeight();
// function resizeMainHeight(){
//   var headerHeight = 50;
//   var audioPlayerHeight = 80;
//   var inputBoxHeight = 45;
//   document.getElementById("main").style.height = window.innerHeight - headerHeight - audioPlayerHeight +'px';
//   document.querySelector(".searchList").style.height = window.innerHeight - headerHeight - audioPlayerHeight - inputBoxHeight + 'px';
// }




},{}],5:[function(require,module,exports){
        function initEmbed() {
            $(this).on('embedplayer:statechange', function(event) {
                $('#state').text(event.state);
            }).on('embedplayer:error', function(event) {
                var message = event.error || '';
                if (event.title) {
                    message += " " + event.title;
                } else if (event.message) {
                    message += " " + event.message;
                }
                $('#error').text(message);
            }).on('embedplayer:durationchange', function(event) {
                if (isFinite(event.duration)) {
                    $('#currenttime').show().prop('max', event.duration);
                } else {
                    $('#currenttime').hide();
                }
                $('#duration').text(event.duration.toFixed(2) + ' seconds');
            }).on('embedplayer:timeupdate', function(event) {
                $('#currenttime').val(event.currentTime);
                $('#currenttime-txt').text(event.currentTime.toFixed(2) + ' seconds');
            }).on('embedplayer:volumechange', function(event) {
                $('#volume').val(event.volume);
                $('#volume-label').text(
                    event.volume <= 0 ? '🔇' :
                    event.volume <= 1 / 3 ? '🔈' :
                    event.volume <= 2 / 3 ? '🔉' :
                    '🔊'
                );
                $('#volume-txt').text(event.volume.toFixed(2));
            }).on('embedplayer:ready', function(event) {
                var link = $(this).embedplayer('link');
                if (link) {
                    $('#link').attr('href', link);
                    $('#link-wrapper').show();
                }
            }).
            embedplayer("listen").
            embedplayer('volume', function(volume) {
                $('#volume').text(volume.toFixed(2));
            });
        }

        function loadVideo(tag, url) {
            try {
                var attrs = {
                    id: 'video',
                    src: url
                };
                switch (tag) {
                    case 'iframe':
                        attrs.allowfullscreen = 'allowfullscreen';
                        attrs.frameborder = '0';
                        attrs.width = '640';
                        attrs.height = '360';
                        break;

                    case 'video':
                        attrs.width = '640';
                        attrs.height = '360';
                    case 'audio':
                        attrs.controls = 'controls';
                        attrs.preload = 'auto';
                        break;
                }
                $('#link-wrapper').hide();
                $('<' + tag + '>').attr(attrs).replaceAll('#video').each(initEmbed);
            } catch (e) {
                $('#error').text(String(e));
            }
        }

        // function updateVideo() {
        //     var value = $('#embed').val().split('|');
        //     $('#duration, #currenttime, #volume').text('?');
        //     $('#state').text('loading...');
        //     $('#error').text('');
        //     loadVideo(value[0], value[1]);
        // }

        // $(document).ready(updateVideo);
},{}],6:[function(require,module,exports){
(function($, undefined) {
    "use strict";

    var event_map = {
        ready: null,
        play: null,
        pause: null,
        finish: null,
        buffering: null,
        timeupdate: null,
        durationchange: null,
        volumechange: null,
        error: "onError"
    };

    var next_id = 1;

    $.embedplayer.register({
        origin: 'https://www.youtube.com',
        matches: function() {
            return $.nodeName(this, "iframe") && /^https?:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/[-_a-z0-9]+.*[\?&]enablejsapi=1/i.test(this.src);
        },
        init: function(data, callback) {
            var self = this;
            data.detail.player_id = next_id++;
            data.detail.origin = /^https?:\/\/(www\.)?youtube-nocookie\.com\//i.test(this.src) ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
            data.detail.duration = NaN;
            data.detail.currenttime = 0;
            data.detail.volume = 1;
            data.detail.commands = [];
            data.detail.video_id = /^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([-_a-z0-9]+)/i.exec(this.src)[1];
            data.detail.timer = setInterval(function() {
                if (!$.contains(self.ownerDocument.body, self)) {
                    clearInterval(data.detail.timer);
                    data.detail.timer = null;
                    return;
                } else if (self.contentWindow) {
                    self.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: data.detail.player_id }), data.detail.origin);
                }
            }, 500);
            callback('youtube_' + data.detail.player_id);
        },
        play: function(data) {
            send(this, data, "playVideo");
        },
        pause: function(data) {
            send(this, data, "pauseVideo");
        },
        stop: function(data) {
            send(this, data, "stopVideo");
        },
        next: function(data) {
            send(this, data, "nextVideo");
        },
        prev: function(data) {
            send(this, data, "previousVideo");
        },
        volume: function(data, callback) {
            callback(data.detail.volume);
        },
        duration: function(data, callback) {
            callback(data.detail.duration);
        },
        currenttime: function(data, callback) {
            callback(data.detail.currenttime);
        },
        setVolume: function(data, volume) {
            send(this, data, 'setVolume', volume * 100);
        },
        seek: function(data, position) {
            send(this, data, 'seekTo', position);
        },
        listen: function(data, events) {
            var done = {};
            for (var i = 0; i < events.length; ++i) {
                var event = event_map[events[i]];
                if (event && done[event] !== true) {
                    done[event] = true;
                    send(this, data, 'addEventListener', event);
                }
            }
        },
        link: function(data) {
            return 'https://www.youtube.com/watch?v=' + data.detail.video_id;
        },
        parseMessage: function(event) {
            var message = {
                data: JSON.parse(event.data)
            };
            message.player_id = 'youtube_' + message.data.id;
            return message;
        },
        processMessage: function(data, message, trigger) {
            if (message.data.event === "infoDelivery") {
                var info = message.data.info;
                if (info) {
                    if ('volume' in info) {
                        var volume;
                        if (info.muted) {
                            volume = 0.0;
                        } else {
                            volume = info.volume / 100;
                        }
                        if (data.detail.volume !== volume) {
                            data.detail.volume = volume;
                            trigger("volumechange", { volume: volume });
                        }
                    }

                    if ('playerState' in info) {
                        switch (info.playerState) {
                            case -1: // unstarted
                                break;

                            case 0: // ended
                                trigger("finish");
                                break;

                            case 1: // playing
                                trigger("play");
                                break;

                            case 2: // paused
                                trigger("pause");
                                break;

                            case 3: // buffering
                                trigger("buffering");
                                break;

                            case 5: // cued
                                trigger("pause");
                                break;
                        }
                    }

                    if ('duration' in info) {
                        if (info.duration !== data.detail.duration) {
                            data.detail.duration = info.duration;
                            trigger("durationchange", { duration: info.duration });
                        }
                    }

                    if ('currentTime' in info) {
                        if (info.currentTime !== data.detail.currenttime) {
                            data.detail.currenttime = info.currentTime;
                            trigger("timeupdate", { currentTime: info.currentTime });
                        }
                    }

                    if ('videoData' in info) {
                        data.detail.videoData = info.videoData;
                    }

                    if ('availableQualityLevels' in info) {
                        data.detail.availableQualityLevels = info.availableQualityLevels;
                    }
                }
            } else if (message.data.event === "initialDelivery") {
                if (data.detail.timer !== null) {
                    clearInterval(data.detail.timer);
                    data.detail.timer = null;
                }
            } else if (message.data.event === "onReady") {
                trigger("ready");
                var win = this.contentWindow;
                if (win && data.detail.commands) {
                    for (var i = 0; i < data.detail.commands.length; ++i) {
                        win.postMessage(JSON.stringify(data.detail.commands[i]), data.detail.origin);
                    }
                    data.detail.commands = null;
                }
            } else if (message.data.event === "onError") {
                var error;
                switch (message.data.info) {
                    case 2: // The request contains an invalid parameter value.
                        error = "illegal_parameter";
                        break;

                    case 100: // The video requested was not found.
                        error = "not_found";
                        break;

                    case 101: // The owner of the requested video does not allow it to be played in embedded players.
                    case 150: // This error is the same as 101. It's just a 101 error in disguise!
                        error = "forbidden";
                        break;

                    default:
                        error = "error";
                }
                trigger("error", { error: error });
            }
        }
    });

    function send(element, data, func) {
        var command = {
            id: data.detail.player_id,
            event: "command",
            func: func,
            args: Array.prototype.slice.call(arguments, 3)
        };

        if (data.state === "init") {
            data.detail.commands.push(command);
        } else {
            var win = element.contentWindow;
            if (win) {
                win.postMessage(JSON.stringify(command), data.detail.origin);
            }
        }
    }
})(jQuery);
},{}],7:[function(require,module,exports){
        /**
         * Youtube API 로드
         */
        var tag = document.createElement('script');
        tag.src = "http://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        /**
         * onYouTubeIframeAPIReady 함수는 필수로 구현해야 한다.
         * 플레이어 API에 대한 JavaScript 다운로드 완료 시 API가 이 함수 호출한다.
         * 페이지 로드 시 표시할 플레이어 개체를 만들어야 한다.
         */
        var player;

        function onYouTubeIframeAPIReady() {
            player = new YT.Player('videoPlayer', {
                height: '100 %', // <iframe> 태그 지정시 필요없음
                width: '100 %', // <iframe> 태그 지정시 필요없음
                videoId: '9bZkp7q19f0', // <iframe> 태그 지정시 필요없음
                playerVars: { // <iframe> 태그 지정시 필요없음
                    controls: '2'
                },
                events: {
                    'onReady': onPlayerReady, // 플레이어 로드가 완료되고 API 호출을 받을 준비가 될 때마다 실행
                    'onStateChange': onPlayerStateChange // 플레이어의 상태가 변경될 때마다 실행
                }
            });
        }

        function onPlayerReady(event) {
            console.log('onPlayerReady 실행');
        }
        var playerState;

        function onPlayerStateChange(event) {
            playerState = event.data == YT.PlayerState.ENDED ? '종료됨' :
                event.data == YT.PlayerState.PLAYING ? '재생 중' :
                event.data == YT.PlayerState.PAUSED ? '일시중지 됨' :
                event.data == YT.PlayerState.BUFFERING ? '버퍼링 중' :
                event.data == YT.PlayerState.CUED ? '재생준비 완료됨' :
                event.data == -1 ? '시작되지 않음' : '예외';

            console.log('onPlayerStateChange 실행: ' + playerState);

            // 재생여부를 통계로 쌓는다.
            collectPlayCount(event.data);
        }

        function playYoutube() {
            // 플레이어 자동실행 (주의: 모바일에서는 자동실행되지 않음)
            player.playVideo();
        }

        function pauseYoutube() {
            player.pauseVideo();
        }

        function stopYoutube() {
            player.seekTo(0, true); // 영상의 시간을 0초로 이동시킨다.
            player.stopVideo();
        }
        var played = false;

        function collectPlayCount(data) {
            if (data == YT.PlayerState.PLAYING && played == false) {
                // todo statistics
                played = true;
                console.log('statistics');
            }
        }

        /**
         * loadVideoById 함수는 지정한 동영상을 로드하고 재생한다.
         * 인수구문: loadVideoByUrl(mediaContentUrl:String, startSeconds:Number, suggestedQuality:String):Void
         * 개체구문: loadVideoByUrl({mediaContentUrl:String, startSeconds:Number, endSeconds:Number, suggestedQuality:String}):Void
         * loadVideoById 함수 뿐만 아니라 다른 대체적인 함수들도 개체구문이 기능이 더 많다.
         */
        function changeVideoAndStart() {
            player.loadVideoById("iCkYw3cRwLo", 0, "large");
        }

        function changeVideoObjectAndStart() {
            // 0초부터 10초까지 재생을 시킨다.
            player.loadVideoById({
                'videoId': 'bHQqvYy5KYo',
                'startSeconds': 0,
                'endSeconds': 10
            });
        }

        /**
         * loadPlaylist 함수는 지정한 재생목록을 로드하고 재생한다.
         * 인수구문: loadPlaylist(playlist:String|Array, index:Number, startSeconds:Number, suggestedQuality:String):Void
         * 개체구문: loadPlaylist({list:String, listType:String, index:Number, startSeconds:Number, suggestedQuality:String}):Void
         * [주의: 개체구문의 loadPlaylist 함수에서의 재생목록ID 와 동영상ID 의 사용방법이 다르다.]
         */
        function changeVideoListAndStart() {
            player.loadPlaylist(['wcLNteez3c4', 'LOsNP2D2kSA', 'rX372ZwXOEM'], 0, 0, 'large');
        }

        function changeVideoListObjectAndStart() {
            player.loadPlaylist({
                'playlist': ['9HPiBJBCOq8', 'Mp4D0oHEnjc', '8y1D8KGtHfQ', 'jEEF_50sBrI'],
                'listType': 'playlist',
                'index': 0,
                'startSeconds': 0,
                'suggestedQuality': 'small'
            });
        }

        function changeVideoListObjectAndStart2() {
            player.loadPlaylist({
                'list': 'UUPW9TMt0le6orPKdDwLR93w',
                'listType': 'playlist',
                'index': 0,
                'startSeconds': 0,
                'suggestedQuality': 'small'
            });
        }
},{}]},{},[1,2,3,4,5,7,6])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL2VtYmVkcGxheWVyLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2gtMS5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvc2VhcmNoLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy92aWRlb2N0ci5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMveW91dHViZS5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMveW91dHViZVBsYXllci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBdWRpb1BsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAvLyBQbGF5ZXIgdmFycyFcbiAgdmFyXG4gIGRvY1RpdGxlID0gZG9jdW1lbnQudGl0bGUsXG4gIHBsYXllciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwJyksXG4gIHBsYXllckNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51c2VyUGxheWxpc3QnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnIDxidXR0b24gY2xhc3M9XCJwbC1saXN0X19wbGF5IGljb25fYnRuXCI+PGkgY2xhc3M9XCJsYSBsYS1oZWFkcGhvbmVzXCI+PC9pPjwvYnV0dG9uPicrXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X19lcVwiPicrXG4gICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxXCI+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X190aXRsZVwiPnt0aXRsZX08L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGJ1dHRvbiBjbGFzcz1cInBsLWxpc3RfX3JlbW92ZSBpY29uX2J0blwiPicrXG4gICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwibGEgbGEtbWludXMtY2lyY2xlXCI+PC9pPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWUtYnRuJyk7XG4gICAgcGxCdG4gICAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcGxheWxpc3QnKTtcbiAgICBjdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWN1cnJlbnQnKTtcbiAgICBkdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWR1cmF0aW9uJyk7XG4gICAgdHJhY2tUaXRsZSAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aXRsZScpO1xuICAgIHByb2dyZXNzQmFyICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fYmFyJyk7XG4gICAgcHJlbG9hZEJhciAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19wcmVsb2FkJyk7XG4gICAgdm9sdW1lQmFyICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZV9fYmFyJyk7XG5cbiAgICBwbGF5TGlzdCA9IHNldHRpbmdzLnBsYXlMaXN0O1xuXG4gICAgcGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcblxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXBBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIHBsYXlsaXN0XG4gICAgcmVuZGVyUEwoKTtcbiAgICBwbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaW8gb2JqZWN0XG4gICAgYXVkaW8gPSBuZXcgQXVkaW8oKTtcbiAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgYXVkaW8ucHJlbG9hZCA9ICdhdXRvJztcblxuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gYXVkaW8udm9sdW1lICogMTAwICsgJyUnO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgaWYoc2V0dGluZ3MuYXV0b1BsYXkpIHtcbiAgICAgIGF1ZGlvLnBsYXkoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VEb2N1bWVudFRpdGxlKHRpdGxlKSB7XG4gICAgaWYoc2V0dGluZ3MuY2hhbmdlRG9jVGl0bGUpIHtcbiAgICAgIGlmKHRpdGxlKSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2NUaXRsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVVbmxvYWQoZXZ0KSB7XG4gICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnTXVzaWMgc3RpbGwgcGxheWluZyc7XG4gICAgICBldnQucmV0dXJuVmFsdWUgPSBtZXNzYWdlO1xuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKGV2dCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG1lZGlhRXJyb3IgPSB7XG4gICAgICAnMSc6ICdNRURJQV9FUlJfQUJPUlRFRCcsXG4gICAgICAnMic6ICdNRURJQV9FUlJfTkVUV09SSycsXG4gICAgICAnMyc6ICdNRURJQV9FUlJfREVDT0RFJyxcbiAgICAgICc0JzogJ01FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCdcbiAgICB9O1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBwbExpW2luZGV4XSAmJiBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgIHRocm93IG5ldyBFcnJvcignSG91c3RvbiB3ZSBoYXZlIGEgcHJvYmxlbTogJyArIG1lZGlhRXJyb3JbZXZ0LnRhcmdldC5lcnJvci5jb2RlXSk7XG4gIH1cblxuLyoqXG4gKiBVUERBVEUgUExcbiAqL1xuICBmdW5jdGlvbiB1cGRhdGVQTChhZGRMaXN0KSB7XG4gICAgaWYoIWFwQWN0aXZlKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBpcyBub3QgeWV0IGluaXRpYWxpemVkJztcbiAgICB9XG4gICAgaWYoIUFycmF5LmlzQXJyYXkoYWRkTGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYWRkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY291bnQgPSBwbGF5TGlzdC5sZW5ndGg7XG4gICAgdmFyIGh0bWwgID0gW107XG4gICAgcGxheUxpc3QucHVzaC5hcHBseShwbGF5TGlzdCwgYWRkTGlzdCk7XG4gICAgYWRkTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGh0bWwucHVzaChcbiAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgY291bnQrKykucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICApO1xuICAgIH0pO1xuICAgIC8vIElmIGV4aXN0IGVtcHR5IG1lc3NhZ2VcbiAgICBpZihwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLnJlbW92ZUNoaWxkKCBwbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSApO1xuICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICB9XG4gICAgLy8gQWRkIHNvbmcgaW50byBwbGF5bGlzdFxuICAgIHBsVWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVFbmQnLCBodG1sLmpvaW4oJycpKTtcbiAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcbiAgfVxuXG4vKipcbiAqICBQbGF5TGlzdCBtZXRob2RzXG4gKi9cbiAgICBmdW5jdGlvbiByZW5kZXJQTCgpIHtcbiAgICAgIHZhciBodG1sID0gW107XG5cbiAgICAgIHBsYXlMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaSkge1xuICAgICAgICBodG1sLnB1c2goXG4gICAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgaSkucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgcGwgPSBjcmVhdGUoJ2RpdicsIHtcbiAgICAgICAgJ2NsYXNzTmFtZSc6ICdwbC1jb250YWluZXInLFxuICAgICAgICAnaWQnOiAncGwnLFxuICAgICAgICAnaW5uZXJIVE1MJzogJzx1bCBjbGFzcz1cInBsLXVsXCI+JyArICghaXNFbXB0eUxpc3QoKSA/IGh0bWwuam9pbignJykgOiAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JykgKyAnPC91bD4nXG4gICAgICB9KTtcblxuICAgICAgcGxheWVyQ29udGFpbmVyLmluc2VydEJlZm9yZShwbCwgcGxheWVyQ29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgcGxVbCA9IHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC11bCcpO1xuICAgICAgcGxMaSA9IHBsVWwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgcGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RIYW5kbGVyKGV2dCkge1xuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmKGV2dC50YXJnZXQubWF0Y2hlcygnLnBsLWxpc3RfX3RpdGxlJykpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXJzZUludChldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0JykuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcbiAgICAgICAgaWYoaW5kZXggIT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBpbmRleCA9IGN1cnJlbnQ7XG4gICAgICAgICAgcGxheShjdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBwbGF5VG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmKCEhZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdF9fcmVtb3ZlJykpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbCA9IGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKTtcbiAgICAgICAgICAgIHZhciBpc0RlbCA9IHBhcnNlSW50KHBhcmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG5cbiAgICAgICAgICAgIHBsYXlMaXN0LnNwbGljZShpc0RlbCwgMSk7XG4gICAgICAgICAgICBwYXJlbnRFbC5jbG9zZXN0KCcucGwtdWwnKS5yZW1vdmVDaGlsZChwYXJlbnRFbCk7XG5cbiAgICAgICAgICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocGxMaSwgZnVuY3Rpb24oZWwsIGkpIHtcbiAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJywgaSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHBsYXkoaW5kZXgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJBbGwoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGlzRGVsID4gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSAxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICAgICAgICAgICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGlzRGVsIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbEFjdGl2ZSgpIHtcbiAgICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50ID0gaW5kZXg7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwbExpLmxlbmd0aDsgbGVuID4gaTsgaSsrKSB7XG4gICAgICAgIHBsTGlbaV0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgfVxuICAgICAgcGxMaVtjdXJyZW50XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgfVxuXG5cbi8qKlxuICogUGxheWVyIG1ldGhvZHNcbiAqL1xuICBmdW5jdGlvbiBwbGF5KGN1cnJlbnRJbmRleCkge1xuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGNsZWFyQWxsKCk7XG4gICAgfVxuXG4gICAgaW5kZXggPSAoY3VycmVudEluZGV4ICsgcGxheUxpc3QubGVuZ3RoKSAlIHBsYXlMaXN0Lmxlbmd0aDtcblxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgLy8gQ2hhbmdlIGRvY3VtZW50IHRpdGxlXG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgLy8gQXVkaW8gcGxheVxuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIC8vIFNob3cgbm90aWZpY2F0aW9uXG4gICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICBib2R5OiAnTm93IHBsYXlpbmcnLFxuICAgICAgdGFnOiAnbXVzaWMtcGxheWVyJ1xuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIHBsYXkgYnV0dG9uXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG5cbiAgICAvLyBTZXQgYWN0aXZlIHNvbmcgcGxheWxpc3RcbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldigpIHtcbiAgICBwbGF5KGluZGV4IC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBwbGF5TGlzdC5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckFsbCgpIHtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGF1ZGlvLnNyYyA9ICcnO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gJ3F1ZXVlIGlzIGVtcHR5JztcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIGlmKCFwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLmlubmVySFRNTCA9ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nO1xuICAgIH1cbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5VG9nZ2xlKCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgIGlmKGF1ZGlvLmN1cnJlbnRUaW1lID09PSAwKSB7XG4gICAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB9XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZvbHVtZVRvZ2dsZSgpIHtcbiAgICBpZihhdWRpby5tdXRlZCkge1xuICAgICAgaWYocGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCkgPT09IDApIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHNldHRpbmdzLnZvbHVtZSAqIDEwMCArICclJztcbiAgICAgICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2b2x1bWVMZW5ndGg7XG4gICAgICB9XG4gICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGVhdFRvZ2dsZSgpIHtcbiAgICBpZihyZXBlYXRCdG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmVwZWF0aW5nID0gZmFsc2U7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVwZWF0aW5nID0gdHJ1ZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbFRvZ2dsZSgpIHtcbiAgICBwbEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgICAvL3BsLmNsYXNzTGlzdC50b2dnbGUoJ2gtc2hvdycpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZVVwZGF0ZSgpIHtcbiAgICBpZihhdWRpby5yZWFkeVN0YXRlID09PSAwIHx8IHNlZWtpbmcpIHJldHVybjtcblxuICAgIHZhciBiYXJsZW5ndGggPSBNYXRoLnJvdW5kKGF1ZGlvLmN1cnJlbnRUaW1lICogKDEwMCAvIGF1ZGlvLmR1cmF0aW9uKSk7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSBiYXJsZW5ndGggKyAnJSc7XG5cbiAgICB2YXJcbiAgICBjdXJNaW5zID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAvIDYwKSxcbiAgICBjdXJTZWNzID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAtIGN1ck1pbnMgKiA2MCksXG4gICAgbWlucyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLyA2MCksXG4gICAgc2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLSBtaW5zICogNjApO1xuICAgIChjdXJTZWNzIDwgMTApICYmIChjdXJTZWNzID0gJzAnICsgY3VyU2Vjcyk7XG4gICAgKHNlY3MgPCAxMCkgJiYgKHNlY3MgPSAnMCcgKyBzZWNzKTtcblxuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gY3VyTWlucyArICc6JyArIGN1clNlY3M7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSBtaW5zICsgJzonICsgc2VjcztcblxuICAgIGlmKHNldHRpbmdzLmJ1ZmZlcmVkKSB7XG4gICAgICB2YXIgYnVmZmVyZWQgPSBhdWRpby5idWZmZXJlZDtcbiAgICAgIGlmKGJ1ZmZlcmVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgbG9hZGVkID0gTWF0aC5yb3VuZCgxMDAgKiBidWZmZXJlZC5lbmQoMCkgLyBhdWRpby5kdXJhdGlvbik7XG4gICAgICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSBsb2FkZWQgKyAnJSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRPRE8gc2h1ZmZsZVxuICAgKi9cbiAgZnVuY3Rpb24gc2h1ZmZsZSgpIHtcbiAgICBpZihzaHVmZmxlKSB7XG4gICAgICBpbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHBsYXlMaXN0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZG9FbmQoKSB7XG4gICAgaWYoaW5kZXggPT09IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFyZXBlYXRpbmcpIHtcbiAgICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgICAgcGxBY3RpdmUoKTtcbiAgICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwbGF5KDApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlQmFyKGV2dCwgZWwsIGRpcikge1xuICAgIHZhciB2YWx1ZTtcbiAgICBpZihkaXIgPT09ICdob3Jpem9udGFsJykge1xuICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKCAoKGV2dC5jbGllbnRYIC0gZWwub2Zmc2V0KCkubGVmdCkgKyB3aW5kb3cucGFnZVhPZmZzZXQpICAqIDEwMCAvIGVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGgpO1xuICAgICAgZWwuc3R5bGUud2lkdGggPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZihldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgICB2YWx1ZSA9IHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApO1xuICAgICAgICB2YXIgZGVsdGEgPSBldnQuZGVsdGFZIHx8IGV2dC5kZXRhaWwgfHwgLWV2dC53aGVlbERlbHRhO1xuICAgICAgICB2YWx1ZSA9IChkZWx0YSA+IDApID8gdmFsdWUgLSAxMCA6IHZhbHVlICsgMTA7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IChlbC5vZmZzZXQoKS50b3AgKyBlbC5vZmZzZXRIZWlnaHQpIC0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQoKG9mZnNldCAtIGV2dC5jbGllbnRZKSk7XG4gICAgICB9XG4gICAgICBpZih2YWx1ZSA+IDEwMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMTAwO1xuICAgICAgaWYodmFsdWUgPCAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAwO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJCYXIoZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmcgPSB0cnVlO1xuICAgICFyaWdodENsaWNrICYmIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIHNlZWsoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJWb2woZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSB0cnVlO1xuICAgIHNldFZvbHVtZShldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VlayhldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIHdpbmRvdy52YWx1ZSA9IG1vdmVCYXIoZXZ0LCBwcm9ncmVzc0JhciwgJ2hvcml6b250YWwnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZWVraW5nRmFsc2UoKSB7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICBhdWRpby5jdXJyZW50VGltZSA9IGF1ZGlvLmR1cmF0aW9uICogKHdpbmRvdy52YWx1ZSAvIDEwMCk7XG4gICAgICBwcm9ncmVzc0Jhci5jbGFzc0xpc3QucmVtb3ZlKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICB9XG4gICAgc2Vla2luZyA9IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZvbHVtZShldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcbiAgICBpZihzZWVraW5nVm9sICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlIHx8IGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICB2YXIgdmFsdWUgPSBtb3ZlQmFyKGV2dCwgdm9sdW1lQmFyLnBhcmVudE5vZGUsICd2ZXJ0aWNhbCcpIC8gMTAwO1xuICAgICAgaWYodmFsdWUgPD0gMCkge1xuICAgICAgICBhdWRpby52b2x1bWUgPSAwO1xuICAgICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZihhdWRpby5tdXRlZCkgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gdmFsdWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnkodGl0bGUsIGF0dHIpIHtcbiAgICBpZighc2V0dGluZ3Mubm90aWZpY2F0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKHdpbmRvdy5Ob3RpZmljYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhdHRyLnRhZyA9ICdBUCBtdXNpYyBwbGF5ZXInO1xuICAgIHdpbmRvdy5Ob3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oZnVuY3Rpb24oYWNjZXNzKSB7XG4gICAgICBpZihhY2Nlc3MgPT09ICdncmFudGVkJykge1xuICAgICAgICB2YXIgbm90aWNlID0gbmV3IE5vdGlmaWNhdGlvbih0aXRsZS5zdWJzdHIoMCwgMTEwKSwgYXR0cik7XG4gICAgICAgIHNldFRpbWVvdXQobm90aWNlLmNsb3NlLmJpbmQobm90aWNlKSwgNTAwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuLyogRGVzdHJveSBtZXRob2QuIENsZWFyIEFsbCAqL1xuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGlmKCFhcEFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcGxheUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcbiAgICBwbEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIC8vIFBsYXlsaXN0XG4gICAgcGwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIHBsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGwpO1xuXG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhcEFjdGl2ZSA9IGZhbHNlO1xuICAgIGluZGV4ID0gMDtcblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tIGIgICAgICAgIHV0ZWQnKTtcbiAgICBwbEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG5cbiAgICAvLyBSZW1vdmUgcGxheWVyIGZyb20gdGhlIERPTSBpZiBuZWNlc3NhcnlcbiAgICAvLyBwbGF5ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbGF5ZXIpO1xuICB9XG5cblxuLyoqXG4gKiAgSGVscGVyc1xuICovXG4gIGZ1bmN0aW9uIHdoZWVsKCkge1xuICAgIHZhciB3aGVlbDtcbiAgICBpZiAoJ29ud2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICd3aGVlbCc7XG4gICAgfSBlbHNlIGlmICgnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnbW91c2V3aGVlbCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZWVsID0gJ01vek1vdXNlUGl4ZWxTY3JvbGwnO1xuICAgIH1cbiAgICByZXR1cm4gd2hlZWw7XG4gIH1cblxuICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICBmb3IodmFyIG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgaWYoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlKGVsLCBhdHRyKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKTtcbiAgICBpZihhdHRyKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZihlbGVtZW50W25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlbGVtZW50W25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIEVsZW1lbnQucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgc2Nyb2xsTGVmdCA9IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCxcbiAgICBzY3JvbGxUb3AgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3A6IGVsLnRvcCArIHNjcm9sbFRvcCxcbiAgICAgIGxlZnQ6IGVsLmxlZnQgKyBzY3JvbGxMZWZ0XG4gICAgfTtcbiAgfTtcblxuICBFbGVtZW50LnByb3RvdHlwZS5jc3MgPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgaWYodHlwZW9mIGF0dHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLCAnJylbYXR0cl07XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIGF0dHIgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZih0aGlzLnN0eWxlW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLnN0eWxlW25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBtYXRjaGVzIHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyA9IEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSAobm9kZS5wYXJlbnROb2RlIHx8IG5vZGUuZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKG5vZGVzWysraV0gJiYgbm9kZXNbaV0gIT0gbm9kZSk7XG4gICAgICAgICAgcmV0dXJuICEhbm9kZXNbaV07XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAvLyBjbG9zZXN0IHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCA9IEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgZWwgPSB0aGlzO1xuICAgICAgICAgIHdoaWxlIChlbC5tYXRjaGVzICYmICFlbC5tYXRjaGVzKHNlbGVjdG9yKSkgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHJldHVybiBlbC5tYXRjaGVzID8gZWwgOiBudWxsO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbi8qKlxuICogIFB1YmxpYyBtZXRob2RzXG4gKi9cbiAgcmV0dXJuIHtcbiAgICBpbml0OiBpbml0LFxuICAgIHVwZGF0ZTogdXBkYXRlUEwsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG59KSgpO1xuXG53aW5kb3cuQVAgPSBBdWRpb1BsYXllcjtcblxufSkod2luZG93KTtcblxuLy8gVEVTVDogaW1hZ2UgZm9yIHdlYiBub3RpZmljYXRpb25zXG52YXIgaWNvbkltYWdlID0gJ2h0dHA6Ly9mdW5reWltZy5jb20vaS8yMXBYNS5wbmcnO1xuXG5BUC5pbml0KHtcbiAgcGxheUxpc3Q6IFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdUaGUgQmVzdCBvZiBCYWNoJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0RyZWFtZXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF1cbn0pO1xuXG4vLyBURVNUOiB1cGRhdGUgcGxheWxpc3Rcbi8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZFNvbmdzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4vLyAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBBUC51cGRhdGUoW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ31cbiAgXSk7XG4vL30pXG5cbiIsIihmdW5jdGlvbigkLCB1bmRlZmluZWQpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgICQuZW1iZWRwbGF5ZXIgPSB7XG4gICAgICAgIG1vZHVsZXM6IFtdLFxuICAgICAgICBtb2R1bGVzX2J5X29yaWdpbjoge30sXG4gICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICBtYXRjaGVzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHsgY2FsbGJhY2soKTsgfSxcbiAgICAgICAgICAgIHBsYXk6IGZ1bmN0aW9uKGRhdGEpIHt9LFxuICAgICAgICAgICAgcGF1c2U6IGZ1bmN0aW9uKGRhdGEpIHt9LFxuICAgICAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdGUgPT09IFwicGxheWluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLnBhdXNlLmNhbGwodGhpcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLm1vZHVsZS5wbGF5LmNhbGwodGhpcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RvcDogZnVuY3Rpb24oZGF0YSkgeyBkYXRhLm1vZHVsZS5wYXVzZShkYXRhKTsgfSxcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKGRhdGEpIHt9LFxuICAgICAgICAgICAgcHJldjogZnVuY3Rpb24oZGF0YSkge30sXG4gICAgICAgICAgICBsaXN0ZW46IGZ1bmN0aW9uKGRhdGEsIGV2ZW50cykge30sXG4gICAgICAgICAgICB2b2x1bWU6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7IGNhbGxiYWNrKE5hTik7IH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHsgY2FsbGJhY2soTmFOKTsgfSxcbiAgICAgICAgICAgIGN1cnJlbnR0aW1lOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykgeyBjYWxsYmFjayhOYU4pOyB9LFxuICAgICAgICAgICAgc2V0Vm9sdW1lOiBmdW5jdGlvbihkYXRhLCB2b2x1bWUpIHt9LFxuICAgICAgICAgICAgc2VlazogZnVuY3Rpb24oZGF0YSwgcG9zaXRpb24pIHt9LFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgICAgICAgIHBhcnNlTWVzc2FnZTogZnVuY3Rpb24oZXZlbnQpIHt9LFxuICAgICAgICAgICAgcHJvY2Vzc01lc3NhZ2U6IGZ1bmN0aW9uKGRhdGEsIG1lc3NhZ2UsIHRyaWdnZXIpIHt9LFxuICAgICAgICAgICAgb3JpZ2luOiBbXVxuICAgICAgICB9LFxuICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24obW9kdWxlKSB7XG4gICAgICAgICAgICBtb2R1bGUgPSBtYWtlX21vZHVsZShtb2R1bGUpO1xuICAgICAgICAgICAgJC5lbWJlZHBsYXllci5tb2R1bGVzLnB1c2gobW9kdWxlKTtcbiAgICAgICAgICAgIGZvciAodmFyIG9yaWdpbiBpbiBtb2R1bGUub3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbiBpbiAkLmVtYmVkcGxheWVyLm1vZHVsZXNfYnlfb3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhbHJlYWR5IGhhdmUgZW1iZWRwbGF5ZXIgbW9kdWxlIGZvciBvcmlnaW46IFwiICsgb3JpZ2luKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJC5lbWJlZHBsYXllci5tb2R1bGVzX2J5X29yaWdpbltvcmlnaW5dID0gbW9kdWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcmlnaW46IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICAgICAgaWYgKC9eXFwvXFwvLy50ZXN0KHVybCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB1cmwuc3BsaXQoXCIvXCIpWzJdO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgvXlstX2EtejAtOV0rOi9pLnRlc3QodXJsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAvXihbLV9hLXowLTldKzooPzpcXC9cXC8pP1teXFwvXSopL2kuZXhlYyh1cmwpWzFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGFyc2VQYXJhbXM6IGZ1bmN0aW9uKHNlYXJjaCkge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgaWYgKHNlYXJjaCkge1xuICAgICAgICAgICAgICAgIHNlYXJjaCA9IHNlYXJjaC5zcGxpdChcIiZcIik7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWFyY2gubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtID0gc2VhcmNoW2ldLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW2RlY29kZVVSSUNvbXBvbmVudChwYXJhbVswXSldID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtLnNsaWNlKDEpLmpvaW4oXCI9XCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICB9LFxuICAgICAgICB0cmlnZ2VyOiBmdW5jdGlvbihzZWxmLCBkYXRhLCB0eXBlLCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGUgPSBudWxsO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwidGltZXVwZGF0ZVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJ2b2x1bWVjaGFuZ2VcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiZHVyYXRpb25jaGFuZ2VcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiZXJyb3JcIjpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwicmVhZHlcIjpcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBcInJlYWR5XCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBcInBsYXlcIjpcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBcInBsYXlpbmdcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwicGF1c2VcIjpcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBcInBhdXNlZFwiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgXCJmaW5pc2hcIjpcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBcImZpbmlzaGVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBcImJ1ZmZlcmluZ1wiOlxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFwiYnVmZmVyaW5nXCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUgPT09IGRhdGEuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRhdGEubGlzdGVuaW5nW3R5cGVdID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdmFyICRzZWxmID0gJChzZWxmKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUpICRzZWxmLnRyaWdnZXIoJC5FdmVudCgnZW1iZWRwbGF5ZXI6c3RhdGVjaGFuZ2UnLCB7IHN0YXRlOiBzdGF0ZSB9KSk7XG4gICAgICAgICAgICAgICAgJHNlbGYudHJpZ2dlcigkLkV2ZW50KCdlbWJlZHBsYXllcjonICsgdHlwZSwgcHJvcGVydGllcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHBsYXlUb2dnbGUoKSB7XG4gICAgICAgIGlmICh0cnVlKSB7XG4gICAgICAgICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlX21vZHVsZShtb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlID0gJC5leHRlbmQoe30sICQuZW1iZWRwbGF5ZXIuZGVmYXVsdHMsIG1vZHVsZSk7XG4gICAgICAgIHZhciBvcmlnaW5zID0ge307XG4gICAgICAgIGlmIChtb2R1bGUub3JpZ2luKSB7XG4gICAgICAgICAgICBpZiAoISQuaXNBcnJheShtb2R1bGUub3JpZ2luKSkge1xuICAgICAgICAgICAgICAgIG1vZHVsZS5vcmlnaW4gPSBbbW9kdWxlLm9yaWdpbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vZHVsZS5vcmlnaW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3JpZ2luID0gbW9kdWxlLm9yaWdpbltpXTtcbiAgICAgICAgICAgICAgICBpZiAoL15cXC9cXC8vLnRlc3Qob3JpZ2luKSkge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5zW2xvY2F0aW9uLnByb3RvY29sICsgb3JpZ2luXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luc1tvcmlnaW5dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbW9kdWxlLm9yaWdpbiA9IG9yaWdpbnM7XG4gICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdChzZWxmLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBkYXRhID0gJC5kYXRhKHNlbGYsICdlbWJlZHBsYXllcicpO1xuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgIHZhciBtb2R1bGUgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIG1vZHVsZSA9IG1ha2VfbW9kdWxlKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG9yaWdpbiBpbiBtb2R1bGUub3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW4gaW4gJC5lbWJlZHBsYXllci5tb2R1bGVzX2J5X29yaWdpbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFscmVhZHkgaGF2ZSBlbWJlZHBsYXllciBtb2R1bGUgZm9yIG9yaWdpbjogXCIgKyBvcmlnaW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICQuZW1iZWRwbGF5ZXIubW9kdWxlc19ieV9vcmlnaW5bb3JpZ2luXSA9IG1vZHVsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgJC5lbWJlZHBsYXllci5tb2R1bGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYW5kaWRhdGUgPSAkLmVtYmVkcGxheWVyLm1vZHVsZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUubWF0Y2hlcy5jYWxsKHNlbGYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUgPSBjYW5kaWRhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFtb2R1bGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwidW5zdXBwb3J0ZWQgZW1iZWRcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlOiBtb2R1bGUsXG4gICAgICAgICAgICAgICAgc3RhdGU6ICdpbml0JyxcbiAgICAgICAgICAgICAgICBsaXN0ZW5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVhZHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcGF1c2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBmaW5pc2g6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBidWZmZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0aW1ldXBkYXRlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdm9sdW1lY2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25jaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRldGFpbDoge31cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICQuZGF0YShzZWxmLCAnZW1iZWRwbGF5ZXInLCBkYXRhKTtcblxuICAgICAgICAgICAgdmFyIG9rID0gZmFsc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1vZHVsZS5pbml0LmNhbGwoc2VsZiwgZGF0YSwgZnVuY3Rpb24ocGxheWVyX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucGxheWVyX2lkID0gcGxheWVyX2lkO1xuICAgICAgICAgICAgICAgICAgICAkLmF0dHIoc2VsZiwgJ2RhdGEtZW1iZWRwbGF5ZXItaWQnLCBwbGF5ZXJfaWQgPT09IHVuZGVmaW5lZCA/ICcnIDogcGxheWVyX2lkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBvayA9IHRydWU7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGlmICghb2spIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gaXQgbGlrZSB0aGF0IGJlY2F1c2UgY2F0Y2ggYW5kIHJlLXRocm93XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZXMgdGhlIHN0YWNrIHRyYWNlIGluIHNvbWUgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAgICAgJC5yZW1vdmVEYXRhKHNlbGYsICdlbWJlZHBsYXllcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICAkLmZuLmVtYmVkcGxheWVyID0gZnVuY3Rpb24oY29tbWFuZCwgb3B0aW9ucykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29tbWFuZCA9IFwiaW5pdFwiO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYgdHlwZW9mKGNvbW1hbmQpID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gY29tbWFuZDtcbiAgICAgICAgICAgIGNvbW1hbmQgPSBcImluaXRcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSBcImluaXRcIjpcbiAgICAgICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7IGluaXQodGhpcywgb3B0aW9ucyk7IH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwicGxheVwiOlxuICAgICAgICAgICAgY2FzZSBcInBhdXNlXCI6XG4gICAgICAgICAgICBjYXNlIFwic3RvcFwiOlxuICAgICAgICAgICAgY2FzZSBcInRvZ2dsZVwiOlxuICAgICAgICAgICAgY2FzZSBcIm5leHRcIjpcbiAgICAgICAgICAgIGNhc2UgXCJwcmV2XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlW2NvbW1hbmRdLmNhbGwodGhpcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzZWVrXCI6XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gTnVtYmVyKGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLnNlZWsuY2FsbCh0aGlzLCBkYXRhLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJsaXN0ZW5cIjpcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRzID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgP1xuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbMV0gOiBbXCJyZWFkeVwiLCBcInBsYXlcIiwgXCJwYXVzZVwiLCBcImZpbmlzaFwiLCBcImJ1ZmZlcmluZ1wiLCBcInRpbWV1cGRhdGVcIiwgXCJ2b2x1bWVjaGFuZ2VcIiwgXCJkdXJhdGlvbmNoYW5nZVwiLCBcImVycm9yXCJdO1xuICAgICAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGV2ZW50cykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzID0gJC50cmltKGV2ZW50cykuc3BsaXQoL1xccysvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLmxpc3Rlbi5jYWxsKHRoaXMsIGRhdGEsIGV2ZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmxpc3RlbmluZ1tldmVudHNbaV1dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwidm9sdW1lXCI6XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZihhcmd1bWVudHNbMV0pICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZvbHVtZSA9IE51bWJlcihhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1vZHVsZS5zZXRWb2x1bWUuY2FsbCh0aGlzLCBkYXRhLCB2b2x1bWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIChhcmd1bWVudHNbMV0gfHwgJC5ub29wKShOYU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubW9kdWxlLnZvbHVtZS5jYWxsKHRoaXNbMF0sIGRhdGEsIGFyZ3VtZW50c1sxXSB8fCAkLm5vb3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImR1cmF0aW9uXCI6XG4gICAgICAgICAgICBjYXNlIFwiY3VycmVudHRpbWVcIjpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgKGFyZ3VtZW50c1sxXSB8fCAkLm5vb3ApKE5hTik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBpbml0KHRoaXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tb2R1bGVbY29tbWFuZF0uY2FsbCh0aGlzWzBdLCBkYXRhLCBhcmd1bWVudHNbMV0gfHwgJC5ub29wKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJsaW5rXCI6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubW9kdWxlLmxpbmsuY2FsbCh0aGlzWzBdLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJzdXBwb3J0ZWRcIjpcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgJC5lbWJlZHBsYXllci5tb2R1bGVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FuZGlkYXRlID0gJC5lbWJlZHBsYXllci5tb2R1bGVzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZS5tYXRjaGVzLmNhbGwoc2VsZikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBwb3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoID4gMDtcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwidW5rbm93biBjb21tYW5kOiBcIiArIGNvbW1hbmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgbW9kdWxlID0gJC5lbWJlZHBsYXllci5tb2R1bGVzX2J5X29yaWdpbltldmVudC5vcmlnaW5dO1xuICAgICAgICBpZiAobW9kdWxlKSB7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1vZHVsZS5wYXJzZU1lc3NhZ2UoZXZlbnQpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWZyYW1lcyA9ICdwbGF5ZXJfaWQnIGluIG1lc3NhZ2UgP1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpZnJhbWVbZGF0YS1lbWJlZHBsYXllci1pZD1cIicgKyBtZXNzYWdlLnBsYXllcl9pZCArICdcIl0nKSA6XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpZnJhbWUnKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlmcmFtZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlmcmFtZSA9IGlmcmFtZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpZnJhbWUuY29udGVudFdpbmRvdyA9PT0gZXZlbnQuc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQoaWZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLnByb2Nlc3NNZXNzYWdlLmNhbGwoaWZyYW1lLCBkYXRhLCBtZXNzYWdlLCAkLmVtYmVkcGxheWVyLnRyaWdnZXIuYmluZCgkLmVtYmVkcGxheWVyLCBpZnJhbWUsIGRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSwgZmFsc2UpO1xufSkoalF1ZXJ5KTsiLCIvKiAyMDE3LiAwMy4gXG4qL1xuXG5cbi8qID09PT09PT0gUmVzcG9uc2l2ZSBXZWIgPT09PT09PSAqL1xuY29uc3QgaFBYID0ge1xuICAgIGhlYWRlcjogNTAsXG4gICAgYXVkaW9QbGF5ZXIgOiA4MCxcbiAgICBpbnB1dEJveCA6IDQ1XG59XG5cbmNvbnN0IHJlc2l6ZU1haW5IZWlnaHQgPSBmdW5jdGlvbigpe1xuICB1dGlsLiQoXCIjbWFpblwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyICsncHgnO1xuICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyIC0gaFBYLmlucHV0Qm94ICsgJ3B4Jztcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsZnVuY3Rpb24oKXtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VhcmNoTGlzdFZpZXcuY2FsbFNlYXJjaEFQSSgpO1xuICAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbn0pO1xuXG5cbi8qID09PT09PT0gVXRpbGl0eSA9PT09PT09ICovXG52YXIgdXRpbCA9IHtcbiAgICBydW5BamF4IDogZnVuY3Rpb24odXJsLCBsaXN0ZW5lciwgcmVxRnVuYyl7XG4gICAgICAgIGxldCBvUmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIG9SZXEuYWRkRXZlbnRMaXN0ZW5lcihsaXN0ZW5lciwgcmVxRnVuYyk7XG4gICAgICAgIG9SZXEub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgICAgICBvUmVxLnNlbmQoKTtcbiAgICB9LFxuICAgICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgICQkOiBmdW5jdGlvbihzZWxlY3Rvcil7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgIHRpbWVBZ286IGZ1bmN0aW9uKHNlbGVjdG9yKXtcblxuICAgIHZhciB0ZW1wbGF0ZXMgPSB7XG4gICAgICAgIHByZWZpeDogXCJcIixcbiAgICAgICAgc3VmZml4OiBcIiBhZ29cIixcbiAgICAgICAgc2Vjb25kczogXCJsZXNzIHRoYW4gYSBtaW51dGVcIixcbiAgICAgICAgbWludXRlOiBcImFib3V0IGEgbWludXRlXCIsXG4gICAgICAgIG1pbnV0ZXM6IFwiJWQgbWludXRlc1wiLFxuICAgICAgICBob3VyOiBcImFib3V0IGFuIGhvdXJcIixcbiAgICAgICAgaG91cnM6IFwiYWJvdXQgJWQgaG91cnNcIixcbiAgICAgICAgZGF5OiBcImEgZGF5XCIsXG4gICAgICAgIGRheXM6IFwiJWQgZGF5c1wiLFxuICAgICAgICBtb250aDogXCJhYm91dCBhIG1vbnRoXCIsXG4gICAgICAgIG1vbnRoczogXCIlZCBtb250aHNcIixcbiAgICAgICAgeWVhcjogXCJhYm91dCBhIHllYXJcIixcbiAgICAgICAgeWVhcnM6IFwiJWQgeWVhcnNcIlxuICAgIH07XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24odCwgbikge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGVzW3RdICYmIHRlbXBsYXRlc1t0XS5yZXBsYWNlKC8lZC9pLCBNYXRoLmFicyhNYXRoLnJvdW5kKG4pKSk7XG4gICAgfTtcblxuICAgIHZhciB0aW1lciA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgICAgICAgaWYgKCF0aW1lKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aW1lID0gdGltZS5yZXBsYWNlKC9cXC5cXGQrLywgXCJcIik7IC8vIHJlbW92ZSBtaWxsaXNlY29uZHNcbiAgICAgICAgdGltZSA9IHRpbWUucmVwbGFjZSgvLS8sIFwiL1wiKS5yZXBsYWNlKC8tLywgXCIvXCIpO1xuICAgICAgICB0aW1lID0gdGltZS5yZXBsYWNlKC9ULywgXCIgXCIpLnJlcGxhY2UoL1ovLCBcIiBVVENcIik7XG4gICAgICAgIHRpbWUgPSB0aW1lLnJlcGxhY2UoLyhbXFwrXFwtXVxcZFxcZClcXDo/KFxcZFxcZCkvLCBcIiAkMSQyXCIpOyAvLyAtMDQ6MDAgLT4gLTA0MDBcbiAgICAgICAgdGltZSA9IG5ldyBEYXRlKHRpbWUgKiAxMDAwIHx8IHRpbWUpO1xuXG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB2YXIgc2Vjb25kcyA9ICgobm93LmdldFRpbWUoKSAtIHRpbWUpICogLjAwMSkgPj4gMDtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBzZWNvbmRzIC8gNjA7XG4gICAgICAgIHZhciBob3VycyA9IG1pbnV0ZXMgLyA2MDtcbiAgICAgICAgdmFyIGRheXMgPSBob3VycyAvIDI0O1xuICAgICAgICB2YXIgeWVhcnMgPSBkYXlzIC8gMzY1O1xuXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZXMucHJlZml4ICsgKFxuICAgICAgICAgICAgICAgIHNlY29uZHMgPCA0NSAmJiB0ZW1wbGF0ZSgnc2Vjb25kcycsIHNlY29uZHMpIHx8XG4gICAgICAgICAgICAgICAgc2Vjb25kcyA8IDkwICYmIHRlbXBsYXRlKCdtaW51dGUnLCAxKSB8fFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPCA0NSAmJiB0ZW1wbGF0ZSgnbWludXRlcycsIG1pbnV0ZXMpIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA8IDkwICYmIHRlbXBsYXRlKCdob3VyJywgMSkgfHxcbiAgICAgICAgICAgICAgICBob3VycyA8IDI0ICYmIHRlbXBsYXRlKCdob3VycycsIGhvdXJzKSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzIDwgNDIgJiYgdGVtcGxhdGUoJ2RheScsIDEpIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8IDMwICYmIHRlbXBsYXRlKCdkYXlzJywgZGF5cykgfHxcbiAgICAgICAgICAgICAgICBkYXlzIDwgNDUgJiYgdGVtcGxhdGUoJ21vbnRoJywgMSkgfHxcbiAgICAgICAgICAgICAgICBkYXlzIDwgMzY1ICYmIHRlbXBsYXRlKCdtb250aHMnLCBkYXlzIC8gMzApIHx8XG4gICAgICAgICAgICAgICAgeWVhcnMgPCAxLjUgJiYgdGVtcGxhdGUoJ3llYXInLCAxKSB8fFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlKCd5ZWFycycsIHllYXJzKVxuICAgICAgICAgICAgICAgICkgKyB0ZW1wbGF0ZXMuc3VmZml4O1xuICAgIH07XG5cbiAgICB2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudmlkZW9UaW1lQWdvJyk7XG4gICAgZm9yICh2YXIgaSBpbiBlbGVtZW50cykge1xuICAgICAgICB2YXIgJHRoaXMgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgaWYgKHR5cGVvZiAkdGhpcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICR0aGlzLmlubmVySFRNTCA9IHRpbWVyKCR0aGlzLmdldEF0dHJpYnV0ZSgndGl0bGUnKSB8fCAkdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGV0aW1lJykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIH1cbn1cblxuXG4vKiA9PT09PT09IFlvdXR1YmUgQVBJIFNldHRpbmcgPT09PT09PSAqL1xuY29uc3Qgc2V0VGFyZ2V0VVJMID0gZnVuY3Rpb24oa2V5d29yZCwgc0dldFRva2VuKXtcbiAgICBcbiAgICBjb25zdCBiYXNlVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCYnO1xuICAgIHZhciBzZXR0aW5nID0ge1xuICAgICAgICBvcmRlcjogJ3ZpZXdDb3VudCcsXG4gICAgICAgIG1heFJlc3VsdHM6IDE1LFxuICAgICAgICB0eXBlOiAndmlkZW8nLFxuICAgICAgICBxOiBrZXl3b3JkLFxuICAgICAgICBrZXk6ICdBSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWcnXG4gICAgfVxuIFxuICAgIGxldCBzVGFyZ2V0VVJMID0gT2JqZWN0LmtleXMoc2V0dGluZykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdba10pO1xuICAgIH0pLmpvaW4oJyYnKVxuICAgIFxuICAgIHNUYXJnZXRVUkwgPSBiYXNlVVJMICsgc1RhcmdldFVSTDtcbiAgICBcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVUkwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cbiAgICByZXR1cm4gc1RhcmdldFVSTDtcbn1cblxuXG4vKiA9PT09PT09IE1vZGVsID09PT09PT0gKi9cbmNvbnN0IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hbGxWaWRlb3MgPSBqc29uOyAvL+yymOydjCDroZzrlKnrkKDrloQg66qo65OgIOuNsOydtO2EsOulvCDqsIDsoLjsmLXri4jri6QuXG4gICAgfSxcbiAgICBzZWxlY3RlZFZpZGVvSUQ6IG51bGwsIC8v7ISg7YOd7ZWcIOqwklxuICAgIG5leHRQYWdlVG9rZW5OdW1lcjogbnVsbCAvL+uLpOydjCDtjpjsnbTsp4Ag7Yag7YGwIOqwkjtcbn07XG5cbmNvbnN0IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgc2VhcmNoTGlzdFZpZXcuaW5pdCgpO1xuICAgIH0sXG4gICAgZ2V0QWxsVmlkZW9zOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5hbGxWaWRlb3MuaXRlbXM7XG4gICAgfSxcbiAgICBnZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5uZXh0UGFnZVRva2VuTnVtZXI7XG4gICAgfSxcbiAgICBzZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0Lm5leHRQYWdlVG9rZW5OdW1lciA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuYWxsVmlkZW9zLm5leHRQYWdlVG9rZW47XG4gICAgfSxcbiAgICBnZXRTZWxlY3RlZFZpZGVvSUQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LnNlbGVjdGVkVmlkZW9JRFxuICAgIH0sXG4gICAgc2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oaWQpe1xuICAgICAgICBpZCA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuc2VsZWN0ZWRWaWRlb0lEXG4gICAgfVxufVxuXG5jb25zdCBzZWFyY2hMaXN0VmlldyA9IHtcbiAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgdGhpcy5jb250ZW50ID0gdXRpbC4kKFwiLnNlYXJjaExpc3RcIik7XG4gICAgICAgdGhpcy50ZW1wbGF0ZSA9IHV0aWwuJChcIiNzZWFyY2hWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICB0aGlzLnNob3dQcmV2aWV3KCk7XG4gICAgXG4gICB9LFxuICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgIHZpZGVvcyA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0QWxsVmlkZW9zKCk7XG4gICAgICAgbGV0IHNIVE1MID0gJyc7XG4gICAgICAgZm9yIChsZXQgaT0wOyBpIDwgdmlkZW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgIGxldCB2aWRlb0ltYWdlVXJsID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmw7XG4gICAgICAgICAgIGxldCB2aWRlb1RpdGxlID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRpdGxlO1xuICAgICAgICAgICBsZXQgcHVibGlzaGVkQXQgPSB2aWRlb3NbaV0uc25pcHBldC5wdWJsaXNoZWRBdDtcbiAgICAgICAgICAgbGV0IHZpZGVvSWQgPSB2aWRlb3NbaV0uaWQudmlkZW9JZFxuICAgICAgICAgICBzRG9tID0gdGhpcy50ZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIHZpZGVvSW1hZ2VVcmwpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIHZpZGVvVGl0bGUpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3RpbWV9XCIsIHB1Ymxpc2hlZEF0KVxuICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1B1Ymxpc2hlZEF0fVwiLCBwdWJsaXNoZWRBdClcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9JZH1cIiwgdmlkZW9JZCk7XG4gICAgICAgICAgICBzSFRNTCA9IHNIVE1MICsgc0RvbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRlbnQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBzSFRNTCk7XG4gICAgfSxcbiAgICBcbiAgICBjYWxsU2VhcmNoQVBJOiBmdW5jdGlvbigpe1xuICAgICAgICB1dGlsLiQoXCIuZ29TZWFyY2hcIikuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoS2V5d29yZCA9IHV0aWwuJChcIiNzZWFyY2hfYm94XCIpLnZhbHVlO1xuICAgICAgICAgICAgc1VybCA9IHNldFRhcmdldFVSTCh0aGlzLnNlYXJjaEtleXdvcmQpO1xuICAgICAgICAgICAgdXRpbC5ydW5BamF4KHNVcmwsIFwibG9hZFwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGpzb24gPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmluaXQoKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmluaXQoKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLnNldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBzZWFyY2hMaXN0Vmlldy5tb3JlUmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgdXRpbC50aW1lQWdvKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIG1vcmVSZXN1bHQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2VhcmNoS2V5d29yZCA9IHV0aWwuJChcIiNzZWFyY2hfYm94XCIpLnZhbHVlO1xuICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIswqBmdW5jdGlvbigpe1xuwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgaWYodGhpcy5zY3JvbGxIZWlnaHTCoC3CoHRoaXMuc2Nyb2xsVG9wwqA9PT3CoHRoaXMuY2xpZW50SGVpZ2h0KcKge1xuICAgICAgICAgICAgICAgIG5leHRQYWdlVG9rID0gdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5nZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgc1VybCA9IHNldFRhcmdldFVSTCh0aGlzLnNlYXJjaEtleXdvcmQsIG5leHRQYWdlVG9rKTtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoCB1dGlsLnJ1bkFqYXgoc1VybCzCoFwibG9hZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGpzb24gPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWwudGltZUFnbygpO1xuICAgICAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLnNldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoH1cbsKgwqDCoMKgwqDCoMKgwqB9KTsgIFxuICAgIH0sXG4gICAgc2hvd1ByZXZpZXc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICB0YXJnZXQgPSBldnQudGFyZ2V0O1xuICAgICAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lID09PSAnSScpe1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIChjb25zb2xlLmxvZyh0YXJnZXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXQudGFnTmFtZSAhPT0gXCJCVVRUT05cIil7IFxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHV0aWwuJChcIi52aWRlb0luZm9cIik7IFxuICAgICAgICAgICAgICAgIHV0aWwuJChcIi5wcmV2aWV3TW9kYWxcIikuZGF0YXNldC5pZCA9ICcnO1xuICAgICAgICAgICAgICAgIHV0aWwuJChcIi5wcmV2aWV3TW9kYWxcIikuY2xhc3NMaXN0LnJlbW92ZShcImhpZGVcIik7XG4gICAgICAgICAgICAgICAgc0RvbSA9IHV0aWwuJChcIiNwcmV2aWV3VmlkZW9cIikuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgIHNIVE1MID0gc0RvbS5yZXBsYWNlKFwie2RhdGEtaWR9XCIsIHRhcmdldC5kYXRhc2V0LmlkKTtcbiAgICAgICAgICAgICAgICB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmlubmVySFRNTCA9IHNIVE1MO1xuICAgICAgICAgICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmNsYXNzTGlzdC5hZGQoXCJtb2RhbC1vcGVuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZVByZXZpZXcoKTtcbiAgICAgICAgICAgICAgICB9KS5jYWxsKHNlYXJjaExpc3RWaWV3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRhcmdldCk7XG4gICAgICAgICAgICAvLyBlbGVtID0gIGVsZW0uY2xvc2VzdChcIi52aWRlb0luZm9cIik7ICBcbiAgICAgICAgICAgIC8vIChjb25zb2xlLmxvZyhlbGVtKSk7ICAgICAgXG4gICAgICAgICAgICAvLyBpZiAoIWVsZW0pIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfSxcbiAgICBoaWRlUHJldmlldzogZnVuY3Rpb24oKXtcbiAgICAgICAgdXRpbC4kKFwiLmNsb3NlX2J0blwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgbGV0IGJ1dHRvbiA9ICBldnQudGFyZ2V0LmNsb3Nlc3QoXCJidXR0b25cIik7XG4gICAgICAgICAgICB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmNsYXNzTGlzdC5hZGQoXCJoaWRlXCIpO1xuICAgICAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuY2xhc3NMaXN0LnJlbW92ZShcIm1vZGFsLW9wZW5cIik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG5cbn1cbiAiLCIvLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgbmFtZVNwYWNlID0ge307XG5uYW1lU3BhY2UuJGdldHZhbCA9ICcnO1xubmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTtcbm5hbWVTcGFjZS5wbGF5TGlzdCA9IFtdO1xubmFtZVNwYWNlLmpkYXRhID0gW107XG5uYW1lU3BhY2UuYWxidW1TdG9yYWdlID0gbG9jYWxTdG9yYWdlO1xuLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgU1RBUlQgLy8vLy8vLy8vLy8vXG4vL2Z1bmN0aW9uYWxpdHkxIDogbmF2aWdhdGlvbiBjb250cm9sXG52YXIgbmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9nZXQgZWFjaCBidG4gaW4gbmF2IHdpdGggZG9tIGRlbGVnYXRpb24gd2l0aCBqcXVlcnkgYW5kIGV2ZW50IHByb3BhZ2F0aW9uXG4gICAgJChcIi5uYXZfcGFyZW50XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvL2J1YmJsaW5nIHByZXZlbnRcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9ICQodGhpcykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc29sZS5sb2coY2xhc3NOYW1lKTtcbiAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBcImFsYnVtX2J0blwiKSB7XG4gICAgICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuaGlkZSgpOyAvL+qygOyDiSDqsrDqs7wgQ2xlYXJcbiAgICAgICAgICAgICQoXCIuYWRkTmV3TWVkaWFcIikuaGlkZSgpOyAvL+qygOyDiSDssL0gQ2xlYXJcbiAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gXCJwb3B1bGFyX2J0blwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBPUFVMQVIuLi4uLj9cIik7XG4gICAgICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuaGlkZSgpOyAvL+qygOyDiSDqsrDqs7wgQ2xlYXJcbiAgICAgICAgICAgICQoXCIuYWRkTmV3TWVkaWFcIikuaGlkZSgpOyAvL+qygOyDiSDssL0gQ2xlYXJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU0VBUkNIIEJUTiEhISFcIilcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5zaG93KCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5zaG93KCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9XG4gICAgfSk7XG59O1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgRU5EIC8vLy8vLy8vLy8vL1xuXG5uYXYoKTsgLy9uYXYg7Iuk7ZaJXG4vLy8vLy8vLy8vLy8vIFNFQVJDSCBBUEkgU1RBUlQgLy8vLy8vLy8vLy8vLy8vLy9cbnZhciBmbkdldExpc3QgPSBmdW5jdGlvbihzR2V0VG9rZW4pIHtcbiAgICBuYW1lU3BhY2UuJGdldHZhbCA9ICQoXCIjc2VhcmNoX2JveFwiKS52YWwoKTtcbiAgICBpZiAobmFtZVNwYWNlLiRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLqsoDsg4nslrTsnoXroKXrsJTrno3ri4jri6QuXCIpO1xuICAgICAgICAkKFwiI3NlYXJjaF9ib3hcIikuZm9jdXMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL0NsZWFuc2luZyBEb20sIFZpZGVvSWRcbiAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdOyAvL2dldHZpZGVvSWQgYXJyYXnstIjquLDtmZRcbiAgICAvLyAkKFwiLnNlYXJjaExpc3RcIikuZW1wdHkoKTsgLy/qsoDsg4kg6rKw6rO8IFZpZXfstIjquLDtmZRcbiAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuXG4gICAgLy9xdWVyeXNlY3Rpb24vL1xuICAgIC8vMTXqsJzslKlcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlJm1heFJlc3VsdHM9MTUmdHlwZT12aWRlb1wiICsgXCImcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChuYW1lU3BhY2UuJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG4gICAgaWYgKHNHZXRUb2tlbikge1xuICAgICAgICBzVGFyZ2V0VXJsICs9IFwiJnBhZ2VUb2tlbj1cIiArIHNHZXRUb2tlbjtcbiAgICAgICAgY29uc29sZS5sb2coc1RhcmdldFVybCk7XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIG5hbWVTcGFjZS5qZGF0YSA9IGpkYXRhOyAvL2pkYXRhLlxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWFyY2hSZXN1bHRWaWV3KCk7XG4gICAgICAgICAgICAkKGpkYXRhLml0ZW1zKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZC5wdXNoKGpkYXRhLml0ZW1zW2ldLmlkLnZpZGVvSWQpOyAvL25hbWVTcGFjZS5nZXR2aWRlb0lk7JeQIOqygOyDieuQnCB2aWRlb0lEIOuwsOyXtOuhnCDstpTqsIBcbiAgICAgICAgICAgIH0pLnByb21pc2UoKS5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5nZXR2aWRlb0lkWzBdKTtcbiAgICAgICAgICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmFwcGVuZChcIjxpZnJhbWUgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3JjPSdodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC9cIiArIG5hbWVTcGFjZS5nZXR2aWRlb0lkWzBdICsgXCInP3JlbD0wICYgZW5hYmxlanNhcGk9MSBmcmFtZWJvcmRlcj0wIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIik7XG4gICAgICAgICAgICAgICAgLy9wbGF5VmlkZW9TZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgaWYgKGpkYXRhLm5leHRQYWdlVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgIGdldE1vcmVTZWFyY2hSZXN1bHQoamRhdGEubmV4dFBhZ2VUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBFTkQgLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vL+yKpO2BrOuhpCDri6TsmrTsi5wg7ZWo7IiYIOyLpO2Wie2VmOq4sC5cbnZhciBnZXRNb3JlU2VhcmNoUmVzdWx0ID0gZnVuY3Rpb24obmV4dFBhZ2VUb2tlbil7XG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLnNjcm9sbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKCQodGhpcykuc2Nyb2xsVG9wKCkgKyAkKHRoaXMpLmlubmVySGVpZ2h0KCkgPj0gJCh0aGlzKVswXS5zY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICAgIGZuR2V0TGlzdChuZXh0UGFnZVRva2VuKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cblxuXG4gICAgXG4vLy8vLy8vLy8vLy8gU0VBUkNIIFJFU1VMVCBWSUVXIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIHNlYXJjaFJlc3VsdFZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VhcmNoUmVzdWx0TGlzdCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBnZXRUZW1wbGF0ZSA9ICQoJyNzZWFyY2hWaWRlbycpWzBdOyAvL3RlbXBsYXRlIHF1ZXJ5c2VsZWN0XG4gICAgICAgIHZhciBnZXRIdG1sVGVtcGxhdGUgPSBnZXRUZW1wbGF0ZS5pbm5lckhUTUw7IC8vZ2V0IGh0bWwgaW4gdGVtcGxhdGVcbiAgICAgICAgdmFyIGFkYXB0VGVtcGxhdGUgPSBnZXRIdG1sVGVtcGxhdGUucmVwbGFjZShcInt2aWRlb0ltYWdlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aHVtYm5haWxzLmRlZmF1bHQudXJsKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9UaXRsZX1cIiwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGl0bGUpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1ZpZXdzfVwiLCBcIlRCRFwiKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7aWR9XCIsIGkpO1xuICAgICAgICBzZWFyY2hSZXN1bHRMaXN0ID0gc2VhcmNoUmVzdWx0TGlzdCArIGFkYXB0VGVtcGxhdGU7XG4gICAgfVxuICAgICQoJy5zZWFyY2hMaXN0JykuZW1wdHkoKS5hcHBlbmQoc2VhcmNoUmVzdWx0TGlzdCk7XG59O1xuXG5cbi8vLy8vLy8vLy8vLyBTRUFSQ0ggUkVTVUxUIFZJRVcgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vIFBMQVkgU0VMRUNUIFZJREVPIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy9cbnZhciBwbGF5VmlkZW9TZWxlY3QgPSBmdW5jdGlvbigpIHtcbiAgICAkKFwiLnNlYXJjaExpc3RcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKCkgeyAvLyDqsoDsg4nrkJwgbGlzdCBjbGlja+2WiOydhOqyveyasC5cbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmFwcGVuZChcIjxpZnJhbWUgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3JjPSdodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC9cIiArIG5hbWVTcGFjZS5nZXR2aWRlb0lkW3RhZ0lkXSArIFwiJz9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgIH0pO1xufTtcbi8vLy8vLy8vIFBMQVkgU0VMRUNUIFZJREVPIEVORCAvLy8vLy8vLy8vLy8vLy8vXG5cbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gU1RBUlQgLy8vLy8vLy8vLy8vLy8vLy9cbnZhciBhZGRQbGF5TGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoVmlkZW8gbGkgYnV0dG9uXCIpLm9uKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFBQUFcIik7XG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgLy8gdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCQodGhpcykpO1xuICAgIH0pO1xufTtcbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gRU5EIC8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXG4vLyAvLyBMYXlvdXQg67OA6rK9XG4vLyB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJyxmdW5jdGlvbigpe1xuLy8gICByZXNpemVNYWluSGVpZ2h0KCk7XG4vLyB9KTtcblxuLy8gcmVzaXplTWFpbkhlaWdodCgpO1xuLy8gZnVuY3Rpb24gcmVzaXplTWFpbkhlaWdodCgpe1xuLy8gICB2YXIgaGVhZGVySGVpZ2h0ID0gNTA7XG4vLyAgIHZhciBhdWRpb1BsYXllckhlaWdodCA9IDgwO1xuLy8gICB2YXIgaW5wdXRCb3hIZWlnaHQgPSA0NTtcbi8vICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluXCIpLnN0eWxlLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWRlckhlaWdodCAtIGF1ZGlvUGxheWVySGVpZ2h0ICsncHgnO1xuLy8gICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNlYXJjaExpc3RcIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgLSBpbnB1dEJveEhlaWdodCArICdweCc7XG4vLyB9XG5cblxuXG4iLCIgICAgICAgIGZ1bmN0aW9uIGluaXRFbWJlZCgpIHtcbiAgICAgICAgICAgICQodGhpcykub24oJ2VtYmVkcGxheWVyOnN0YXRlY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAkKCcjc3RhdGUnKS50ZXh0KGV2ZW50LnN0YXRlKTtcbiAgICAgICAgICAgIH0pLm9uKCdlbWJlZHBsYXllcjplcnJvcicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBldmVudC5lcnJvciB8fCAnJztcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBcIiBcIiArIGV2ZW50LnRpdGxlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IFwiIFwiICsgZXZlbnQubWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgnI2Vycm9yJykudGV4dChtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pLm9uKCdlbWJlZHBsYXllcjpkdXJhdGlvbmNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRmluaXRlKGV2ZW50LmR1cmF0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjY3VycmVudHRpbWUnKS5zaG93KCkucHJvcCgnbWF4JywgZXZlbnQuZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNjdXJyZW50dGltZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgnI2R1cmF0aW9uJykudGV4dChldmVudC5kdXJhdGlvbi50b0ZpeGVkKDIpICsgJyBzZWNvbmRzJyk7XG4gICAgICAgICAgICB9KS5vbignZW1iZWRwbGF5ZXI6dGltZXVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgJCgnI2N1cnJlbnR0aW1lJykudmFsKGV2ZW50LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgICAgICAkKCcjY3VycmVudHRpbWUtdHh0JykudGV4dChldmVudC5jdXJyZW50VGltZS50b0ZpeGVkKDIpICsgJyBzZWNvbmRzJyk7XG4gICAgICAgICAgICB9KS5vbignZW1iZWRwbGF5ZXI6dm9sdW1lY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdm9sdW1lJykudmFsKGV2ZW50LnZvbHVtZSk7XG4gICAgICAgICAgICAgICAgJCgnI3ZvbHVtZS1sYWJlbCcpLnRleHQoXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnZvbHVtZSA8PSAwID8gJ/CflIcnIDpcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudm9sdW1lIDw9IDEgLyAzID8gJ/CflIgnIDpcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudm9sdW1lIDw9IDIgLyAzID8gJ/CflIknIDpcbiAgICAgICAgICAgICAgICAgICAgJ/CflIonXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAkKCcjdm9sdW1lLXR4dCcpLnRleHQoZXZlbnQudm9sdW1lLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgfSkub24oJ2VtYmVkcGxheWVyOnJlYWR5JywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9ICQodGhpcykuZW1iZWRwbGF5ZXIoJ2xpbmsnKTtcbiAgICAgICAgICAgICAgICBpZiAobGluaykge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGluaycpLmF0dHIoJ2hyZWYnLCBsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xpbmstd3JhcHBlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVtYmVkcGxheWVyKFwibGlzdGVuXCIpLlxuICAgICAgICAgICAgZW1iZWRwbGF5ZXIoJ3ZvbHVtZScsIGZ1bmN0aW9uKHZvbHVtZSkge1xuICAgICAgICAgICAgICAgICQoJyN2b2x1bWUnKS50ZXh0KHZvbHVtZS50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9hZFZpZGVvKHRhZywgdXJsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRycyA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd2aWRlbycsXG4gICAgICAgICAgICAgICAgICAgIHNyYzogdXJsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpZnJhbWUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuYWxsb3dmdWxsc2NyZWVuID0gJ2FsbG93ZnVsbHNjcmVlbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycy5mcmFtZWJvcmRlciA9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLndpZHRoID0gJzY0MCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycy5oZWlnaHQgPSAnMzYwJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZpZGVvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLndpZHRoID0gJzY0MCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycy5oZWlnaHQgPSAnMzYwJztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXVkaW8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuY29udHJvbHMgPSAnY29udHJvbHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMucHJlbG9hZCA9ICdhdXRvJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKCcjbGluay13cmFwcGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoJzwnICsgdGFnICsgJz4nKS5hdHRyKGF0dHJzKS5yZXBsYWNlQWxsKCcjdmlkZW8nKS5lYWNoKGluaXRFbWJlZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJCgnI2Vycm9yJykudGV4dChTdHJpbmcoZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZnVuY3Rpb24gdXBkYXRlVmlkZW8oKSB7XG4gICAgICAgIC8vICAgICB2YXIgdmFsdWUgPSAkKCcjZW1iZWQnKS52YWwoKS5zcGxpdCgnfCcpO1xuICAgICAgICAvLyAgICAgJCgnI2R1cmF0aW9uLCAjY3VycmVudHRpbWUsICN2b2x1bWUnKS50ZXh0KCc/Jyk7XG4gICAgICAgIC8vICAgICAkKCcjc3RhdGUnKS50ZXh0KCdsb2FkaW5nLi4uJyk7XG4gICAgICAgIC8vICAgICAkKCcjZXJyb3InKS50ZXh0KCcnKTtcbiAgICAgICAgLy8gICAgIGxvYWRWaWRlbyh2YWx1ZVswXSwgdmFsdWVbMV0pO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gJChkb2N1bWVudCkucmVhZHkodXBkYXRlVmlkZW8pOyIsIihmdW5jdGlvbigkLCB1bmRlZmluZWQpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBldmVudF9tYXAgPSB7XG4gICAgICAgIHJlYWR5OiBudWxsLFxuICAgICAgICBwbGF5OiBudWxsLFxuICAgICAgICBwYXVzZTogbnVsbCxcbiAgICAgICAgZmluaXNoOiBudWxsLFxuICAgICAgICBidWZmZXJpbmc6IG51bGwsXG4gICAgICAgIHRpbWV1cGRhdGU6IG51bGwsXG4gICAgICAgIGR1cmF0aW9uY2hhbmdlOiBudWxsLFxuICAgICAgICB2b2x1bWVjaGFuZ2U6IG51bGwsXG4gICAgICAgIGVycm9yOiBcIm9uRXJyb3JcIlxuICAgIH07XG5cbiAgICB2YXIgbmV4dF9pZCA9IDE7XG5cbiAgICAkLmVtYmVkcGxheWVyLnJlZ2lzdGVyKHtcbiAgICAgICAgb3JpZ2luOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20nLFxuICAgICAgICBtYXRjaGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAkLm5vZGVOYW1lKHRoaXMsIFwiaWZyYW1lXCIpICYmIC9eaHR0cHM/OlxcL1xcLyh3d3dcXC4pP3lvdXR1YmUoLW5vY29va2llKT9cXC5jb21cXC9lbWJlZFxcL1stX2EtejAtOV0rLipbXFw/Jl1lbmFibGVqc2FwaT0xL2kudGVzdCh0aGlzLnNyYyk7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBkYXRhLmRldGFpbC5wbGF5ZXJfaWQgPSBuZXh0X2lkKys7XG4gICAgICAgICAgICBkYXRhLmRldGFpbC5vcmlnaW4gPSAvXmh0dHBzPzpcXC9cXC8od3d3XFwuKT95b3V0dWJlLW5vY29va2llXFwuY29tXFwvL2kudGVzdCh0aGlzLnNyYykgPyAnaHR0cHM6Ly93d3cueW91dHViZS1ub2Nvb2tpZS5jb20nIDogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tJztcbiAgICAgICAgICAgIGRhdGEuZGV0YWlsLmR1cmF0aW9uID0gTmFOO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwuY3VycmVudHRpbWUgPSAwO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwudm9sdW1lID0gMTtcbiAgICAgICAgICAgIGRhdGEuZGV0YWlsLmNvbW1hbmRzID0gW107XG4gICAgICAgICAgICBkYXRhLmRldGFpbC52aWRlb19pZCA9IC9eaHR0cHM/OlxcL1xcLyg/Ond3d1xcLik/eW91dHViZSg/Oi1ub2Nvb2tpZSk/XFwuY29tXFwvZW1iZWRcXC8oWy1fYS16MC05XSspL2kuZXhlYyh0aGlzLnNyYylbMV07XG4gICAgICAgICAgICBkYXRhLmRldGFpbC50aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghJC5jb250YWlucyhzZWxmLm93bmVyRG9jdW1lbnQuYm9keSwgc2VsZikpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChkYXRhLmRldGFpbC50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLnRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5jb250ZW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7IGV2ZW50OiAnbGlzdGVuaW5nJywgaWQ6IGRhdGEuZGV0YWlsLnBsYXllcl9pZCB9KSwgZGF0YS5kZXRhaWwub3JpZ2luKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3lvdXR1YmVfJyArIGRhdGEuZGV0YWlsLnBsYXllcl9pZCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBsYXk6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHNlbmQodGhpcywgZGF0YSwgXCJwbGF5VmlkZW9cIik7XG4gICAgICAgIH0sXG4gICAgICAgIHBhdXNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBzZW5kKHRoaXMsIGRhdGEsIFwicGF1c2VWaWRlb1wiKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCBcInN0b3BWaWRlb1wiKTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCBcIm5leHRWaWRlb1wiKTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCBcInByZXZpb3VzVmlkZW9cIik7XG4gICAgICAgIH0sXG4gICAgICAgIHZvbHVtZTogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGRhdGEuZGV0YWlsLnZvbHVtZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGR1cmF0aW9uOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soZGF0YS5kZXRhaWwuZHVyYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBjdXJyZW50dGltZTogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGRhdGEuZGV0YWlsLmN1cnJlbnR0aW1lKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0Vm9sdW1lOiBmdW5jdGlvbihkYXRhLCB2b2x1bWUpIHtcbiAgICAgICAgICAgIHNlbmQodGhpcywgZGF0YSwgJ3NldFZvbHVtZScsIHZvbHVtZSAqIDEwMCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlZWs6IGZ1bmN0aW9uKGRhdGEsIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICBzZW5kKHRoaXMsIGRhdGEsICdzZWVrVG8nLCBwb3NpdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIGxpc3RlbjogZnVuY3Rpb24oZGF0YSwgZXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgZG9uZSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSBldmVudF9tYXBbZXZlbnRzW2ldXTtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQgJiYgZG9uZVtldmVudF0gIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZVtldmVudF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZW5kKHRoaXMsIGRhdGEsICdhZGRFdmVudExpc3RlbmVyJywgZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PScgKyBkYXRhLmRldGFpbC52aWRlb19pZDtcbiAgICAgICAgfSxcbiAgICAgICAgcGFyc2VNZXNzYWdlOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogSlNPTi5wYXJzZShldmVudC5kYXRhKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG1lc3NhZ2UucGxheWVyX2lkID0gJ3lvdXR1YmVfJyArIG1lc3NhZ2UuZGF0YS5pZDtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9LFxuICAgICAgICBwcm9jZXNzTWVzc2FnZTogZnVuY3Rpb24oZGF0YSwgbWVzc2FnZSwgdHJpZ2dlcikge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCA9PT0gXCJpbmZvRGVsaXZlcnlcIikge1xuICAgICAgICAgICAgICAgIHZhciBpbmZvID0gbWVzc2FnZS5kYXRhLmluZm87XG4gICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCd2b2x1bWUnIGluIGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2b2x1bWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5tdXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvbHVtZSA9IDAuMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm9sdW1lID0gaW5mby52b2x1bWUgLyAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5kZXRhaWwudm9sdW1lICE9PSB2b2x1bWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC52b2x1bWUgPSB2b2x1bWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcInZvbHVtZWNoYW5nZVwiLCB7IHZvbHVtZTogdm9sdW1lIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCdwbGF5ZXJTdGF0ZScgaW4gaW5mbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChpbmZvLnBsYXllclN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAtMTogLy8gdW5zdGFydGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOiAvLyBlbmRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyKFwiZmluaXNoXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTogLy8gcGxheWluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyKFwicGxheVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6IC8vIHBhdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyKFwicGF1c2VcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOiAvLyBidWZmZXJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcImJ1ZmZlcmluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDU6IC8vIGN1ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcInBhdXNlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgnZHVyYXRpb24nIGluIGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmZvLmR1cmF0aW9uICE9PSBkYXRhLmRldGFpbC5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLmR1cmF0aW9uID0gaW5mby5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyKFwiZHVyYXRpb25jaGFuZ2VcIiwgeyBkdXJhdGlvbjogaW5mby5kdXJhdGlvbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgnY3VycmVudFRpbWUnIGluIGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmZvLmN1cnJlbnRUaW1lICE9PSBkYXRhLmRldGFpbC5jdXJyZW50dGltZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLmN1cnJlbnR0aW1lID0gaW5mby5jdXJyZW50VGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyKFwidGltZXVwZGF0ZVwiLCB7IGN1cnJlbnRUaW1lOiBpbmZvLmN1cnJlbnRUaW1lIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCd2aWRlb0RhdGEnIGluIGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLnZpZGVvRGF0YSA9IGluZm8udmlkZW9EYXRhO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCdhdmFpbGFibGVRdWFsaXR5TGV2ZWxzJyBpbiBpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC5hdmFpbGFibGVRdWFsaXR5TGV2ZWxzID0gaW5mby5hdmFpbGFibGVRdWFsaXR5TGV2ZWxzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmRhdGEuZXZlbnQgPT09IFwiaW5pdGlhbERlbGl2ZXJ5XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kZXRhaWwudGltZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChkYXRhLmRldGFpbC50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLnRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCA9PT0gXCJvblJlYWR5XCIpIHtcbiAgICAgICAgICAgICAgICB0cmlnZ2VyKFwicmVhZHlcIik7XG4gICAgICAgICAgICAgICAgdmFyIHdpbiA9IHRoaXMuY29udGVudFdpbmRvdztcbiAgICAgICAgICAgICAgICBpZiAod2luICYmIGRhdGEuZGV0YWlsLmNvbW1hbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5kZXRhaWwuY29tbWFuZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbi5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShkYXRhLmRldGFpbC5jb21tYW5kc1tpXSksIGRhdGEuZGV0YWlsLm9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kZXRhaWwuY29tbWFuZHMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50ID09PSBcIm9uRXJyb3JcIikge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvcjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuZGF0YS5pbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjogLy8gVGhlIHJlcXVlc3QgY29udGFpbnMgYW4gaW52YWxpZCBwYXJhbWV0ZXIgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvciA9IFwiaWxsZWdhbF9wYXJhbWV0ZXJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTAwOiAvLyBUaGUgdmlkZW8gcmVxdWVzdGVkIHdhcyBub3QgZm91bmQuXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvciA9IFwibm90X2ZvdW5kXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIDEwMTogLy8gVGhlIG93bmVyIG9mIHRoZSByZXF1ZXN0ZWQgdmlkZW8gZG9lcyBub3QgYWxsb3cgaXQgdG8gYmUgcGxheWVkIGluIGVtYmVkZGVkIHBsYXllcnMuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTUwOiAvLyBUaGlzIGVycm9yIGlzIHRoZSBzYW1lIGFzIDEwMS4gSXQncyBqdXN0IGEgMTAxIGVycm9yIGluIGRpc2d1aXNlIVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBcImZvcmJpZGRlblwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yID0gXCJlcnJvclwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cmlnZ2VyKFwiZXJyb3JcIiwgeyBlcnJvcjogZXJyb3IgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHNlbmQoZWxlbWVudCwgZGF0YSwgZnVuYykge1xuICAgICAgICB2YXIgY29tbWFuZCA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmRldGFpbC5wbGF5ZXJfaWQsXG4gICAgICAgICAgICBldmVudDogXCJjb21tYW5kXCIsXG4gICAgICAgICAgICBmdW5jOiBmdW5jLFxuICAgICAgICAgICAgYXJnczogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChkYXRhLnN0YXRlID09PSBcImluaXRcIikge1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB3aW4gPSBlbGVtZW50LmNvbnRlbnRXaW5kb3c7XG4gICAgICAgICAgICBpZiAod2luKSB7XG4gICAgICAgICAgICAgICAgd2luLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KGNvbW1hbmQpLCBkYXRhLmRldGFpbC5vcmlnaW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkoalF1ZXJ5KTsiLCIgICAgICAgIC8qKlxuICAgICAgICAgKiBZb3V0dWJlIEFQSSDroZzrk5xcbiAgICAgICAgICovXG4gICAgICAgIHZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgdGFnLnNyYyA9IFwiaHR0cDovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpXCI7XG4gICAgICAgIHZhciBmaXJzdFNjcmlwdFRhZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbiAgICAgICAgZmlyc3RTY3JpcHRUYWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGFnLCBmaXJzdFNjcmlwdFRhZyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5IO2VqOyImOuKlCDtlYTsiJjroZwg6rWs7ZiE7ZW07JW8IO2VnOuLpC5cbiAgICAgICAgICog7ZSM66CI7J207Ja0IEFQSeyXkCDrjIDtlZwgSmF2YVNjcmlwdCDri6TsmrTroZzrk5wg7JmE66OMIOyLnCBBUEnqsIAg7J20IO2VqOyImCDtmLjstpztlZzri6QuXG4gICAgICAgICAqIO2OmOydtOyngCDroZzrk5wg7IucIO2RnOyLnO2VoCDtlIzroIjsnbTslrQg6rCc7LK066W8IOunjOuTpOyWtOyVvCDtlZzri6QuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgcGxheWVyO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5KCkge1xuICAgICAgICAgICAgcGxheWVyID0gbmV3IFlULlBsYXllcigndmlkZW9QbGF5ZXInLCB7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAnMTAwICUnLCAvLyA8aWZyYW1lPiDtg5zqt7gg7KeA7KCV7IucIO2VhOyalOyXhuydjFxuICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwICUnLCAvLyA8aWZyYW1lPiDtg5zqt7gg7KeA7KCV7IucIO2VhOyalOyXhuydjFxuICAgICAgICAgICAgICAgIHZpZGVvSWQ6ICc5YlprcDdxMTlmMCcsIC8vIDxpZnJhbWU+IO2DnOq3uCDsp4DsoJXsi5wg7ZWE7JqU7JeG7J2MXG4gICAgICAgICAgICAgICAgcGxheWVyVmFyczogeyAvLyA8aWZyYW1lPiDtg5zqt7gg7KeA7KCV7IucIO2VhOyalOyXhuydjFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sczogJzInXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ29uUmVhZHknOiBvblBsYXllclJlYWR5LCAvLyDtlIzroIjsnbTslrQg66Gc65Oc6rCAIOyZhOujjOuQmOqzoCBBUEkg7Zi47Lac7J2EIOuwm+ydhCDspIDruYTqsIAg65CgIOuVjOuniOuLpCDsi6TtlolcbiAgICAgICAgICAgICAgICAgICAgJ29uU3RhdGVDaGFuZ2UnOiBvblBsYXllclN0YXRlQ2hhbmdlIC8vIO2UjOugiOydtOyWtOydmCDsg4Htg5zqsIAg67OA6rK965CgIOuVjOuniOuLpCDsi6TtlolcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uUGxheWVyUmVhZHkoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvblBsYXllclJlYWR5IOyLpO2WiScpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwbGF5ZXJTdGF0ZTtcblxuICAgICAgICBmdW5jdGlvbiBvblBsYXllclN0YXRlQ2hhbmdlKGV2ZW50KSB7XG4gICAgICAgICAgICBwbGF5ZXJTdGF0ZSA9IGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuRU5ERUQgPyAn7KKF66OM65CoJyA6XG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YSA9PSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HID8gJ+yerOyDnSDspJEnIDpcbiAgICAgICAgICAgICAgICBldmVudC5kYXRhID09IFlULlBsYXllclN0YXRlLlBBVVNFRCA/ICfsnbzsi5zspJHsp4Ag65CoJyA6XG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YSA9PSBZVC5QbGF5ZXJTdGF0ZS5CVUZGRVJJTkcgPyAn67KE7Y2866eBIOykkScgOlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuQ1VFRCA/ICfsnqzsg53spIDruYQg7JmE66OM65CoJyA6XG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YSA9PSAtMSA/ICfsi5zsnpHrkJjsp4Ag7JWK7J2MJyA6ICfsmIjsmbgnO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb25QbGF5ZXJTdGF0ZUNoYW5nZSDsi6Ttlok6ICcgKyBwbGF5ZXJTdGF0ZSk7XG5cbiAgICAgICAgICAgIC8vIOyerOyDneyXrOu2gOulvCDthrXqs4TroZwg7IyT64qU64ukLlxuICAgICAgICAgICAgY29sbGVjdFBsYXlDb3VudChldmVudC5kYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBsYXlZb3V0dWJlKCkge1xuICAgICAgICAgICAgLy8g7ZSM66CI7J207Ja0IOyekOuPmeyLpO2WiSAo7KO87J2YOiDrqqjrsJTsnbzsl5DshJzripQg7J6Q64+Z7Iuk7ZaJ65CY7KeAIOyViuydjClcbiAgICAgICAgICAgIHBsYXllci5wbGF5VmlkZW8oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBhdXNlWW91dHViZSgpIHtcbiAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdG9wWW91dHViZSgpIHtcbiAgICAgICAgICAgIHBsYXllci5zZWVrVG8oMCwgdHJ1ZSk7IC8vIOyYgeyDgeydmCDsi5zqsITsnYQgMOy0iOuhnCDsnbTrj5nsi5ztgqjri6QuXG4gICAgICAgICAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBsYXllZCA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbGxlY3RQbGF5Q291bnQoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyAmJiBwbGF5ZWQgPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyB0b2RvIHN0YXRpc3RpY3NcbiAgICAgICAgICAgICAgICBwbGF5ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGF0aXN0aWNzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogbG9hZFZpZGVvQnlJZCDtlajsiJjripQg7KeA7KCV7ZWcIOuPmeyYgeyDgeydhCDroZzrk5ztlZjqs6Ag7J6s7IOd7ZWc64ukLlxuICAgICAgICAgKiDsnbjsiJjqtazrrLg6IGxvYWRWaWRlb0J5VXJsKG1lZGlhQ29udGVudFVybDpTdHJpbmcsIHN0YXJ0U2Vjb25kczpOdW1iZXIsIHN1Z2dlc3RlZFF1YWxpdHk6U3RyaW5nKTpWb2lkXG4gICAgICAgICAqIOqwnOyytOq1rOusuDogbG9hZFZpZGVvQnlVcmwoe21lZGlhQ29udGVudFVybDpTdHJpbmcsIHN0YXJ0U2Vjb25kczpOdW1iZXIsIGVuZFNlY29uZHM6TnVtYmVyLCBzdWdnZXN0ZWRRdWFsaXR5OlN0cmluZ30pOlZvaWRcbiAgICAgICAgICogbG9hZFZpZGVvQnlJZCDtlajsiJgg67+Q66eMIOyVhOuLiOudvCDri6Trpbgg64yA7LK07KCB7J24IO2VqOyImOuTpOuPhCDqsJzssrTqtazrrLjsnbQg6riw64ql7J20IOuNlCDrp47ri6QuXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBjaGFuZ2VWaWRlb0FuZFN0YXJ0KCkge1xuICAgICAgICAgICAgcGxheWVyLmxvYWRWaWRlb0J5SWQoXCJpQ2tZdzNjUndMb1wiLCAwLCBcImxhcmdlXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2hhbmdlVmlkZW9PYmplY3RBbmRTdGFydCgpIHtcbiAgICAgICAgICAgIC8vIDDstIjrtoDthLAgMTDstIjquYzsp4Ag7J6s7IOd7J2EIOyLnO2CqOuLpC5cbiAgICAgICAgICAgIHBsYXllci5sb2FkVmlkZW9CeUlkKHtcbiAgICAgICAgICAgICAgICAndmlkZW9JZCc6ICdiSFFxdll5NUtZbycsXG4gICAgICAgICAgICAgICAgJ3N0YXJ0U2Vjb25kcyc6IDAsXG4gICAgICAgICAgICAgICAgJ2VuZFNlY29uZHMnOiAxMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogbG9hZFBsYXlsaXN0IO2VqOyImOuKlCDsp4DsoJXtlZwg7J6s7IOd66qp66Gd7J2EIOuhnOuTnO2VmOqzoCDsnqzsg53tlZzri6QuXG4gICAgICAgICAqIOyduOyImOq1rOusuDogbG9hZFBsYXlsaXN0KHBsYXlsaXN0OlN0cmluZ3xBcnJheSwgaW5kZXg6TnVtYmVyLCBzdGFydFNlY29uZHM6TnVtYmVyLCBzdWdnZXN0ZWRRdWFsaXR5OlN0cmluZyk6Vm9pZFxuICAgICAgICAgKiDqsJzssrTqtazrrLg6IGxvYWRQbGF5bGlzdCh7bGlzdDpTdHJpbmcsIGxpc3RUeXBlOlN0cmluZywgaW5kZXg6TnVtYmVyLCBzdGFydFNlY29uZHM6TnVtYmVyLCBzdWdnZXN0ZWRRdWFsaXR5OlN0cmluZ30pOlZvaWRcbiAgICAgICAgICogW+yjvOydmDog6rCc7LK06rWs66y47J2YIGxvYWRQbGF5bGlzdCDtlajsiJjsl5DshJzsnZgg7J6s7IOd66qp66GdSUQg7JmAIOuPmeyYgeyDgUlEIOydmCDsgqzsmqnrsKnrspXsnbQg64uk66W064ukLl1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGNoYW5nZVZpZGVvTGlzdEFuZFN0YXJ0KCkge1xuICAgICAgICAgICAgcGxheWVyLmxvYWRQbGF5bGlzdChbJ3djTE50ZWV6M2M0JywgJ0xPc05QMkQya1NBJywgJ3JYMzcyWndYT0VNJ10sIDAsIDAsICdsYXJnZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2hhbmdlVmlkZW9MaXN0T2JqZWN0QW5kU3RhcnQoKSB7XG4gICAgICAgICAgICBwbGF5ZXIubG9hZFBsYXlsaXN0KHtcbiAgICAgICAgICAgICAgICAncGxheWxpc3QnOiBbJzlIUGlCSkJDT3E4JywgJ01wNEQwb0hFbmpjJywgJzh5MUQ4S0d0SGZRJywgJ2pFRUZfNTBzQnJJJ10sXG4gICAgICAgICAgICAgICAgJ2xpc3RUeXBlJzogJ3BsYXlsaXN0JyxcbiAgICAgICAgICAgICAgICAnaW5kZXgnOiAwLFxuICAgICAgICAgICAgICAgICdzdGFydFNlY29uZHMnOiAwLFxuICAgICAgICAgICAgICAgICdzdWdnZXN0ZWRRdWFsaXR5JzogJ3NtYWxsJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjaGFuZ2VWaWRlb0xpc3RPYmplY3RBbmRTdGFydDIoKSB7XG4gICAgICAgICAgICBwbGF5ZXIubG9hZFBsYXlsaXN0KHtcbiAgICAgICAgICAgICAgICAnbGlzdCc6ICdVVVBXOVRNdDBsZTZvclBLZER3TFI5M3cnLFxuICAgICAgICAgICAgICAgICdsaXN0VHlwZSc6ICdwbGF5bGlzdCcsXG4gICAgICAgICAgICAgICAgJ2luZGV4JzogMCxcbiAgICAgICAgICAgICAgICAnc3RhcnRTZWNvbmRzJzogMCxcbiAgICAgICAgICAgICAgICAnc3VnZ2VzdGVkUXVhbGl0eSc6ICdzbWFsbCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9Il19
;