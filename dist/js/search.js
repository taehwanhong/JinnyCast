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
       this.events();
    
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
                searchListView.moreSearchResult();
                util.timeAgo();
            });
        });
    },

    moreSearchResult: function(){
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
    events: function(){
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

//  runAjax : function(url, listener, reqFunc){
//         let oReq = new XMLHttpRequest();
//         oReq.addEventListener(listener, reqFunc);
//         oReq.open("GET", url);
//         oReq.send();
//     },
    


// buttonLike.addEventListener("click", function(evt){
//    let id = this.getAttribute('data-post-id');
//    let xhr = new XMLHttpRequest();

//     if (buttonLike.classList.contains('blog-like')) {
//         var url = '/like_count_blog/?post_id='+id;
//     }
//     if (buttonLike.classList.contains('project-like')) {
//         var url = '/like_count_project/?project_id='+id;
//     }

//     xhr.open('GET', url);
//     xhr.onload = function() {
//     if (xhr.status === 200) {
//         likeData.innerHTML = xhr.responseText;
//         toggleLikeIcon();
//     }
//     else {
//         alert('Request failed.  Returned status of ' + xhr.status);
//     }
// };
// xhr.send();
// });

// function toggleLikeIcon(){
//     for (let ele of icon){
//         if (ele.style.display === 'none') {
//             ele.style.display = 'block';
//         } else {
//             ele.style.display = 'none';
//         }
//     }
// };

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
},{}]},{},[1,2,3,4,5,6,7])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL2VtYmVkcGxheWVyLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2gtMS5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvc2VhcmNoLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy92aWRlb2N0ci5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMveW91dHViZS5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMveW91dHViZVBsYXllci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheWVyQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnVzZXJQbGF5bGlzdCcpLFxuICBwbGF5QnRuLFxuICBwbGF5U3ZnLFxuICBwbGF5U3ZnUGF0aCxcbiAgcHJldkJ0bixcbiAgbmV4dEJ0bixcbiAgcGxCdG4sXG4gIHJlcGVhdEJ0bixcbiAgdm9sdW1lQnRuLFxuICBwcm9ncmVzc0JhcixcbiAgcHJlbG9hZEJhcixcbiAgY3VyVGltZSxcbiAgZHVyVGltZSxcbiAgdHJhY2tUaXRsZSxcbiAgYXVkaW8sXG4gIGluZGV4ID0gMCxcbiAgcGxheUxpc3QsXG4gIHZvbHVtZUJhcixcbiAgd2hlZWxWb2x1bWVWYWx1ZSA9IDAsXG4gIHZvbHVtZUxlbmd0aCxcbiAgcmVwZWF0aW5nID0gZmFsc2UsXG4gIHNlZWtpbmcgPSBmYWxzZSxcbiAgc2Vla2luZ1ZvbCA9IGZhbHNlLFxuICByaWdodENsaWNrID0gZmFsc2UsXG4gIGFwQWN0aXZlID0gZmFsc2UsXG4gIC8vIHBsYXlsaXN0IHZhcnNcbiAgcGwsXG4gIHBsVWwsXG4gIHBsTGksXG4gIHRwbExpc3QgPVxuICAgICAgICAgICAgJzxsaSBjbGFzcz1cInBsLWxpc3RcIiBkYXRhLXRyYWNrPVwie2NvdW50fVwiPicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdHJhY2tcIj4nK1xuICAgICAgICAgICAgICAgICcgPGJ1dHRvbiBjbGFzcz1cInBsLWxpc3RfX3BsYXkgaWNvbl9idG5cIj48aSBjbGFzcz1cImxhIGxhLWhlYWRwaG9uZXNcIj48L2k+PC9idXR0b24+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2VxXCI+JytcbiAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RpdGxlXCI+e3RpdGxlfTwvZGl2PicrXG4gICAgICAgICAgICAgICc8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcmVtb3ZlIGljb25fYnRuXCI+JytcbiAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJsYSBsYS1taW51cy1jaXJjbGVcIj48L2k+JytcbiAgICAgICAgICAgICAgJzwvYnV0dG9uPicrXG4gICAgICAgICAgICAnPC9saT4nLFxuICAvLyBzZXR0aW5nc1xuICBzZXR0aW5ncyA9IHtcbiAgICB2b2x1bWUgICAgICAgIDogMC4xLFxuICAgIGNoYW5nZURvY1RpdGxlOiB0cnVlLFxuICAgIGNvbmZpcm1DbG9zZSAgOiB0cnVlLFxuICAgIGF1dG9QbGF5ICAgICAgOiBmYWxzZSxcbiAgICBidWZmZXJlZCAgICAgIDogdHJ1ZSxcbiAgICBub3RpZmljYXRpb24gIDogdHJ1ZSxcbiAgICBwbGF5TGlzdCAgICAgIDogW11cbiAgfTtcblxuICBmdW5jdGlvbiBpbml0KG9wdGlvbnMpIHtcblxuICAgIGlmKCEoJ2NsYXNzTGlzdCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKGFwQWN0aXZlIHx8IHBsYXllciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgYWxyZWFkeSBpbml0JztcbiAgICB9XG5cbiAgICBzZXR0aW5ncyA9IGV4dGVuZChzZXR0aW5ncywgb3B0aW9ucyk7XG5cbiAgICAvLyBnZXQgcGxheWVyIGVsZW1lbnRzXG4gICAgcGxheUJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tdG9nZ2xlJyk7XG4gICAgcGxheVN2ZyAgICAgICAgPSBwbGF5QnRuLnF1ZXJ5U2VsZWN0b3IoJy5pY29uLXBsYXknKTtcbiAgICBwbGF5U3ZnUGF0aCAgICA9IHBsYXlTdmcucXVlcnlTZWxlY3RvcigncGF0aCcpO1xuICAgIHByZXZCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXByZXYnKTtcbiAgICBuZXh0QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1uZXh0Jyk7XG4gICAgcmVwZWF0QnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcmVwZWF0Jyk7XG4gICAgdm9sdW1lQnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZS1idG4nKTtcbiAgICBwbEJ0biAgICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wbGF5bGlzdCcpO1xuICAgIGN1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tY3VycmVudCcpO1xuICAgIGR1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tZHVyYXRpb24nKTtcbiAgICB0cmFja1RpdGxlICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpdGxlJyk7XG4gICAgcHJvZ3Jlc3NCYXIgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19iYXInKTtcbiAgICBwcmVsb2FkQmFyICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX3ByZWxvYWQnKTtcbiAgICB2b2x1bWVCYXIgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lX19iYXInKTtcblxuICAgIHBsYXlMaXN0ID0gc2V0dGluZ3MucGxheUxpc3Q7XG5cbiAgICBwbGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhcEFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBDcmVhdGUgcGxheWxpc3RcbiAgICByZW5kZXJQTCgpO1xuICAgIHBsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIC8vIENyZWF0ZSBhdWRpbyBvYmplY3RcbiAgICBhdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICBhdWRpby5wcmVsb2FkID0gJ2F1dG8nO1xuXG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBhdWRpby52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICBpZihzZXR0aW5ncy5hdXRvUGxheSkge1xuICAgICAgYXVkaW8ucGxheSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZURvY3VtZW50VGl0bGUodGl0bGUpIHtcbiAgICBpZihzZXR0aW5ncy5jaGFuZ2VEb2NUaXRsZSkge1xuICAgICAgaWYodGl0bGUpIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY1RpdGxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZVVubG9hZChldnQpIHtcbiAgICBpZighYXVkaW8ucGF1c2VkKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdNdXNpYyBzdGlsbCBwbGF5aW5nJztcbiAgICAgIGV2dC5yZXR1cm5WYWx1ZSA9IG1lc3NhZ2U7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlcnJvckhhbmRsZXIoZXZ0KSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbWVkaWFFcnJvciA9IHtcbiAgICAgICcxJzogJ01FRElBX0VSUl9BQk9SVEVEJyxcbiAgICAgICcyJzogJ01FRElBX0VSUl9ORVRXT1JLJyxcbiAgICAgICczJzogJ01FRElBX0VSUl9ERUNPREUnLFxuICAgICAgJzQnOiAnTUVESUFfRVJSX1NSQ19OT1RfU1VQUE9SVEVEJ1xuICAgIH07XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHBsTGlbaW5kZXhdICYmIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdIb3VzdG9uIHdlIGhhdmUgYSBwcm9ibGVtOiAnICsgbWVkaWFFcnJvcltldnQudGFyZ2V0LmVycm9yLmNvZGVdKTtcbiAgfVxuXG4vKipcbiAqIFVQREFURSBQTFxuICovXG4gIGZ1bmN0aW9uIHVwZGF0ZVBMKGFkZExpc3QpIHtcbiAgICBpZighYXBBY3RpdmUpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGlzIG5vdCB5ZXQgaW5pdGlhbGl6ZWQnO1xuICAgIH1cbiAgICBpZighQXJyYXkuaXNBcnJheShhZGRMaXN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhZGRMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb3VudCA9IHBsYXlMaXN0Lmxlbmd0aDtcbiAgICB2YXIgaHRtbCAgPSBbXTtcbiAgICBwbGF5TGlzdC5wdXNoLmFwcGx5KHBsYXlMaXN0LCBhZGRMaXN0KTtcbiAgICBhZGRMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaHRtbC5wdXNoKFxuICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBjb3VudCsrKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgLy8gSWYgZXhpc3QgZW1wdHkgbWVzc2FnZVxuICAgIGlmKHBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwucmVtb3ZlQ2hpbGQoIHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpICk7XG4gICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgIH1cbiAgICAvLyBBZGQgc29uZyBpbnRvIHBsYXlsaXN0XG4gICAgcGxVbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZUVuZCcsIGh0bWwuam9pbignJykpO1xuICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuICB9XG5cbi8qKlxuICogIFBsYXlMaXN0IG1ldGhvZHNcbiAqL1xuICAgIGZ1bmN0aW9uIHJlbmRlclBMKCkge1xuICAgICAgdmFyIGh0bWwgPSBbXTtcblxuICAgICAgcGxheUxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpKSB7XG4gICAgICAgIGh0bWwucHVzaChcbiAgICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBpKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBwbCA9IGNyZWF0ZSgnZGl2Jywge1xuICAgICAgICAnY2xhc3NOYW1lJzogJ3BsLWNvbnRhaW5lcicsXG4gICAgICAgICdpZCc6ICdwbCcsXG4gICAgICAgICdpbm5lckhUTUwnOiAnPHVsIGNsYXNzPVwicGwtdWxcIj4nICsgKCFpc0VtcHR5TGlzdCgpID8gaHRtbC5qb2luKCcnKSA6ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nKSArICc8L3VsPidcbiAgICAgIH0pO1xuXG4gICAgICBwbGF5ZXJDb250YWluZXIuaW5zZXJ0QmVmb3JlKHBsLCBwbGF5ZXJDb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICBwbFVsID0gcGwucXVlcnlTZWxlY3RvcignLnBsLXVsJyk7XG4gICAgICBwbExpID0gcGxVbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICBwbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdEhhbmRsZXIoZXZ0KSB7XG4gICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgaWYoZXZ0LnRhcmdldC5tYXRjaGVzKCcucGwtbGlzdF9fdGl0bGUnKSkge1xuICAgICAgICB2YXIgY3VycmVudCA9IHBhcnNlSW50KGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuICAgICAgICBpZihpbmRleCAhPT0gY3VycmVudCkge1xuICAgICAgICAgIGluZGV4ID0gY3VycmVudDtcbiAgICAgICAgICBwbGF5KGN1cnJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYoISFldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0X19yZW1vdmUnKSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudEVsID0gZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpO1xuICAgICAgICAgICAgdmFyIGlzRGVsID0gcGFyc2VJbnQocGFyZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcblxuICAgICAgICAgICAgcGxheUxpc3Quc3BsaWNlKGlzRGVsLCAxKTtcbiAgICAgICAgICAgIHBhcmVudEVsLmNsb3Nlc3QoJy5wbC11bCcpLnJlbW92ZUNoaWxkKHBhcmVudEVsKTtcblxuICAgICAgICAgICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwbExpLCBmdW5jdGlvbihlbCwgaSkge1xuICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snLCBpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcGxheShpbmRleCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckFsbCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgaWYoaXNEZWwgPiBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4IC09IDE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgICAgICAgICAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoaXNEZWwgPCBpbmRleCkge1xuICAgICAgICAgICAgICBpbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsQWN0aXZlKCkge1xuICAgICAgaWYoYXVkaW8ucGF1c2VkKSB7XG4gICAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnQgPSBpbmRleDtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHBsTGkubGVuZ3RoOyBsZW4gPiBpOyBpKyspIHtcbiAgICAgICAgcGxMaVtpXS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICB9XG4gICAgICBwbExpW2N1cnJlbnRdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICB9XG5cblxuLyoqXG4gKiBQbGF5ZXIgbWV0aG9kc1xuICovXG4gIGZ1bmN0aW9uIHBsYXkoY3VycmVudEluZGV4KSB7XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gY2xlYXJBbGwoKTtcbiAgICB9XG5cbiAgICBpbmRleCA9IChjdXJyZW50SW5kZXggKyBwbGF5TGlzdC5sZW5ndGgpICUgcGxheUxpc3QubGVuZ3RoO1xuXG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICAvLyBDaGFuZ2UgZG9jdW1lbnQgdGl0bGVcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAvLyBBdWRpbyBwbGF5XG4gICAgYXVkaW8ucGxheSgpO1xuXG4gICAgLy8gU2hvdyBub3RpZmljYXRpb25cbiAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgIGJvZHk6ICdOb3cgcGxheWluZycsXG4gICAgICB0YWc6ICdtdXNpYy1wbGF5ZXInXG4gICAgfSk7XG5cbiAgICAvLyBUb2dnbGUgcGxheSBidXR0b25cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcblxuICAgIC8vIFNldCBhY3RpdmUgc29uZyBwbGF5bGlzdFxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmV2KCkge1xuICAgIHBsYXkoaW5kZXggLSAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgcGxheShpbmRleCArIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eUxpc3QoKSB7XG4gICAgcmV0dXJuIHBsYXlMaXN0Lmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyQWxsKCkge1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXVkaW8uc3JjID0gJyc7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSAncXVldWUgaXMgZW1wdHknO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgaWYoIXBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwuaW5uZXJIVE1MID0gJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPic7XG4gICAgfVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXlUb2dnbGUoKSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhdWRpby5wYXVzZWQpIHtcblxuICAgICAgaWYoYXVkaW8uY3VycmVudFRpbWUgPT09IDApIHtcbiAgICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIH1cbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdm9sdW1lVG9nZ2xlKCkge1xuICAgIGlmKGF1ZGlvLm11dGVkKSB7XG4gICAgICBpZihwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKSA9PT0gMCkge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gc2V0dGluZ3Mudm9sdW1lICogMTAwICsgJyUnO1xuICAgICAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZvbHVtZUxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVwZWF0VG9nZ2xlKCkge1xuICAgIGlmKHJlcGVhdEJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICByZXBlYXRpbmcgPSBmYWxzZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXBlYXRpbmcgPSB0cnVlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBsVG9nZ2xlKCkge1xuICAgIHBsQnRuLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICAgIC8vcGwuY2xhc3NMaXN0LnRvZ2dsZSgnaC1zaG93Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0aW1lVXBkYXRlKCkge1xuICAgIGlmKGF1ZGlvLnJlYWR5U3RhdGUgPT09IDAgfHwgc2Vla2luZykgcmV0dXJuO1xuXG4gICAgdmFyIGJhcmxlbmd0aCA9IE1hdGgucm91bmQoYXVkaW8uY3VycmVudFRpbWUgKiAoMTAwIC8gYXVkaW8uZHVyYXRpb24pKTtcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IGJhcmxlbmd0aCArICclJztcblxuICAgIHZhclxuICAgIGN1ck1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC8gNjApLFxuICAgIGN1clNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC0gY3VyTWlucyAqIDYwKSxcbiAgICBtaW5zID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAvIDYwKSxcbiAgICBzZWNzID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAtIG1pbnMgKiA2MCk7XG4gICAgKGN1clNlY3MgPCAxMCkgJiYgKGN1clNlY3MgPSAnMCcgKyBjdXJTZWNzKTtcbiAgICAoc2VjcyA8IDEwKSAmJiAoc2VjcyA9ICcwJyArIHNlY3MpO1xuXG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSBjdXJNaW5zICsgJzonICsgY3VyU2VjcztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9IG1pbnMgKyAnOicgKyBzZWNzO1xuXG4gICAgaWYoc2V0dGluZ3MuYnVmZmVyZWQpIHtcbiAgICAgIHZhciBidWZmZXJlZCA9IGF1ZGlvLmJ1ZmZlcmVkO1xuICAgICAgaWYoYnVmZmVyZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBNYXRoLnJvdW5kKDEwMCAqIGJ1ZmZlcmVkLmVuZCgwKSAvIGF1ZGlvLmR1cmF0aW9uKTtcbiAgICAgICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IGxvYWRlZCArICclJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVE9ETyBzaHVmZmxlXG4gICAqL1xuICBmdW5jdGlvbiBzaHVmZmxlKCkge1xuICAgIGlmKHNodWZmbGUpIHtcbiAgICAgIGluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogcGxheUxpc3QubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkb0VuZCgpIHtcbiAgICBpZihpbmRleCA9PT0gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIXJlcGVhdGluZykge1xuICAgICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgICBwbEFjdGl2ZSgpO1xuICAgICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBsYXkoMCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGxheShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVCYXIoZXZ0LCBlbCwgZGlyKSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmKGRpciA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgICB2YWx1ZSA9IE1hdGgucm91bmQoICgoZXZ0LmNsaWVudFggLSBlbC5vZmZzZXQoKS5sZWZ0KSArIHdpbmRvdy5wYWdlWE9mZnNldCkgICogMTAwIC8gZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCk7XG4gICAgICBlbC5zdHlsZS53aWR0aCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmKGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICAgIHZhbHVlID0gcGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCk7XG4gICAgICAgIHZhciBkZWx0YSA9IGV2dC5kZWx0YVkgfHwgZXZ0LmRldGFpbCB8fCAtZXZ0LndoZWVsRGVsdGE7XG4gICAgICAgIHZhbHVlID0gKGRlbHRhID4gMCkgPyB2YWx1ZSAtIDEwIDogdmFsdWUgKyAxMDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gKGVsLm9mZnNldCgpLnRvcCArIGVsLm9mZnNldEhlaWdodCkgLSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCgob2Zmc2V0IC0gZXZ0LmNsaWVudFkpKTtcbiAgICAgIH1cbiAgICAgIGlmKHZhbHVlID4gMTAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAxMDA7XG4gICAgICBpZih2YWx1ZSA8IDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDA7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlckJhcihldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZyA9IHRydWU7XG4gICAgIXJpZ2h0Q2xpY2sgJiYgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgc2VlayhldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlclZvbChldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IHRydWU7XG4gICAgc2V0Vm9sdW1lKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWVrKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgd2luZG93LnZhbHVlID0gbW92ZUJhcihldnQsIHByb2dyZXNzQmFyLCAnaG9yaXpvbnRhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWtpbmdGYWxzZSgpIHtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIGF1ZGlvLmN1cnJlbnRUaW1lID0gYXVkaW8uZHVyYXRpb24gKiAod2luZG93LnZhbHVlIC8gMTAwKTtcbiAgICAgIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5yZW1vdmUoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIH1cbiAgICBzZWVraW5nID0gZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Vm9sdW1lKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuICAgIGlmKHNlZWtpbmdWb2wgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgfHwgZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IG1vdmVCYXIoZXZ0LCB2b2x1bWVCYXIucGFyZW50Tm9kZSwgJ3ZlcnRpY2FsJykgLyAxMDA7XG4gICAgICBpZih2YWx1ZSA8PSAwKSB7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmKGF1ZGlvLm11dGVkKSBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgICBhdWRpby52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeSh0aXRsZSwgYXR0cikge1xuICAgIGlmKCFzZXR0aW5ncy5ub3RpZmljYXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYod2luZG93Lk5vdGlmaWNhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF0dHIudGFnID0gJ0FQIG11c2ljIHBsYXllcic7XG4gICAgd2luZG93Lk5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbihhY2Nlc3MpIHtcbiAgICAgIGlmKGFjY2VzcyA9PT0gJ2dyYW50ZWQnKSB7XG4gICAgICAgIHZhciBub3RpY2UgPSBuZXcgTm90aWZpY2F0aW9uKHRpdGxlLnN1YnN0cigwLCAxMTApLCBhdHRyKTtcbiAgICAgICAgc2V0VGltZW91dChub3RpY2UuY2xvc2UuYmluZChub3RpY2UpLCA1MDAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4vKiBEZXN0cm95IG1ldGhvZC4gQ2xlYXIgQWxsICovXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgaWYoIWFwQWN0aXZlKSByZXR1cm47XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBwbGF5QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuICAgIHBsQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgLy8gUGxheWxpc3RcbiAgICBwbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgcGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbCk7XG5cbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGFwQWN0aXZlID0gZmFsc2U7XG4gICAgaW5kZXggPSAwO1xuXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW0gYiAgICAgICAgdXRlZCcpO1xuICAgIHBsQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcblxuICAgIC8vIFJlbW92ZSBwbGF5ZXIgZnJvbSB0aGUgRE9NIGlmIG5lY2Vzc2FyeVxuICAgIC8vIHBsYXllci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsYXllcik7XG4gIH1cblxuXG4vKipcbiAqICBIZWxwZXJzXG4gKi9cbiAgZnVuY3Rpb24gd2hlZWwoKSB7XG4gICAgdmFyIHdoZWVsO1xuICAgIGlmICgnb253aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ3doZWVsJztcbiAgICB9IGVsc2UgaWYgKCdvbm1vdXNld2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICdtb3VzZXdoZWVsJztcbiAgICB9IGVsc2Uge1xuICAgICAgd2hlZWwgPSAnTW96TW91c2VQaXhlbFNjcm9sbCc7XG4gICAgfVxuICAgIHJldHVybiB3aGVlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIGZvcih2YXIgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICBpZihkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGUoZWwsIGF0dHIpIHtcbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpO1xuICAgIGlmKGF0dHIpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKGVsZW1lbnRbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGVsZW1lbnRbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgRWxlbWVudC5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICBzY3JvbGxMZWZ0ID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LFxuICAgIHNjcm9sbFRvcCA9IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogZWwudG9wICsgc2Nyb2xsVG9wLFxuICAgICAgbGVmdDogZWwubGVmdCArIHNjcm9sbExlZnRcbiAgICB9O1xuICB9O1xuXG4gIEVsZW1lbnQucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlKHRoaXMsICcnKVthdHRyXTtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgYXR0ciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKHRoaXMuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuc3R5bGVbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIG1hdGNoZXMgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzID0gRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLCBub2RlcyA9IChub2RlLnBhcmVudE5vZGUgfHwgbm9kZS5kb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvciksIGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAobm9kZXNbKytpXSAmJiBub2Rlc1tpXSAhPSBub2RlKTtcbiAgICAgICAgICByZXR1cm4gISFub2Rlc1tpXTtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4gIC8vIGNsb3Nlc3QgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0ID0gRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0IHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBlbCA9IHRoaXM7XG4gICAgICAgICAgd2hpbGUgKGVsLm1hdGNoZXMgJiYgIWVsLm1hdGNoZXMoc2VsZWN0b3IpKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgcmV0dXJuIGVsLm1hdGNoZXMgPyBlbCA6IG51bGw7XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuLyoqXG4gKiAgUHVibGljIG1ldGhvZHNcbiAqL1xuICByZXR1cm4ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgdXBkYXRlOiB1cGRhdGVQTCxcbiAgICBkZXN0cm95OiBkZXN0cm95XG4gIH07XG5cbn0pKCk7XG5cbndpbmRvdy5BUCA9IEF1ZGlvUGxheWVyO1xuXG59KSh3aW5kb3cpO1xuXG4vLyBURVNUOiBpbWFnZSBmb3Igd2ViIG5vdGlmaWNhdGlvbnNcbnZhciBpY29uSW1hZ2UgPSAnaHR0cDovL2Z1bmt5aW1nLmNvbS9pLzIxcFg1LnBuZyc7XG5cbkFQLmluaXQoe1xuICBwbGF5TGlzdDogW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1RoZSBCZXN0IG9mIEJhY2gnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRHJlYW1lci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXVxufSk7XG5cbi8vIFRFU1Q6IHVwZGF0ZSBwbGF5bGlzdFxuLy9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWRkU29uZ3MnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbi8vICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIEFQLnVwZGF0ZShbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1BcGJaZmw3aEljZyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfVxuICBdKTtcbi8vfSlcblxuIiwiKGZ1bmN0aW9uKCQsIHVuZGVmaW5lZCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgJC5lbWJlZHBsYXllciA9IHtcbiAgICAgICAgbW9kdWxlczogW10sXG4gICAgICAgIG1vZHVsZXNfYnlfb3JpZ2luOiB7fSxcbiAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgIG1hdGNoZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgICAgICAgICBpbml0OiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9LFxuICAgICAgICAgICAgcGxheTogZnVuY3Rpb24oZGF0YSkge30sXG4gICAgICAgICAgICBwYXVzZTogZnVuY3Rpb24oZGF0YSkge30sXG4gICAgICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0ZSA9PT0gXCJwbGF5aW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGUucGF1c2UuY2FsbCh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcGxheVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLnBsYXkuY2FsbCh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcGxheVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdG9wOiBmdW5jdGlvbihkYXRhKSB7IGRhdGEubW9kdWxlLnBhdXNlKGRhdGEpOyB9LFxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oZGF0YSkge30sXG4gICAgICAgICAgICBwcmV2OiBmdW5jdGlvbihkYXRhKSB7fSxcbiAgICAgICAgICAgIGxpc3RlbjogZnVuY3Rpb24oZGF0YSwgZXZlbnRzKSB7fSxcbiAgICAgICAgICAgIHZvbHVtZTogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHsgY2FsbGJhY2soTmFOKTsgfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykgeyBjYWxsYmFjayhOYU4pOyB9LFxuICAgICAgICAgICAgY3VycmVudHRpbWU6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7IGNhbGxiYWNrKE5hTik7IH0sXG4gICAgICAgICAgICBzZXRWb2x1bWU6IGZ1bmN0aW9uKGRhdGEsIHZvbHVtZSkge30sXG4gICAgICAgICAgICBzZWVrOiBmdW5jdGlvbihkYXRhLCBwb3NpdGlvbikge30sXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihkYXRhKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgICAgICAgcGFyc2VNZXNzYWdlOiBmdW5jdGlvbihldmVudCkge30sXG4gICAgICAgICAgICBwcm9jZXNzTWVzc2FnZTogZnVuY3Rpb24oZGF0YSwgbWVzc2FnZSwgdHJpZ2dlcikge30sXG4gICAgICAgICAgICBvcmlnaW46IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihtb2R1bGUpIHtcbiAgICAgICAgICAgIG1vZHVsZSA9IG1ha2VfbW9kdWxlKG1vZHVsZSk7XG4gICAgICAgICAgICAkLmVtYmVkcGxheWVyLm1vZHVsZXMucHVzaChtb2R1bGUpO1xuICAgICAgICAgICAgZm9yICh2YXIgb3JpZ2luIGluIG1vZHVsZS5vcmlnaW4pIHtcbiAgICAgICAgICAgICAgICBpZiAob3JpZ2luIGluICQuZW1iZWRwbGF5ZXIubW9kdWxlc19ieV9vcmlnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFscmVhZHkgaGF2ZSBlbWJlZHBsYXllciBtb2R1bGUgZm9yIG9yaWdpbjogXCIgKyBvcmlnaW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkLmVtYmVkcGxheWVyLm1vZHVsZXNfYnlfb3JpZ2luW29yaWdpbl0gPSBtb2R1bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9yaWdpbjogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgICAgICBpZiAoL15cXC9cXC8vLnRlc3QodXJsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHVybC5zcGxpdChcIi9cIilbMl07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKC9eWy1fYS16MC05XSs6L2kudGVzdCh1cmwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC9eKFstX2EtejAtOV0rOig/OlxcL1xcLyk/W15cXC9dKikvaS5leGVjKHVybClbMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwYXJzZVBhcmFtczogZnVuY3Rpb24oc2VhcmNoKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBpZiAoc2VhcmNoKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoID0gc2VhcmNoLnNwbGl0KFwiJlwiKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlYXJjaC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSBzZWFyY2hbaV0uc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXNbZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtWzBdKV0gPSBkZWNvZGVVUklDb21wb25lbnQocGFyYW0uc2xpY2UoMSkuam9pbihcIj1cIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgIH0sXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uKHNlbGYsIGRhdGEsIHR5cGUsIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1ldXBkYXRlXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcInZvbHVtZWNoYW5nZVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJkdXJhdGlvbmNoYW5nZVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgXCJyZWFkeVwiOlxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFwicmVhZHlcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwicGxheVwiOlxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFwicGxheWluZ1wiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgXCJwYXVzZVwiOlxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFwicGF1c2VkXCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBcImZpbmlzaFwiOlxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFwiZmluaXNoZWRcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwiYnVmZmVyaW5nXCI6XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlID0gXCJidWZmZXJpbmdcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZSA9PT0gZGF0YS5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGF0YS5saXN0ZW5pbmdbdHlwZV0gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgJHNlbGYgPSAkKHNlbGYpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZSkgJHNlbGYudHJpZ2dlcigkLkV2ZW50KCdlbWJlZHBsYXllcjpzdGF0ZWNoYW5nZScsIHsgc3RhdGU6IHN0YXRlIH0pKTtcbiAgICAgICAgICAgICAgICAkc2VsZi50cmlnZ2VyKCQuRXZlbnQoJ2VtYmVkcGxheWVyOicgKyB0eXBlLCBwcm9wZXJ0aWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcGxheVRvZ2dsZSgpIHtcbiAgICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VfbW9kdWxlKG1vZHVsZSkge1xuICAgICAgICBtb2R1bGUgPSAkLmV4dGVuZCh7fSwgJC5lbWJlZHBsYXllci5kZWZhdWx0cywgbW9kdWxlKTtcbiAgICAgICAgdmFyIG9yaWdpbnMgPSB7fTtcbiAgICAgICAgaWYgKG1vZHVsZS5vcmlnaW4pIHtcbiAgICAgICAgICAgIGlmICghJC5pc0FycmF5KG1vZHVsZS5vcmlnaW4pKSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlLm9yaWdpbiA9IFttb2R1bGUub3JpZ2luXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbW9kdWxlLm9yaWdpbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW4gPSBtb2R1bGUub3JpZ2luW2ldO1xuICAgICAgICAgICAgICAgIGlmICgvXlxcL1xcLy8udGVzdChvcmlnaW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbnNbbG9jYXRpb24ucHJvdG9jb2wgKyBvcmlnaW5dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5zW29yaWdpbl0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtb2R1bGUub3JpZ2luID0gb3JpZ2lucztcbiAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0KHNlbGYsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkLmRhdGEoc2VsZiwgJ2VtYmVkcGxheWVyJyk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZHVsZSA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlID0gbWFrZV9tb2R1bGUob3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgb3JpZ2luIGluIG1vZHVsZS5vcmlnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbiBpbiAkLmVtYmVkcGxheWVyLm1vZHVsZXNfYnlfb3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYWxyZWFkeSBoYXZlIGVtYmVkcGxheWVyIG1vZHVsZSBmb3Igb3JpZ2luOiBcIiArIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJC5lbWJlZHBsYXllci5tb2R1bGVzX2J5X29yaWdpbltvcmlnaW5dID0gbW9kdWxlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkLmVtYmVkcGxheWVyLm1vZHVsZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhbmRpZGF0ZSA9ICQuZW1iZWRwbGF5ZXIubW9kdWxlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZS5tYXRjaGVzLmNhbGwoc2VsZikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIW1vZHVsZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ1bnN1cHBvcnRlZCBlbWJlZFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBtb2R1bGU6IG1vZHVsZSxcbiAgICAgICAgICAgICAgICBzdGF0ZTogJ2luaXQnLFxuICAgICAgICAgICAgICAgIGxpc3RlbmluZzoge1xuICAgICAgICAgICAgICAgICAgICByZWFkeTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwYXVzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcmluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHRpbWV1cGRhdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2b2x1bWVjaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbmNoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGV0YWlsOiB7fVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJC5kYXRhKHNlbGYsICdlbWJlZHBsYXllcicsIGRhdGEpO1xuXG4gICAgICAgICAgICB2YXIgb2sgPSBmYWxzZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlLmluaXQuY2FsbChzZWxmLCBkYXRhLCBmdW5jdGlvbihwbGF5ZXJfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wbGF5ZXJfaWQgPSBwbGF5ZXJfaWQ7XG4gICAgICAgICAgICAgICAgICAgICQuYXR0cihzZWxmLCAnZGF0YS1lbWJlZHBsYXllci1pZCcsIHBsYXllcl9pZCA9PT0gdW5kZWZpbmVkID8gJycgOiBwbGF5ZXJfaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG9rID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvaykge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyBpdCBsaWtlIHRoYXQgYmVjYXVzZSBjYXRjaCBhbmQgcmUtdGhyb3dcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlcyB0aGUgc3RhY2sgdHJhY2UgaW4gc29tZSBicm93c2Vyc1xuICAgICAgICAgICAgICAgICAgICAkLnJlbW92ZURhdGEoc2VsZiwgJ2VtYmVkcGxheWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgICQuZm4uZW1iZWRwbGF5ZXIgPSBmdW5jdGlvbihjb21tYW5kLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb21tYW5kID0gXCJpbml0XCI7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2YoY29tbWFuZCkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBjb21tYW5kO1xuICAgICAgICAgICAgY29tbWFuZCA9IFwiaW5pdFwiO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICBjYXNlIFwiaW5pdFwiOlxuICAgICAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbigpIHsgaW5pdCh0aGlzLCBvcHRpb25zKTsgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJwbGF5XCI6XG4gICAgICAgICAgICBjYXNlIFwicGF1c2VcIjpcbiAgICAgICAgICAgIGNhc2UgXCJzdG9wXCI6XG4gICAgICAgICAgICBjYXNlIFwidG9nZ2xlXCI6XG4gICAgICAgICAgICBjYXNlIFwibmV4dFwiOlxuICAgICAgICAgICAgY2FzZSBcInByZXZcIjpcbiAgICAgICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGVbY29tbWFuZF0uY2FsbCh0aGlzLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInNlZWtcIjpcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBOdW1iZXIoYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGUuc2Vlay5jYWxsKHRoaXMsIGRhdGEsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImxpc3RlblwiOlxuICAgICAgICAgICAgICAgIHZhciBldmVudHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/XG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1sxXSA6IFtcInJlYWR5XCIsIFwicGxheVwiLCBcInBhdXNlXCIsIFwiZmluaXNoXCIsIFwiYnVmZmVyaW5nXCIsIFwidGltZXVwZGF0ZVwiLCBcInZvbHVtZWNoYW5nZVwiLCBcImR1cmF0aW9uY2hhbmdlXCIsIFwiZXJyb3JcIl07XG4gICAgICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoZXZlbnRzKSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMgPSAkLnRyaW0oZXZlbnRzKS5zcGxpdCgvXFxzKy8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGUubGlzdGVuLmNhbGwodGhpcywgZGF0YSwgZXZlbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubGlzdGVuaW5nW2V2ZW50c1tpXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgXCJ2b2x1bWVcIjpcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgdHlwZW9mKGFyZ3VtZW50c1sxXSkgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdm9sdW1lID0gTnVtYmVyKGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlLnNldFZvbHVtZS5jYWxsKHRoaXMsIGRhdGEsIHZvbHVtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgKGFyZ3VtZW50c1sxXSB8fCAkLm5vb3ApKE5hTik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBpbml0KHRoaXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tb2R1bGUudm9sdW1lLmNhbGwodGhpc1swXSwgZGF0YSwgYXJndW1lbnRzWzFdIHx8ICQubm9vcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFwiZHVyYXRpb25cIjpcbiAgICAgICAgICAgIGNhc2UgXCJjdXJyZW50dGltZVwiOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAoYXJndW1lbnRzWzFdIHx8ICQubm9vcCkoTmFOKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGluaXQodGhpc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLm1vZHVsZVtjb21tYW5kXS5jYWxsKHRoaXNbMF0sIGRhdGEsIGFyZ3VtZW50c1sxXSB8fCAkLm5vb3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcImxpbmtcIjpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBpbml0KHRoaXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tb2R1bGUubGluay5jYWxsKHRoaXNbMF0sIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBcInN1cHBvcnRlZFwiOlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCAkLmVtYmVkcGxheWVyLm1vZHVsZXMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW5kaWRhdGUgPSAkLmVtYmVkcGxheWVyLm1vZHVsZXNbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlLm1hdGNoZXMuY2FsbChzZWxmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1cHBvcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGggPiAwO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ1bmtub3duIGNvbW1hbmQ6IFwiICsgY29tbWFuZCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciBtb2R1bGUgPSAkLmVtYmVkcGxheWVyLm1vZHVsZXNfYnlfb3JpZ2luW2V2ZW50Lm9yaWdpbl07XG4gICAgICAgIGlmIChtb2R1bGUpIHtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbW9kdWxlLnBhcnNlTWVzc2FnZShldmVudCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHZhciBpZnJhbWVzID0gJ3BsYXllcl9pZCcgaW4gbWVzc2FnZSA/XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lmcmFtZVtkYXRhLWVtYmVkcGxheWVyLWlkPVwiJyArIG1lc3NhZ2UucGxheWVyX2lkICsgJ1wiXScpIDpcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWZyYW1lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWZyYW1lID0gaWZyYW1lc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlmcmFtZS5jb250ZW50V2luZG93ID09PSBldmVudC5zb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW5pdChpZnJhbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGUucHJvY2Vzc01lc3NhZ2UuY2FsbChpZnJhbWUsIGRhdGEsIG1lc3NhZ2UsICQuZW1iZWRwbGF5ZXIudHJpZ2dlci5iaW5kKCQuZW1iZWRwbGF5ZXIsIGlmcmFtZSwgZGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG59KShqUXVlcnkpOyIsIi8qIDIwMTcuIDAzLiBcbiovXG5cblxuLyogPT09PT09PSBSZXNwb25zaXZlIFdlYiA9PT09PT09ICovXG5jb25zdCBoUFggPSB7XG4gICAgaGVhZGVyOiA1MCxcbiAgICBhdWRpb1BsYXllciA6IDgwLFxuICAgIGlucHV0Qm94IDogNDVcbn1cblxuY29uc3QgcmVzaXplTWFpbkhlaWdodCA9IGZ1bmN0aW9uKCl7XG4gIHV0aWwuJChcIiNtYWluXCIpLnN0eWxlLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhQWC5oZWFkZXIgLSBoUFguYXVkaW9QbGF5ZXIgKydweCc7XG4gIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLnN0eWxlLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhQWC5oZWFkZXIgLSBoUFguYXVkaW9QbGF5ZXIgLSBoUFguaW5wdXRCb3ggKyAncHgnO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJyxmdW5jdGlvbigpe1xuICAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbn0pO1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBmdW5jdGlvbigpIHtcbiAgICBzZWFyY2hMaXN0Vmlldy5jYWxsU2VhcmNoQVBJKCk7XG4gICAgcmVzaXplTWFpbkhlaWdodCgpO1xufSk7XG5cblxuLyogPT09PT09PSBVdGlsaXR5ID09PT09PT0gKi9cbnZhciB1dGlsID0ge1xuICAgIHJ1bkFqYXggOiBmdW5jdGlvbih1cmwsIGxpc3RlbmVyLCByZXFGdW5jKXtcbiAgICAgICAgbGV0IG9SZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgb1JlcS5hZGRFdmVudExpc3RlbmVyKGxpc3RlbmVyLCByZXFGdW5jKTtcbiAgICAgICAgb1JlcS5vcGVuKFwiR0VUXCIsIHVybCk7XG4gICAgICAgIG9SZXEuc2VuZCgpO1xuICAgIH0sXG4gICAgJDogZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIH0sXG4gICAgJCQ6IGZ1bmN0aW9uKHNlbGVjdG9yKXtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIH0sXG4gICAgdGltZUFnbzogZnVuY3Rpb24oc2VsZWN0b3Ipe1xuXG4gICAgdmFyIHRlbXBsYXRlcyA9IHtcbiAgICAgICAgcHJlZml4OiBcIlwiLFxuICAgICAgICBzdWZmaXg6IFwiIGFnb1wiLFxuICAgICAgICBzZWNvbmRzOiBcImxlc3MgdGhhbiBhIG1pbnV0ZVwiLFxuICAgICAgICBtaW51dGU6IFwiYWJvdXQgYSBtaW51dGVcIixcbiAgICAgICAgbWludXRlczogXCIlZCBtaW51dGVzXCIsXG4gICAgICAgIGhvdXI6IFwiYWJvdXQgYW4gaG91clwiLFxuICAgICAgICBob3VyczogXCJhYm91dCAlZCBob3Vyc1wiLFxuICAgICAgICBkYXk6IFwiYSBkYXlcIixcbiAgICAgICAgZGF5czogXCIlZCBkYXlzXCIsXG4gICAgICAgIG1vbnRoOiBcImFib3V0IGEgbW9udGhcIixcbiAgICAgICAgbW9udGhzOiBcIiVkIG1vbnRoc1wiLFxuICAgICAgICB5ZWFyOiBcImFib3V0IGEgeWVhclwiLFxuICAgICAgICB5ZWFyczogXCIlZCB5ZWFyc1wiXG4gICAgfTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbih0LCBuKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZXNbdF0gJiYgdGVtcGxhdGVzW3RdLnJlcGxhY2UoLyVkL2ksIE1hdGguYWJzKE1hdGgucm91bmQobikpKTtcbiAgICB9O1xuXG4gICAgdmFyIHRpbWVyID0gZnVuY3Rpb24odGltZSkge1xuICAgICAgICBpZiAoIXRpbWUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRpbWUgPSB0aW1lLnJlcGxhY2UoL1xcLlxcZCsvLCBcIlwiKTsgLy8gcmVtb3ZlIG1pbGxpc2Vjb25kc1xuICAgICAgICB0aW1lID0gdGltZS5yZXBsYWNlKC8tLywgXCIvXCIpLnJlcGxhY2UoLy0vLCBcIi9cIik7XG4gICAgICAgIHRpbWUgPSB0aW1lLnJlcGxhY2UoL1QvLCBcIiBcIikucmVwbGFjZSgvWi8sIFwiIFVUQ1wiKTtcbiAgICAgICAgdGltZSA9IHRpbWUucmVwbGFjZSgvKFtcXCtcXC1dXFxkXFxkKVxcOj8oXFxkXFxkKS8sIFwiICQxJDJcIik7IC8vIC0wNDowMCAtPiAtMDQwMFxuICAgICAgICB0aW1lID0gbmV3IERhdGUodGltZSAqIDEwMDAgfHwgdGltZSk7XG5cbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHZhciBzZWNvbmRzID0gKChub3cuZ2V0VGltZSgpIC0gdGltZSkgKiAuMDAxKSA+PiAwO1xuICAgICAgICB2YXIgbWludXRlcyA9IHNlY29uZHMgLyA2MDtcbiAgICAgICAgdmFyIGhvdXJzID0gbWludXRlcyAvIDYwO1xuICAgICAgICB2YXIgZGF5cyA9IGhvdXJzIC8gMjQ7XG4gICAgICAgIHZhciB5ZWFycyA9IGRheXMgLyAzNjU7XG5cbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlcy5wcmVmaXggKyAoXG4gICAgICAgICAgICAgICAgc2Vjb25kcyA8IDQ1ICYmIHRlbXBsYXRlKCdzZWNvbmRzJywgc2Vjb25kcykgfHxcbiAgICAgICAgICAgICAgICBzZWNvbmRzIDwgOTAgJiYgdGVtcGxhdGUoJ21pbnV0ZScsIDEpIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA8IDQ1ICYmIHRlbXBsYXRlKCdtaW51dGVzJywgbWludXRlcykgfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzIDwgOTAgJiYgdGVtcGxhdGUoJ2hvdXInLCAxKSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzIDwgMjQgJiYgdGVtcGxhdGUoJ2hvdXJzJywgaG91cnMpIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgPCA0MiAmJiB0ZW1wbGF0ZSgnZGF5JywgMSkgfHxcbiAgICAgICAgICAgICAgICBkYXlzIDwgMzAgJiYgdGVtcGxhdGUoJ2RheXMnLCBkYXlzKSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPCA0NSAmJiB0ZW1wbGF0ZSgnbW9udGgnLCAxKSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPCAzNjUgJiYgdGVtcGxhdGUoJ21vbnRocycsIGRheXMgLyAzMCkgfHxcbiAgICAgICAgICAgICAgICB5ZWFycyA8IDEuNSAmJiB0ZW1wbGF0ZSgneWVhcicsIDEpIHx8XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUoJ3llYXJzJywgeWVhcnMpXG4gICAgICAgICAgICAgICAgKSArIHRlbXBsYXRlcy5zdWZmaXg7XG4gICAgfTtcblxuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy52aWRlb1RpbWVBZ28nKTtcbiAgICBmb3IgKHZhciBpIGluIGVsZW1lbnRzKSB7XG4gICAgICAgIHZhciAkdGhpcyA9IGVsZW1lbnRzW2ldO1xuICAgICAgICBpZiAodHlwZW9mICR0aGlzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgJHRoaXMuaW5uZXJIVE1MID0gdGltZXIoJHRoaXMuZ2V0QXR0cmlidXRlKCd0aXRsZScpIHx8ICR0aGlzLmdldEF0dHJpYnV0ZSgnZGF0ZXRpbWUnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgfVxufVxuXG5cbi8qID09PT09PT0gWW91dHViZSBBUEkgU2V0dGluZyA9PT09PT09ICovXG5jb25zdCBzZXRUYXJnZXRVUkwgPSBmdW5jdGlvbihrZXl3b3JkLCBzR2V0VG9rZW4pe1xuICAgIFxuICAgIGNvbnN0IGJhc2VVUkwgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/cGFydD1zbmlwcGV0Jic7XG4gICAgdmFyIHNldHRpbmcgPSB7XG4gICAgICAgIG9yZGVyOiAndmlld0NvdW50JyxcbiAgICAgICAgbWF4UmVzdWx0czogMTUsXG4gICAgICAgIHR5cGU6ICd2aWRlbycsXG4gICAgICAgIHE6IGtleXdvcmQsXG4gICAgICAgIGtleTogJ0FJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZydcbiAgICB9XG4gXG4gICAgbGV0IHNUYXJnZXRVUkwgPSBPYmplY3Qua2V5cyhzZXR0aW5nKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGspICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2V0dGluZ1trXSk7XG4gICAgfSkuam9pbignJicpXG4gICAgXG4gICAgc1RhcmdldFVSTCA9IGJhc2VVUkwgKyBzVGFyZ2V0VVJMO1xuICAgIFxuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVSTCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuICAgIHJldHVybiBzVGFyZ2V0VVJMO1xufVxuXG5cbi8qID09PT09PT0gTW9kZWwgPT09PT09PSAqL1xuY29uc3QgeW91dHViZUFQSVNlYXJjaFJlc3VsdCA9IHtcbiAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFsbFZpZGVvcyA9IGpzb247IC8v7LKY7J2MIOuhnOuUqeuQoOuWhCDrqqjrk6Ag642w7J207YSw66W8IOqwgOyguOyYteuLiOuLpC5cbiAgICB9LFxuICAgIHNlbGVjdGVkVmlkZW9JRDogbnVsbCwgLy/shKDtg53tlZwg6rCSXG4gICAgbmV4dFBhZ2VUb2tlbk51bWVyOiBudWxsIC8v64uk7J2MIO2OmOydtOyngCDthqDtgbAg6rCSO1xufTtcblxuY29uc3QgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlciA9IHtcbiAgICBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgICBzZWFyY2hMaXN0Vmlldy5pbml0KCk7XG4gICAgfSxcbiAgICBnZXRBbGxWaWRlb3M6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmFsbFZpZGVvcy5pdGVtcztcbiAgICB9LFxuICAgIGdldE5leHRQYWdlVG9rZW46IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0Lm5leHRQYWdlVG9rZW5OdW1lcjtcbiAgICB9LFxuICAgIHNldE5leHRQYWdlVG9rZW46IGZ1bmN0aW9uKCl7XG4gICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQubmV4dFBhZ2VUb2tlbk51bWVyID0geW91dHViZUFQSVNlYXJjaFJlc3VsdC5hbGxWaWRlb3MubmV4dFBhZ2VUb2tlbjtcbiAgICB9LFxuICAgIGdldFNlbGVjdGVkVmlkZW9JRDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuc2VsZWN0ZWRWaWRlb0lEXG4gICAgfSxcbiAgICBzZXRTZWxlY3RlZFZpZGVvOiBmdW5jdGlvbihpZCl7XG4gICAgICAgIGlkID0geW91dHViZUFQSVNlYXJjaFJlc3VsdC5zZWxlY3RlZFZpZGVvSURcbiAgICB9XG59XG5cbmNvbnN0IHNlYXJjaExpc3RWaWV3ID0ge1xuICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICB0aGlzLmNvbnRlbnQgPSB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKTtcbiAgICAgICB0aGlzLnRlbXBsYXRlID0gdXRpbC4kKFwiI3NlYXJjaFZpZGVvXCIpLmlubmVySFRNTDtcbiAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgIHRoaXMuZXZlbnRzKCk7XG4gICAgXG4gICB9LFxuICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgIHZpZGVvcyA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0QWxsVmlkZW9zKCk7XG4gICAgICAgbGV0IHNIVE1MID0gJyc7XG4gICAgICAgZm9yIChsZXQgaT0wOyBpIDwgdmlkZW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgIGxldCB2aWRlb0ltYWdlVXJsID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmw7XG4gICAgICAgICAgIGxldCB2aWRlb1RpdGxlID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRpdGxlO1xuICAgICAgICAgICBsZXQgcHVibGlzaGVkQXQgPSB2aWRlb3NbaV0uc25pcHBldC5wdWJsaXNoZWRBdDtcbiAgICAgICAgICAgbGV0IHZpZGVvSWQgPSB2aWRlb3NbaV0uaWQudmlkZW9JZFxuICAgICAgICAgICBzRG9tID0gdGhpcy50ZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIHZpZGVvSW1hZ2VVcmwpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIHZpZGVvVGl0bGUpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3RpbWV9XCIsIHB1Ymxpc2hlZEF0KVxuICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1B1Ymxpc2hlZEF0fVwiLCBwdWJsaXNoZWRBdClcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9JZH1cIiwgdmlkZW9JZCk7XG4gICAgICAgICAgICBzSFRNTCA9IHNIVE1MICsgc0RvbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRlbnQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBzSFRNTCk7XG4gICAgfSxcbiAgICBcbiAgICBjYWxsU2VhcmNoQVBJOiBmdW5jdGlvbigpe1xuICAgICAgICB1dGlsLiQoXCIuZ29TZWFyY2hcIikuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoS2V5d29yZCA9IHV0aWwuJChcIiNzZWFyY2hfYm94XCIpLnZhbHVlO1xuICAgICAgICAgICAgc1VybCA9IHNldFRhcmdldFVSTCh0aGlzLnNlYXJjaEtleXdvcmQpO1xuICAgICAgICAgICAgdXRpbC5ydW5BamF4KHNVcmwsIFwibG9hZFwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGpzb24gPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmluaXQoKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmluaXQoKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLnNldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBzZWFyY2hMaXN0Vmlldy5tb3JlU2VhcmNoUmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgdXRpbC50aW1lQWdvKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIG1vcmVTZWFyY2hSZXN1bHQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2VhcmNoS2V5d29yZCA9IHV0aWwuJChcIiNzZWFyY2hfYm94XCIpLnZhbHVlO1xuICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIswqBmdW5jdGlvbigpe1xuwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgaWYodGhpcy5zY3JvbGxIZWlnaHTCoC3CoHRoaXMuc2Nyb2xsVG9wwqA9PT3CoHRoaXMuY2xpZW50SGVpZ2h0KcKge1xuICAgICAgICAgICAgICAgIG5leHRQYWdlVG9rID0gdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5nZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgc1VybCA9IHNldFRhcmdldFVSTCh0aGlzLnNlYXJjaEtleXdvcmQsIG5leHRQYWdlVG9rKTtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoCB1dGlsLnJ1bkFqYXgoc1VybCzCoFwibG9hZFwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIGpzb24gPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWwudGltZUFnbygpO1xuICAgICAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLnNldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoH1cbsKgwqDCoMKgwqDCoMKgwqB9KTsgIFxuICAgIH0sXG4gICAgZXZlbnRzOiBmdW5jdGlvbigpe1xuICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gZXZ0LnRhcmdldDtcbiAgICAgICAgICAgIGlmICh0YXJnZXQudGFnTmFtZSA9PT0gJ0knKXtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAoY29uc29sZS5sb2codGFyZ2V0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgIT09IFwiQlVUVE9OXCIpeyBcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB1dGlsLiQoXCIudmlkZW9JbmZvXCIpOyBcbiAgICAgICAgICAgICAgICB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmRhdGFzZXQuaWQgPSAnJztcbiAgICAgICAgICAgICAgICB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRlXCIpO1xuICAgICAgICAgICAgICAgIHNEb20gPSB1dGlsLiQoXCIjcHJldmlld1ZpZGVvXCIpLmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICBzSFRNTCA9IHNEb20ucmVwbGFjZShcIntkYXRhLWlkfVwiLCB0YXJnZXQuZGF0YXNldC5pZCk7XG4gICAgICAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5pbm5lckhUTUwgPSBzSFRNTDtcbiAgICAgICAgICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5jbGFzc0xpc3QuYWRkKFwibW9kYWwtb3BlblwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVQcmV2aWV3KCk7XG4gICAgICAgICAgICAgICAgfSkuY2FsbChzZWFyY2hMaXN0Vmlldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0YXJnZXQpO1xuICAgICAgICAgICAgLy8gZWxlbSA9ICBlbGVtLmNsb3Nlc3QoXCIudmlkZW9JbmZvXCIpOyAgXG4gICAgICAgICAgICAvLyAoY29uc29sZS5sb2coZWxlbSkpOyAgICAgIFxuICAgICAgICAgICAgLy8gaWYgKCFlbGVtKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH0sXG4gICAgaGlkZVByZXZpZXc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHV0aWwuJChcIi5jbG9zZV9idG5cIikuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIGxldCBidXR0b24gPSAgZXZ0LnRhcmdldC5jbG9zZXN0KFwiYnV0dG9uXCIpO1xuICAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5jbGFzc0xpc3QuYWRkKFwiaGlkZVwiKTtcbiAgICAgICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmNsYXNzTGlzdC5yZW1vdmUoXCJtb2RhbC1vcGVuXCIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuXG59XG5cbi8vICBydW5BamF4IDogZnVuY3Rpb24odXJsLCBsaXN0ZW5lciwgcmVxRnVuYyl7XG4vLyAgICAgICAgIGxldCBvUmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4vLyAgICAgICAgIG9SZXEuYWRkRXZlbnRMaXN0ZW5lcihsaXN0ZW5lciwgcmVxRnVuYyk7XG4vLyAgICAgICAgIG9SZXEub3BlbihcIkdFVFwiLCB1cmwpO1xuLy8gICAgICAgICBvUmVxLnNlbmQoKTtcbi8vICAgICB9LFxuICAgIFxuXG5cbi8vIGJ1dHRvbkxpa2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGV2dCl7XG4vLyAgICBsZXQgaWQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1wb3N0LWlkJyk7XG4vLyAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbi8vICAgICBpZiAoYnV0dG9uTGlrZS5jbGFzc0xpc3QuY29udGFpbnMoJ2Jsb2ctbGlrZScpKSB7XG4vLyAgICAgICAgIHZhciB1cmwgPSAnL2xpa2VfY291bnRfYmxvZy8/cG9zdF9pZD0nK2lkO1xuLy8gICAgIH1cbi8vICAgICBpZiAoYnV0dG9uTGlrZS5jbGFzc0xpc3QuY29udGFpbnMoJ3Byb2plY3QtbGlrZScpKSB7XG4vLyAgICAgICAgIHZhciB1cmwgPSAnL2xpa2VfY291bnRfcHJvamVjdC8/cHJvamVjdF9pZD0nK2lkO1xuLy8gICAgIH1cblxuLy8gICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuLy8gICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbi8vICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gMjAwKSB7XG4vLyAgICAgICAgIGxpa2VEYXRhLmlubmVySFRNTCA9IHhoci5yZXNwb25zZVRleHQ7XG4vLyAgICAgICAgIHRvZ2dsZUxpa2VJY29uKCk7XG4vLyAgICAgfVxuLy8gICAgIGVsc2Uge1xuLy8gICAgICAgICBhbGVydCgnUmVxdWVzdCBmYWlsZWQuICBSZXR1cm5lZCBzdGF0dXMgb2YgJyArIHhoci5zdGF0dXMpO1xuLy8gICAgIH1cbi8vIH07XG4vLyB4aHIuc2VuZCgpO1xuLy8gfSk7XG5cbi8vIGZ1bmN0aW9uIHRvZ2dsZUxpa2VJY29uKCl7XG4vLyAgICAgZm9yIChsZXQgZWxlIG9mIGljb24pe1xuLy8gICAgICAgICBpZiAoZWxlLnN0eWxlLmRpc3BsYXkgPT09ICdub25lJykge1xuLy8gICAgICAgICAgICAgZWxlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgZWxlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4vLyAgICAgICAgIH1cbi8vICAgICB9XG4vLyB9O1xuIiwiLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIG5hbWVTcGFjZSA9IHt9O1xubmFtZVNwYWNlLiRnZXR2YWwgPSAnJztcbm5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107XG5uYW1lU3BhY2UucGxheUxpc3QgPSBbXTtcbm5hbWVTcGFjZS5qZGF0YSA9IFtdO1xubmFtZVNwYWNlLmFsYnVtU3RvcmFnZSA9IGxvY2FsU3RvcmFnZTtcbi8vLy8vLy8vLy8vLy8gTkFNRSBTUEFDRSBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cbi8vREVWTU9ERS8vLy8vLy8vLy8vIE5BViBjb250cm9sIFNUQVJUIC8vLy8vLy8vLy8vL1xuLy9mdW5jdGlvbmFsaXR5MSA6IG5hdmlnYXRpb24gY29udHJvbFxudmFyIG5hdiA9IGZ1bmN0aW9uKCkge1xuICAgIC8vZ2V0IGVhY2ggYnRuIGluIG5hdiB3aXRoIGRvbSBkZWxlZ2F0aW9uIHdpdGgganF1ZXJ5IGFuZCBldmVudCBwcm9wYWdhdGlvblxuICAgICQoXCIubmF2X3BhcmVudFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTsgLy9idWJibGluZyBwcmV2ZW50XG4gICAgICAgIHZhciBjbGFzc05hbWUgPSAkKHRoaXMpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGNsYXNzTmFtZSk7XG4gICAgICAgIGlmIChjbGFzc05hbWUgPT0gXCJhbGJ1bV9idG5cIikge1xuICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLmhpZGUoKTsgLy/qsoDsg4kg6rKw6rO8IENsZWFyXG4gICAgICAgICAgICAkKFwiLmFkZE5ld01lZGlhXCIpLmhpZGUoKTsgLy/qsoDsg4kg7LC9IENsZWFyXG4gICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IFwicG9wdWxhcl9idG5cIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQT1BVTEFSLi4uLi4/XCIpO1xuICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLmhpZGUoKTsgLy/qsoDsg4kg6rKw6rO8IENsZWFyXG4gICAgICAgICAgICAkKFwiLmFkZE5ld01lZGlhXCIpLmhpZGUoKTsgLy/qsoDsg4kg7LC9IENsZWFyXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNFQVJDSCBCVE4hISEhXCIpXG4gICAgICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuc2hvdygpOyAvL+qygOyDiSDqsrDqs7wgQ2xlYXJcbiAgICAgICAgICAgICQoXCIuYWRkTmV3TWVkaWFcIikuc2hvdygpOyAvL+qygOyDiSDssL0gQ2xlYXJcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8vREVWTU9ERS8vLy8vLy8vLy8vIE5BViBjb250cm9sIEVORCAvLy8vLy8vLy8vLy9cblxubmF2KCk7IC8vbmF2IOyLpO2WiVxuLy8vLy8vLy8vLy8vLyBTRUFSQ0ggQVBJIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy8vXG52YXIgZm5HZXRMaXN0ID0gZnVuY3Rpb24oc0dldFRva2VuKSB7XG4gICAgbmFtZVNwYWNlLiRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKG5hbWVTcGFjZS4kZ2V0dmFsID09IFwiXCIpIHtcbiAgICAgICAgYWxlcnQgPT0gKFwi6rKA7IOJ7Ja07J6F66Cl67CU656N64uI64ukLlwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9DbGVhbnNpbmcgRG9tLCBWaWRlb0lkXG4gICAgbmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTsgLy9nZXR2aWRlb0lkIGFycmF57LSI6riw7ZmUXG4gICAgLy8gJChcIi5zZWFyY2hMaXN0XCIpLmVtcHR5KCk7IC8v6rKA7IOJIOqysOqzvCBWaWV37LSI6riw7ZmUXG4gICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcblxuICAgIC8vcXVlcnlzZWN0aW9uLy9cbiAgICAvLzE16rCc7JSpXG5cbiAgICB2YXIgc1RhcmdldFVybCA9IFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/cGFydD1zbmlwcGV0Jm9yZGVyPXJlbGV2YW5jZSZtYXhSZXN1bHRzPTE1JnR5cGU9dmlkZW9cIiArIFwiJnE9XCIgKyBlbmNvZGVVUklDb21wb25lbnQobmFtZVNwYWNlLiRnZXR2YWwpICsgXCIma2V5PUFJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZ1wiO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgICAgIGNvbnNvbGUubG9nKHNUYXJnZXRVcmwpO1xuICAgIH1cblxuICAgICQuYWpheCh7XG4gICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICB1cmw6IHNUYXJnZXRVcmwsXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpkYXRhKSB7XG4gICAgICAgICAgICBuYW1lU3BhY2UuamRhdGEgPSBqZGF0YTsgLy9qZGF0YS5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2VhcmNoUmVzdWx0VmlldygpO1xuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYWNlLmdldHZpZGVvSWQucHVzaChqZGF0YS5pdGVtc1tpXS5pZC52aWRlb0lkKTsgLy9uYW1lU3BhY2UuZ2V0dmlkZW9JZOyXkCDqsoDsg4nrkJwgdmlkZW9JRCDrsLDsl7TroZwg7LaU6rCAXG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhuYW1lU3BhY2UuZ2V0dmlkZW9JZFswXSk7XG4gICAgICAgICAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFswXSArIFwiJz9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgICAgICAgICAgICAgIC8vcGxheVZpZGVvU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICBnZXRNb3JlU2VhcmNoUmVzdWx0KGpkYXRhLm5leHRQYWdlVG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIGFsZXJ0KFwiZXJyb3JcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vIFNFQVJDSCBBUEkgRU5EIC8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy/siqTtgazroaQg64uk7Jq07IucIO2VqOyImCDsi6TtlontlZjquLAuXG52YXIgZ2V0TW9yZVNlYXJjaFJlc3VsdCA9IGZ1bmN0aW9uKG5leHRQYWdlVG9rZW4pe1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5zY3JvbGwoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZigkKHRoaXMpLnNjcm9sbFRvcCgpICsgJCh0aGlzKS5pbm5lckhlaWdodCgpID49ICQodGhpcylbMF0uc2Nyb2xsSGVpZ2h0KSB7XG4gICAgICAgICAgICBmbkdldExpc3QobmV4dFBhZ2VUb2tlbik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuXG5cblxuICAgIFxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBzZWFyY2hSZXN1bHRWaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlYXJjaFJlc3VsdExpc3QgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVTcGFjZS5qZGF0YS5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZ2V0VGVtcGxhdGUgPSAkKCcjc2VhcmNoVmlkZW8nKVswXTsgLy90ZW1wbGF0ZSBxdWVyeXNlbGVjdFxuICAgICAgICB2YXIgZ2V0SHRtbFRlbXBsYXRlID0gZ2V0VGVtcGxhdGUuaW5uZXJIVE1MOyAvL2dldCBodG1sIGluIHRlbXBsYXRlXG4gICAgICAgIHZhciBhZGFwdFRlbXBsYXRlID0gZ2V0SHRtbFRlbXBsYXRlLnJlcGxhY2UoXCJ7dmlkZW9JbWFnZX1cIiwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5kZWZhdWx0LnVybClcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRpdGxlKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9WaWV3c31cIiwgXCJUQkRcIilcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie2lkfVwiLCBpKTtcbiAgICAgICAgc2VhcmNoUmVzdWx0TGlzdCA9IHNlYXJjaFJlc3VsdExpc3QgKyBhZGFwdFRlbXBsYXRlO1xuICAgIH1cbiAgICAkKCcuc2VhcmNoTGlzdCcpLmVtcHR5KCkuYXBwZW5kKHNlYXJjaFJlc3VsdExpc3QpO1xufTtcblxuXG4vLy8vLy8vLy8vLy8gU0VBUkNIIFJFU1VMVCBWSUVXIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLyBQTEFZIFNFTEVDVCBWSURFTyBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vXG52YXIgcGxheVZpZGVvU2VsZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICB9KTtcbn07XG4vLy8vLy8vLyBQTEFZIFNFTEVDVCBWSURFTyBFTkQgLy8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy8vXG52YXIgYWRkUGxheUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICAkKFwiLnNlYXJjaFZpZGVvIGxpIGJ1dHRvblwiKS5vbihcImNsaWNrXCIsIFwiYnV0dG9uXCIsIGZ1bmN0aW9uKCkgeyAvLyDqsoDsg4nrkJwgbGlzdCBjbGlja+2WiOydhOqyveyasC5cbiAgICAgICAgY29uc29sZS5sb2coXCJBQUFBXCIpO1xuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIC8vIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oKTtcblxuICAgICAgICBjb25zb2xlLmxvZygkKHRoaXMpKTtcbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIEVORCAvLy8vLy8vLy8vLy8vLy8vL1xuXG5cblxuLy8gLy8gTGF5b3V0IOuzgOqyvVxuLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsZnVuY3Rpb24oKXtcbi8vICAgcmVzaXplTWFpbkhlaWdodCgpO1xuLy8gfSk7XG5cbi8vIHJlc2l6ZU1haW5IZWlnaHQoKTtcbi8vIGZ1bmN0aW9uIHJlc2l6ZU1haW5IZWlnaHQoKXtcbi8vICAgdmFyIGhlYWRlckhlaWdodCA9IDUwO1xuLy8gICB2YXIgYXVkaW9QbGF5ZXJIZWlnaHQgPSA4MDtcbi8vICAgdmFyIGlucHV0Qm94SGVpZ2h0ID0gNDU7XG4vLyAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpblwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkZXJIZWlnaHQgLSBhdWRpb1BsYXllckhlaWdodCArJ3B4Jztcbi8vICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5zZWFyY2hMaXN0XCIpLnN0eWxlLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWRlckhlaWdodCAtIGF1ZGlvUGxheWVySGVpZ2h0IC0gaW5wdXRCb3hIZWlnaHQgKyAncHgnO1xuLy8gfVxuXG5cblxuIiwiICAgICAgICBmdW5jdGlvbiBpbml0RW1iZWQoKSB7XG4gICAgICAgICAgICAkKHRoaXMpLm9uKCdlbWJlZHBsYXllcjpzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgJCgnI3N0YXRlJykudGV4dChldmVudC5zdGF0ZSk7XG4gICAgICAgICAgICB9KS5vbignZW1iZWRwbGF5ZXI6ZXJyb3InLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gZXZlbnQuZXJyb3IgfHwgJyc7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gXCIgXCIgKyBldmVudC50aXRsZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50Lm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBcIiBcIiArIGV2ZW50Lm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJyNlcnJvcicpLnRleHQobWVzc2FnZSk7XG4gICAgICAgICAgICB9KS5vbignZW1iZWRwbGF5ZXI6ZHVyYXRpb25jaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Zpbml0ZShldmVudC5kdXJhdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2N1cnJlbnR0aW1lJykuc2hvdygpLnByb3AoJ21heCcsIGV2ZW50LmR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCcjY3VycmVudHRpbWUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoJyNkdXJhdGlvbicpLnRleHQoZXZlbnQuZHVyYXRpb24udG9GaXhlZCgyKSArICcgc2Vjb25kcycpO1xuICAgICAgICAgICAgfSkub24oJ2VtYmVkcGxheWVyOnRpbWV1cGRhdGUnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgICQoJyNjdXJyZW50dGltZScpLnZhbChldmVudC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICAgICAgJCgnI2N1cnJlbnR0aW1lLXR4dCcpLnRleHQoZXZlbnQuY3VycmVudFRpbWUudG9GaXhlZCgyKSArICcgc2Vjb25kcycpO1xuICAgICAgICAgICAgfSkub24oJ2VtYmVkcGxheWVyOnZvbHVtZWNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgJCgnI3ZvbHVtZScpLnZhbChldmVudC52b2x1bWUpO1xuICAgICAgICAgICAgICAgICQoJyN2b2x1bWUtbGFiZWwnKS50ZXh0KFxuICAgICAgICAgICAgICAgICAgICBldmVudC52b2x1bWUgPD0gMCA/ICfwn5SHJyA6XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnZvbHVtZSA8PSAxIC8gMyA/ICfwn5SIJyA6XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnZvbHVtZSA8PSAyIC8gMyA/ICfwn5SJJyA6XG4gICAgICAgICAgICAgICAgICAgICfwn5SKJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgJCgnI3ZvbHVtZS10eHQnKS50ZXh0KGV2ZW50LnZvbHVtZS50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgIH0pLm9uKCdlbWJlZHBsYXllcjpyZWFkeScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmsgPSAkKHRoaXMpLmVtYmVkcGxheWVyKCdsaW5rJyk7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmspIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xpbmsnKS5hdHRyKCdocmVmJywgbGluayk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsaW5rLXdyYXBwZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlbWJlZHBsYXllcihcImxpc3RlblwiKS5cbiAgICAgICAgICAgIGVtYmVkcGxheWVyKCd2b2x1bWUnLCBmdW5jdGlvbih2b2x1bWUpIHtcbiAgICAgICAgICAgICAgICAkKCcjdm9sdW1lJykudGV4dCh2b2x1bWUudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvYWRWaWRlbyh0YWcsIHVybCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0cnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAndmlkZW8nLFxuICAgICAgICAgICAgICAgICAgICBzcmM6IHVybFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaWZyYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLmFsbG93ZnVsbHNjcmVlbiA9ICdhbGxvd2Z1bGxzY3JlZW4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuZnJhbWVib3JkZXIgPSAnMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycy53aWR0aCA9ICc2NDAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuaGVpZ2h0ID0gJzM2MCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlICd2aWRlbyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycy53aWR0aCA9ICc2NDAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuaGVpZ2h0ID0gJzM2MCc7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2F1ZGlvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLmNvbnRyb2xzID0gJ2NvbnRyb2xzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLnByZWxvYWQgPSAnYXV0byc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgnI2xpbmstd3JhcHBlcicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCc8JyArIHRhZyArICc+JykuYXR0cihhdHRycykucmVwbGFjZUFsbCgnI3ZpZGVvJykuZWFjaChpbml0RW1iZWQpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICQoJyNlcnJvcicpLnRleHQoU3RyaW5nKGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZ1bmN0aW9uIHVwZGF0ZVZpZGVvKCkge1xuICAgICAgICAvLyAgICAgdmFyIHZhbHVlID0gJCgnI2VtYmVkJykudmFsKCkuc3BsaXQoJ3wnKTtcbiAgICAgICAgLy8gICAgICQoJyNkdXJhdGlvbiwgI2N1cnJlbnR0aW1lLCAjdm9sdW1lJykudGV4dCgnPycpO1xuICAgICAgICAvLyAgICAgJCgnI3N0YXRlJykudGV4dCgnbG9hZGluZy4uLicpO1xuICAgICAgICAvLyAgICAgJCgnI2Vycm9yJykudGV4dCgnJyk7XG4gICAgICAgIC8vICAgICBsb2FkVmlkZW8odmFsdWVbMF0sIHZhbHVlWzFdKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8vICQoZG9jdW1lbnQpLnJlYWR5KHVwZGF0ZVZpZGVvKTsiLCIoZnVuY3Rpb24oJCwgdW5kZWZpbmVkKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZXZlbnRfbWFwID0ge1xuICAgICAgICByZWFkeTogbnVsbCxcbiAgICAgICAgcGxheTogbnVsbCxcbiAgICAgICAgcGF1c2U6IG51bGwsXG4gICAgICAgIGZpbmlzaDogbnVsbCxcbiAgICAgICAgYnVmZmVyaW5nOiBudWxsLFxuICAgICAgICB0aW1ldXBkYXRlOiBudWxsLFxuICAgICAgICBkdXJhdGlvbmNoYW5nZTogbnVsbCxcbiAgICAgICAgdm9sdW1lY2hhbmdlOiBudWxsLFxuICAgICAgICBlcnJvcjogXCJvbkVycm9yXCJcbiAgICB9O1xuXG4gICAgdmFyIG5leHRfaWQgPSAxO1xuXG4gICAgJC5lbWJlZHBsYXllci5yZWdpc3Rlcih7XG4gICAgICAgIG9yaWdpbjogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tJyxcbiAgICAgICAgbWF0Y2hlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gJC5ub2RlTmFtZSh0aGlzLCBcImlmcmFtZVwiKSAmJiAvXmh0dHBzPzpcXC9cXC8od3d3XFwuKT95b3V0dWJlKC1ub2Nvb2tpZSk/XFwuY29tXFwvZW1iZWRcXC9bLV9hLXowLTldKy4qW1xcPyZdZW5hYmxlanNhcGk9MS9pLnRlc3QodGhpcy5zcmMpO1xuICAgICAgICB9LFxuICAgICAgICBpbml0OiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwucGxheWVyX2lkID0gbmV4dF9pZCsrO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwub3JpZ2luID0gL15odHRwcz86XFwvXFwvKHd3d1xcLik/eW91dHViZS1ub2Nvb2tpZVxcLmNvbVxcLy9pLnRlc3QodGhpcy5zcmMpID8gJ2h0dHBzOi8vd3d3LnlvdXR1YmUtbm9jb29raWUuY29tJyA6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbSc7XG4gICAgICAgICAgICBkYXRhLmRldGFpbC5kdXJhdGlvbiA9IE5hTjtcbiAgICAgICAgICAgIGRhdGEuZGV0YWlsLmN1cnJlbnR0aW1lID0gMDtcbiAgICAgICAgICAgIGRhdGEuZGV0YWlsLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICBkYXRhLmRldGFpbC5jb21tYW5kcyA9IFtdO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwudmlkZW9faWQgPSAvXmh0dHBzPzpcXC9cXC8oPzp3d3dcXC4pP3lvdXR1YmUoPzotbm9jb29raWUpP1xcLmNvbVxcL2VtYmVkXFwvKFstX2EtejAtOV0rKS9pLmV4ZWModGhpcy5zcmMpWzFdO1xuICAgICAgICAgICAgZGF0YS5kZXRhaWwudGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoISQuY29udGFpbnMoc2VsZi5vd25lckRvY3VtZW50LmJvZHksIHNlbGYpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoZGF0YS5kZXRhaWwudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC50aW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlbGYuY29udGVudFdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoeyBldmVudDogJ2xpc3RlbmluZycsIGlkOiBkYXRhLmRldGFpbC5wbGF5ZXJfaWQgfSksIGRhdGEuZGV0YWlsLm9yaWdpbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCd5b3V0dWJlXycgKyBkYXRhLmRldGFpbC5wbGF5ZXJfaWQpO1xuICAgICAgICB9LFxuICAgICAgICBwbGF5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBzZW5kKHRoaXMsIGRhdGEsIFwicGxheVZpZGVvXCIpO1xuICAgICAgICB9LFxuICAgICAgICBwYXVzZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCBcInBhdXNlVmlkZW9cIik7XG4gICAgICAgIH0sXG4gICAgICAgIHN0b3A6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHNlbmQodGhpcywgZGF0YSwgXCJzdG9wVmlkZW9cIik7XG4gICAgICAgIH0sXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHNlbmQodGhpcywgZGF0YSwgXCJuZXh0VmlkZW9cIik7XG4gICAgICAgIH0sXG4gICAgICAgIHByZXY6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHNlbmQodGhpcywgZGF0YSwgXCJwcmV2aW91c1ZpZGVvXCIpO1xuICAgICAgICB9LFxuICAgICAgICB2b2x1bWU6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhkYXRhLmRldGFpbC52b2x1bWUpO1xuICAgICAgICB9LFxuICAgICAgICBkdXJhdGlvbjogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGRhdGEuZGV0YWlsLmR1cmF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgY3VycmVudHRpbWU6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhkYXRhLmRldGFpbC5jdXJyZW50dGltZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFZvbHVtZTogZnVuY3Rpb24oZGF0YSwgdm9sdW1lKSB7XG4gICAgICAgICAgICBzZW5kKHRoaXMsIGRhdGEsICdzZXRWb2x1bWUnLCB2b2x1bWUgKiAxMDApO1xuICAgICAgICB9LFxuICAgICAgICBzZWVrOiBmdW5jdGlvbihkYXRhLCBwb3NpdGlvbikge1xuICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCAnc2Vla1RvJywgcG9zaXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBsaXN0ZW46IGZ1bmN0aW9uKGRhdGEsIGV2ZW50cykge1xuICAgICAgICAgICAgdmFyIGRvbmUgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ID0gZXZlbnRfbWFwW2V2ZW50c1tpXV07XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50ICYmIGRvbmVbZXZlbnRdICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmVbZXZlbnRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2VuZCh0aGlzLCBkYXRhLCAnYWRkRXZlbnRMaXN0ZW5lcicsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj0nICsgZGF0YS5kZXRhaWwudmlkZW9faWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHBhcnNlTWVzc2FnZTogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IEpTT04ucGFyc2UoZXZlbnQuZGF0YSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtZXNzYWdlLnBsYXllcl9pZCA9ICd5b3V0dWJlXycgKyBtZXNzYWdlLmRhdGEuaWQ7XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJvY2Vzc01lc3NhZ2U6IGZ1bmN0aW9uKGRhdGEsIG1lc3NhZ2UsIHRyaWdnZXIpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmRhdGEuZXZlbnQgPT09IFwiaW5mb0RlbGl2ZXJ5XCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5mbyA9IG1lc3NhZ2UuZGF0YS5pbmZvO1xuICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgndm9sdW1lJyBpbiBpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdm9sdW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8ubXV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b2x1bWUgPSAwLjA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvbHVtZSA9IGluZm8udm9sdW1lIC8gMTAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZGV0YWlsLnZvbHVtZSAhPT0gdm9sdW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5kZXRhaWwudm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoXCJ2b2x1bWVjaGFuZ2VcIiwgeyB2b2x1bWU6IHZvbHVtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgncGxheWVyU3RhdGUnIGluIGluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5mby5wbGF5ZXJTdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgLTE6IC8vIHVuc3RhcnRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDogLy8gZW5kZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcImZpbmlzaFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6IC8vIHBsYXlpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcInBsYXlcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAyOiAvLyBwYXVzZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcInBhdXNlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzogLy8gYnVmZmVyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoXCJidWZmZXJpbmdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA1OiAvLyBjdWVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXIoXCJwYXVzZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJ2R1cmF0aW9uJyBpbiBpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5kdXJhdGlvbiAhPT0gZGF0YS5kZXRhaWwuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC5kdXJhdGlvbiA9IGluZm8uZHVyYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcImR1cmF0aW9uY2hhbmdlXCIsIHsgZHVyYXRpb246IGluZm8uZHVyYXRpb24gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJ2N1cnJlbnRUaW1lJyBpbiBpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5jdXJyZW50VGltZSAhPT0gZGF0YS5kZXRhaWwuY3VycmVudHRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC5jdXJyZW50dGltZSA9IGluZm8uY3VycmVudFRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcihcInRpbWV1cGRhdGVcIiwgeyBjdXJyZW50VGltZTogaW5mby5jdXJyZW50VGltZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgndmlkZW9EYXRhJyBpbiBpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC52aWRlb0RhdGEgPSBpbmZvLnZpZGVvRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgnYXZhaWxhYmxlUXVhbGl0eUxldmVscycgaW4gaW5mbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5kZXRhaWwuYXZhaWxhYmxlUXVhbGl0eUxldmVscyA9IGluZm8uYXZhaWxhYmxlUXVhbGl0eUxldmVscztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50ID09PSBcImluaXRpYWxEZWxpdmVyeVwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGV0YWlsLnRpbWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoZGF0YS5kZXRhaWwudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBkYXRhLmRldGFpbC50aW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmRhdGEuZXZlbnQgPT09IFwib25SZWFkeVwiKSB7XG4gICAgICAgICAgICAgICAgdHJpZ2dlcihcInJlYWR5XCIpO1xuICAgICAgICAgICAgICAgIHZhciB3aW4gPSB0aGlzLmNvbnRlbnRXaW5kb3c7XG4gICAgICAgICAgICAgICAgaWYgKHdpbiAmJiBkYXRhLmRldGFpbC5jb21tYW5kcykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZGV0YWlsLmNvbW1hbmRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW4ucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoZGF0YS5kZXRhaWwuY29tbWFuZHNbaV0pLCBkYXRhLmRldGFpbC5vcmlnaW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGV0YWlsLmNvbW1hbmRzID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCA9PT0gXCJvbkVycm9yXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3I7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLmRhdGEuaW5mbykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6IC8vIFRoZSByZXF1ZXN0IGNvbnRhaW5zIGFuIGludmFsaWQgcGFyYW1ldGVyIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBcImlsbGVnYWxfcGFyYW1ldGVyXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIDEwMDogLy8gVGhlIHZpZGVvIHJlcXVlc3RlZCB3YXMgbm90IGZvdW5kLlxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBcIm5vdF9mb3VuZFwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMDE6IC8vIFRoZSBvd25lciBvZiB0aGUgcmVxdWVzdGVkIHZpZGVvIGRvZXMgbm90IGFsbG93IGl0IHRvIGJlIHBsYXllZCBpbiBlbWJlZGRlZCBwbGF5ZXJzLlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE1MDogLy8gVGhpcyBlcnJvciBpcyB0aGUgc2FtZSBhcyAxMDEuIEl0J3MganVzdCBhIDEwMSBlcnJvciBpbiBkaXNndWlzZSFcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yID0gXCJmb3JiaWRkZW5cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvciA9IFwiZXJyb3JcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJpZ2dlcihcImVycm9yXCIsIHsgZXJyb3I6IGVycm9yIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBzZW5kKGVsZW1lbnQsIGRhdGEsIGZ1bmMpIHtcbiAgICAgICAgdmFyIGNvbW1hbmQgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5kZXRhaWwucGxheWVyX2lkLFxuICAgICAgICAgICAgZXZlbnQ6IFwiY29tbWFuZFwiLFxuICAgICAgICAgICAgZnVuYzogZnVuYyxcbiAgICAgICAgICAgIGFyZ3M6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMylcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZGF0YS5zdGF0ZSA9PT0gXCJpbml0XCIpIHtcbiAgICAgICAgICAgIGRhdGEuZGV0YWlsLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgd2luID0gZWxlbWVudC5jb250ZW50V2luZG93O1xuICAgICAgICAgICAgaWYgKHdpbikge1xuICAgICAgICAgICAgICAgIHdpbi5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShjb21tYW5kKSwgZGF0YS5kZXRhaWwub3JpZ2luKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pKGpRdWVyeSk7IiwiICAgICAgICAvKipcbiAgICAgICAgICogWW91dHViZSBBUEkg66Gc65OcXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgdGFnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICAgIHRhZy5zcmMgPSBcImh0dHA6Ly93d3cueW91dHViZS5jb20vaWZyYW1lX2FwaVwiO1xuICAgICAgICB2YXIgZmlyc3RTY3JpcHRUYWcgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF07XG4gICAgICAgIGZpcnN0U2NyaXB0VGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRhZywgZmlyc3RTY3JpcHRUYWcpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSDtlajsiJjripQg7ZWE7IiY66GcIOq1rO2YhO2VtOyVvCDtlZzri6QuXG4gICAgICAgICAqIO2UjOugiOydtOyWtCBBUEnsl5Ag64yA7ZWcIEphdmFTY3JpcHQg64uk7Jq066Gc65OcIOyZhOujjCDsi5wgQVBJ6rCAIOydtCDtlajsiJgg7Zi47Lac7ZWc64ukLlxuICAgICAgICAgKiDtjpjsnbTsp4Ag66Gc65OcIOyLnCDtkZzsi5ztlaAg7ZSM66CI7J207Ja0IOqwnOyytOulvCDrp4zrk6TslrTslbwg7ZWc64ukLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHBsYXllcjtcblxuICAgICAgICBmdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcbiAgICAgICAgICAgIHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3ZpZGVvUGxheWVyJywge1xuICAgICAgICAgICAgICAgIGhlaWdodDogJzEwMCAlJywgLy8gPGlmcmFtZT4g7YOc6re4IOyngOygleyLnCDtlYTsmpTsl4bsnYxcbiAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCAlJywgLy8gPGlmcmFtZT4g7YOc6re4IOyngOygleyLnCDtlYTsmpTsl4bsnYxcbiAgICAgICAgICAgICAgICB2aWRlb0lkOiAnOWJaa3A3cTE5ZjAnLCAvLyA8aWZyYW1lPiDtg5zqt7gg7KeA7KCV7IucIO2VhOyalOyXhuydjFxuICAgICAgICAgICAgICAgIHBsYXllclZhcnM6IHsgLy8gPGlmcmFtZT4g7YOc6re4IOyngOygleyLnCDtlYTsmpTsl4bsnYxcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHM6ICcyJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICdvblJlYWR5Jzogb25QbGF5ZXJSZWFkeSwgLy8g7ZSM66CI7J207Ja0IOuhnOuTnOqwgCDsmYTro4zrkJjqs6AgQVBJIO2YuOy2nOydhCDrsJvsnYQg7KSA67mE6rCAIOuQoCDrlYzrp4jri6Qg7Iuk7ZaJXG4gICAgICAgICAgICAgICAgICAgICdvblN0YXRlQ2hhbmdlJzogb25QbGF5ZXJTdGF0ZUNoYW5nZSAvLyDtlIzroIjsnbTslrTsnZgg7IOB7YOc6rCAIOuzgOqyveuQoCDrlYzrp4jri6Qg7Iuk7ZaJXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblBsYXllclJlYWR5KGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb25QbGF5ZXJSZWFkeSDsi6TtloknKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGxheWVyU3RhdGU7XG5cbiAgICAgICAgZnVuY3Rpb24gb25QbGF5ZXJTdGF0ZUNoYW5nZShldmVudCkge1xuICAgICAgICAgICAgcGxheWVyU3RhdGUgPSBldmVudC5kYXRhID09IFlULlBsYXllclN0YXRlLkVOREVEID8gJ+yiheujjOuQqCcgOlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyA/ICfsnqzsg50g7KSRJyA6XG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YSA9PSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQgPyAn7J287Iuc7KSR7KeAIOuQqCcgOlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuQlVGRkVSSU5HID8gJ+uyhO2NvOungSDspJEnIDpcbiAgICAgICAgICAgICAgICBldmVudC5kYXRhID09IFlULlBsYXllclN0YXRlLkNVRUQgPyAn7J6s7IOd7KSA67mEIOyZhOujjOuQqCcgOlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEgPT0gLTEgPyAn7Iuc7J6R65CY7KeAIOyViuydjCcgOiAn7JiI7Jm4JztcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ29uUGxheWVyU3RhdGVDaGFuZ2Ug7Iuk7ZaJOiAnICsgcGxheWVyU3RhdGUpO1xuXG4gICAgICAgICAgICAvLyDsnqzsg53sl6zrtoDrpbwg7Ya16rOE66GcIOyMk+uKlOuLpC5cbiAgICAgICAgICAgIGNvbGxlY3RQbGF5Q291bnQoZXZlbnQuZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwbGF5WW91dHViZSgpIHtcbiAgICAgICAgICAgIC8vIO2UjOugiOydtOyWtCDsnpDrj5nsi6TtlokgKOyjvOydmDog66qo67CU7J287JeQ7ISc64qUIOyekOuPmeyLpO2WieuQmOyngCDslYrsnYwpXG4gICAgICAgICAgICBwbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXVzZVlvdXR1YmUoKSB7XG4gICAgICAgICAgICBwbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3RvcFlvdXR1YmUoKSB7XG4gICAgICAgICAgICBwbGF5ZXIuc2Vla1RvKDAsIHRydWUpOyAvLyDsmIHsg4HsnZgg7Iuc6rCE7J2EIDDstIjroZwg7J2064+Z7Iuc7YKo64ukLlxuICAgICAgICAgICAgcGxheWVyLnN0b3BWaWRlbygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwbGF5ZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBjb2xsZWN0UGxheUNvdW50KGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhID09IFlULlBsYXllclN0YXRlLlBMQVlJTkcgJiYgcGxheWVkID09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gdG9kbyBzdGF0aXN0aWNzXG4gICAgICAgICAgICAgICAgcGxheWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhdGlzdGljcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGxvYWRWaWRlb0J5SWQg7ZWo7IiY64qUIOyngOygle2VnCDrj5nsmIHsg4HsnYQg66Gc65Oc7ZWY6rOgIOyerOyDne2VnOuLpC5cbiAgICAgICAgICog7J247IiY6rWs66y4OiBsb2FkVmlkZW9CeVVybChtZWRpYUNvbnRlbnRVcmw6U3RyaW5nLCBzdGFydFNlY29uZHM6TnVtYmVyLCBzdWdnZXN0ZWRRdWFsaXR5OlN0cmluZyk6Vm9pZFxuICAgICAgICAgKiDqsJzssrTqtazrrLg6IGxvYWRWaWRlb0J5VXJsKHttZWRpYUNvbnRlbnRVcmw6U3RyaW5nLCBzdGFydFNlY29uZHM6TnVtYmVyLCBlbmRTZWNvbmRzOk51bWJlciwgc3VnZ2VzdGVkUXVhbGl0eTpTdHJpbmd9KTpWb2lkXG4gICAgICAgICAqIGxvYWRWaWRlb0J5SWQg7ZWo7IiYIOu/kOunjCDslYTri4jrnbwg64uk66W4IOuMgOyytOyggeyduCDtlajsiJjrk6Trj4Qg6rCc7LK06rWs66y47J20IOq4sOuKpeydtCDrjZQg66eO64ukLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gY2hhbmdlVmlkZW9BbmRTdGFydCgpIHtcbiAgICAgICAgICAgIHBsYXllci5sb2FkVmlkZW9CeUlkKFwiaUNrWXczY1J3TG9cIiwgMCwgXCJsYXJnZVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNoYW5nZVZpZGVvT2JqZWN0QW5kU3RhcnQoKSB7XG4gICAgICAgICAgICAvLyAw7LSI67aA7YSwIDEw7LSI6rmM7KeAIOyerOyDneydhCDsi5ztgqjri6QuXG4gICAgICAgICAgICBwbGF5ZXIubG9hZFZpZGVvQnlJZCh7XG4gICAgICAgICAgICAgICAgJ3ZpZGVvSWQnOiAnYkhRcXZZeTVLWW8nLFxuICAgICAgICAgICAgICAgICdzdGFydFNlY29uZHMnOiAwLFxuICAgICAgICAgICAgICAgICdlbmRTZWNvbmRzJzogMTBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGxvYWRQbGF5bGlzdCDtlajsiJjripQg7KeA7KCV7ZWcIOyerOyDneuqqeuhneydhCDroZzrk5ztlZjqs6Ag7J6s7IOd7ZWc64ukLlxuICAgICAgICAgKiDsnbjsiJjqtazrrLg6IGxvYWRQbGF5bGlzdChwbGF5bGlzdDpTdHJpbmd8QXJyYXksIGluZGV4Ok51bWJlciwgc3RhcnRTZWNvbmRzOk51bWJlciwgc3VnZ2VzdGVkUXVhbGl0eTpTdHJpbmcpOlZvaWRcbiAgICAgICAgICog6rCc7LK06rWs66y4OiBsb2FkUGxheWxpc3Qoe2xpc3Q6U3RyaW5nLCBsaXN0VHlwZTpTdHJpbmcsIGluZGV4Ok51bWJlciwgc3RhcnRTZWNvbmRzOk51bWJlciwgc3VnZ2VzdGVkUXVhbGl0eTpTdHJpbmd9KTpWb2lkXG4gICAgICAgICAqIFvso7zsnZg6IOqwnOyytOq1rOusuOydmCBsb2FkUGxheWxpc3Qg7ZWo7IiY7JeQ7ISc7J2YIOyerOyDneuqqeuhnUlEIOyZgCDrj5nsmIHsg4FJRCDsnZgg7IKs7Jqp67Cp67KV7J20IOuLpOultOuLpC5dXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBjaGFuZ2VWaWRlb0xpc3RBbmRTdGFydCgpIHtcbiAgICAgICAgICAgIHBsYXllci5sb2FkUGxheWxpc3QoWyd3Y0xOdGVlejNjNCcsICdMT3NOUDJEMmtTQScsICdyWDM3Mlp3WE9FTSddLCAwLCAwLCAnbGFyZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNoYW5nZVZpZGVvTGlzdE9iamVjdEFuZFN0YXJ0KCkge1xuICAgICAgICAgICAgcGxheWVyLmxvYWRQbGF5bGlzdCh7XG4gICAgICAgICAgICAgICAgJ3BsYXlsaXN0JzogWyc5SFBpQkpCQ09xOCcsICdNcDREMG9IRW5qYycsICc4eTFEOEtHdEhmUScsICdqRUVGXzUwc0JySSddLFxuICAgICAgICAgICAgICAgICdsaXN0VHlwZSc6ICdwbGF5bGlzdCcsXG4gICAgICAgICAgICAgICAgJ2luZGV4JzogMCxcbiAgICAgICAgICAgICAgICAnc3RhcnRTZWNvbmRzJzogMCxcbiAgICAgICAgICAgICAgICAnc3VnZ2VzdGVkUXVhbGl0eSc6ICdzbWFsbCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2hhbmdlVmlkZW9MaXN0T2JqZWN0QW5kU3RhcnQyKCkge1xuICAgICAgICAgICAgcGxheWVyLmxvYWRQbGF5bGlzdCh7XG4gICAgICAgICAgICAgICAgJ2xpc3QnOiAnVVVQVzlUTXQwbGU2b3JQS2REd0xSOTN3JyxcbiAgICAgICAgICAgICAgICAnbGlzdFR5cGUnOiAncGxheWxpc3QnLFxuICAgICAgICAgICAgICAgICdpbmRleCc6IDAsXG4gICAgICAgICAgICAgICAgJ3N0YXJ0U2Vjb25kcyc6IDAsXG4gICAgICAgICAgICAgICAgJ3N1Z2dlc3RlZFF1YWxpdHknOiAnc21hbGwnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSJdfQ==
;