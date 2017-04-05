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



(function(window, undefined) {

'use strict';


var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
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
                '<div class="pl-list__icon"></div>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
              '<button class="pl-list__remove">'+
                '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                    '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'+
                    '<path d="M0 0h24v24H0z" fill="none"/>'+
                '</svg>'+
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
    volumeBtn      = player.querySelector('.volume__btn');
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

      player.parentNode.insertBefore(pl, player.nextSibling);

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
    pl.classList.toggle('h-show');
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
    volumeBtn.classList.remove('has-muted');
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
    {'icon': iconImage, 'title': 'Hitman', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3'},
    {'icon': iconImage, 'title': 'Dreamer', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreamer.mp3'},
    {'icon': iconImage, 'title': 'District Four', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3'},
    {'icon': iconImage, 'title': 'Christmas Rap', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Christmas%20Rap.mp3'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket%20Power.mp3'}
  ]
});

// TEST: update playlist
document.getElementById('addSongs').addEventListener('click', function(e) {
  e.preventDefault();
  AP.update([
    {'icon': iconImage, 'title': 'District Four', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3'},
    {'icon': iconImage, 'title': 'Christmas Rap', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Christmas%20Rap.mp3'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket%20Power.mp3'}
  ]);
})


console.log(AP.playList);
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
    // getChildOrder: function(elChild) {
    //     const elParent = elChild.parentNode;
    //     let nIndex = Array.prototype.indexOf.call(elParent.children, elChild);
    //     return nIndex;
    // },
    getObjValList: function(key, obj){
        return obj.map(function (el) { return el[key]; });
    },
}
/* Youtube API Setting */
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
    selectedVideo: null, //선택한 값
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
    getSelectedVideo: function(){

    },
    setSelectedVideo: function(){
        
    }
}

const searchListView = {
   init: function(){
       this.content = util.$(".searchList");
       this.template = util.$("#searchVideo").innerHTML;
       this.render();
       this.preview();
    
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
           .replace("{videoViews}", publishedAt)
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
                    videoSearchListController.setNextPageToken();
                });
            }
        });  
    },
    preview: function(){
        const closeButton =  util.$(".previewModal i");
        console.log(closeButton);
     

        util.$(".searchList").addEventListener('click', function(evt) {
           target = evt.target;
           if (target.tagName !== "li"){ target = util.$(".searchList li") }
           util.$(".previewModal").classList.remove("hide");
           util.$(".previewModal").innerHTML = util.$(".previewModal").innerHTML.replace("{data-id}", target.dataset.id);
        });

      
        
    }

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




},{}]},{},[1,2,3,4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9hdWRpb1BsYXllci5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9hdWRpb1BsYXllclNhbXBsZS5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2gtMS5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBdWRpb1BsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAvLyBQbGF5ZXIgdmFycyFcbiAgdmFyXG4gIGRvY1RpdGxlID0gZG9jdW1lbnQudGl0bGUsXG4gIHBsYXllciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwJyksXG4gIHBsYXllckNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51c2VyUGxheWxpc3QnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnIDxidXR0b24gY2xhc3M9XCJwbC1saXN0X19wbGF5IGljb25fYnRuXCI+PGkgY2xhc3M9XCJsYSBsYS1oZWFkcGhvbmVzXCI+PC9pPjwvYnV0dG9uPicrXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X19lcVwiPicrXG4gICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxXCI+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcV9fYmFyXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X190aXRsZVwiPnt0aXRsZX08L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGJ1dHRvbiBjbGFzcz1cInBsLWxpc3RfX3JlbW92ZSBpY29uX2J0blwiPicrXG4gICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwibGEgbGEtbWludXMtY2lyY2xlXCI+PC9pPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWUtYnRuJyk7XG4gICAgcGxCdG4gICAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcGxheWxpc3QnKTtcbiAgICBjdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWN1cnJlbnQnKTtcbiAgICBkdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWR1cmF0aW9uJyk7XG4gICAgdHJhY2tUaXRsZSAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aXRsZScpO1xuICAgIHByb2dyZXNzQmFyICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fYmFyJyk7XG4gICAgcHJlbG9hZEJhciAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19wcmVsb2FkJyk7XG4gICAgdm9sdW1lQmFyICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZV9fYmFyJyk7XG5cbiAgICBwbGF5TGlzdCA9IHNldHRpbmdzLnBsYXlMaXN0O1xuXG4gICAgcGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcblxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXBBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIHBsYXlsaXN0XG4gICAgcmVuZGVyUEwoKTtcbiAgICBwbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaW8gb2JqZWN0XG4gICAgYXVkaW8gPSBuZXcgQXVkaW8oKTtcbiAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgYXVkaW8ucHJlbG9hZCA9ICdhdXRvJztcblxuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gYXVkaW8udm9sdW1lICogMTAwICsgJyUnO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgaWYoc2V0dGluZ3MuYXV0b1BsYXkpIHtcbiAgICAgIGF1ZGlvLnBsYXkoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VEb2N1bWVudFRpdGxlKHRpdGxlKSB7XG4gICAgaWYoc2V0dGluZ3MuY2hhbmdlRG9jVGl0bGUpIHtcbiAgICAgIGlmKHRpdGxlKSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2NUaXRsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVVbmxvYWQoZXZ0KSB7XG4gICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnTXVzaWMgc3RpbGwgcGxheWluZyc7XG4gICAgICBldnQucmV0dXJuVmFsdWUgPSBtZXNzYWdlO1xuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKGV2dCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG1lZGlhRXJyb3IgPSB7XG4gICAgICAnMSc6ICdNRURJQV9FUlJfQUJPUlRFRCcsXG4gICAgICAnMic6ICdNRURJQV9FUlJfTkVUV09SSycsXG4gICAgICAnMyc6ICdNRURJQV9FUlJfREVDT0RFJyxcbiAgICAgICc0JzogJ01FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCdcbiAgICB9O1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBwbExpW2luZGV4XSAmJiBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgIHRocm93IG5ldyBFcnJvcignSG91c3RvbiB3ZSBoYXZlIGEgcHJvYmxlbTogJyArIG1lZGlhRXJyb3JbZXZ0LnRhcmdldC5lcnJvci5jb2RlXSk7XG4gIH1cblxuLyoqXG4gKiBVUERBVEUgUExcbiAqL1xuICBmdW5jdGlvbiB1cGRhdGVQTChhZGRMaXN0KSB7XG4gICAgaWYoIWFwQWN0aXZlKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBpcyBub3QgeWV0IGluaXRpYWxpemVkJztcbiAgICB9XG4gICAgaWYoIUFycmF5LmlzQXJyYXkoYWRkTGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYWRkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY291bnQgPSBwbGF5TGlzdC5sZW5ndGg7XG4gICAgdmFyIGh0bWwgID0gW107XG4gICAgcGxheUxpc3QucHVzaC5hcHBseShwbGF5TGlzdCwgYWRkTGlzdCk7XG4gICAgYWRkTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGh0bWwucHVzaChcbiAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgY291bnQrKykucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICApO1xuICAgIH0pO1xuICAgIC8vIElmIGV4aXN0IGVtcHR5IG1lc3NhZ2VcbiAgICBpZihwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLnJlbW92ZUNoaWxkKCBwbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSApO1xuICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICB9XG4gICAgLy8gQWRkIHNvbmcgaW50byBwbGF5bGlzdFxuICAgIHBsVWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVFbmQnLCBodG1sLmpvaW4oJycpKTtcbiAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcbiAgfVxuXG4vKipcbiAqICBQbGF5TGlzdCBtZXRob2RzXG4gKi9cbiAgICBmdW5jdGlvbiByZW5kZXJQTCgpIHtcbiAgICAgIHZhciBodG1sID0gW107XG5cbiAgICAgIHBsYXlMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaSkge1xuICAgICAgICBodG1sLnB1c2goXG4gICAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgaSkucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgcGwgPSBjcmVhdGUoJ2RpdicsIHtcbiAgICAgICAgJ2NsYXNzTmFtZSc6ICdwbC1jb250YWluZXInLFxuICAgICAgICAnaWQnOiAncGwnLFxuICAgICAgICAnaW5uZXJIVE1MJzogJzx1bCBjbGFzcz1cInBsLXVsXCI+JyArICghaXNFbXB0eUxpc3QoKSA/IGh0bWwuam9pbignJykgOiAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JykgKyAnPC91bD4nXG4gICAgICB9KTtcblxuICAgICAgcGxheWVyQ29udGFpbmVyLmluc2VydEJlZm9yZShwbCwgcGxheWVyQ29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgcGxVbCA9IHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC11bCcpO1xuICAgICAgcGxMaSA9IHBsVWwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgcGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RIYW5kbGVyKGV2dCkge1xuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmKGV2dC50YXJnZXQubWF0Y2hlcygnLnBsLWxpc3RfX3RpdGxlJykpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXJzZUludChldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0JykuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcbiAgICAgICAgaWYoaW5kZXggIT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBpbmRleCA9IGN1cnJlbnQ7XG4gICAgICAgICAgcGxheShjdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBwbGF5VG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmKCEhZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdF9fcmVtb3ZlJykpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbCA9IGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKTtcbiAgICAgICAgICAgIHZhciBpc0RlbCA9IHBhcnNlSW50KHBhcmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG5cbiAgICAgICAgICAgIHBsYXlMaXN0LnNwbGljZShpc0RlbCwgMSk7XG4gICAgICAgICAgICBwYXJlbnRFbC5jbG9zZXN0KCcucGwtdWwnKS5yZW1vdmVDaGlsZChwYXJlbnRFbCk7XG5cbiAgICAgICAgICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocGxMaSwgZnVuY3Rpb24oZWwsIGkpIHtcbiAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJywgaSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHBsYXkoaW5kZXgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJBbGwoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGlzRGVsID4gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSAxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICAgICAgICAgICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGlzRGVsIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbEFjdGl2ZSgpIHtcbiAgICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50ID0gaW5kZXg7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwbExpLmxlbmd0aDsgbGVuID4gaTsgaSsrKSB7XG4gICAgICAgIHBsTGlbaV0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgfVxuICAgICAgcGxMaVtjdXJyZW50XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgfVxuXG5cbi8qKlxuICogUGxheWVyIG1ldGhvZHNcbiAqL1xuICBmdW5jdGlvbiBwbGF5KGN1cnJlbnRJbmRleCkge1xuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGNsZWFyQWxsKCk7XG4gICAgfVxuXG4gICAgaW5kZXggPSAoY3VycmVudEluZGV4ICsgcGxheUxpc3QubGVuZ3RoKSAlIHBsYXlMaXN0Lmxlbmd0aDtcblxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgLy8gQ2hhbmdlIGRvY3VtZW50IHRpdGxlXG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgLy8gQXVkaW8gcGxheVxuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIC8vIFNob3cgbm90aWZpY2F0aW9uXG4gICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICBib2R5OiAnTm93IHBsYXlpbmcnLFxuICAgICAgdGFnOiAnbXVzaWMtcGxheWVyJ1xuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIHBsYXkgYnV0dG9uXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG5cbiAgICAvLyBTZXQgYWN0aXZlIHNvbmcgcGxheWxpc3RcbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldigpIHtcbiAgICBwbGF5KGluZGV4IC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBwbGF5TGlzdC5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckFsbCgpIHtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGF1ZGlvLnNyYyA9ICcnO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gJ3F1ZXVlIGlzIGVtcHR5JztcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIGlmKCFwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLmlubmVySFRNTCA9ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nO1xuICAgIH1cbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5VG9nZ2xlKCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgIGlmKGF1ZGlvLmN1cnJlbnRUaW1lID09PSAwKSB7XG4gICAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB9XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZvbHVtZVRvZ2dsZSgpIHtcbiAgICBpZihhdWRpby5tdXRlZCkge1xuICAgICAgaWYocGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCkgPT09IDApIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHNldHRpbmdzLnZvbHVtZSAqIDEwMCArICclJztcbiAgICAgICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2b2x1bWVMZW5ndGg7XG4gICAgICB9XG4gICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGVhdFRvZ2dsZSgpIHtcbiAgICBpZihyZXBlYXRCdG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmVwZWF0aW5nID0gZmFsc2U7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVwZWF0aW5nID0gdHJ1ZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbFRvZ2dsZSgpIHtcbiAgICBwbEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgICAvL3BsLmNsYXNzTGlzdC50b2dnbGUoJ2gtc2hvdycpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZVVwZGF0ZSgpIHtcbiAgICBpZihhdWRpby5yZWFkeVN0YXRlID09PSAwIHx8IHNlZWtpbmcpIHJldHVybjtcblxuICAgIHZhciBiYXJsZW5ndGggPSBNYXRoLnJvdW5kKGF1ZGlvLmN1cnJlbnRUaW1lICogKDEwMCAvIGF1ZGlvLmR1cmF0aW9uKSk7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSBiYXJsZW5ndGggKyAnJSc7XG5cbiAgICB2YXJcbiAgICBjdXJNaW5zID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAvIDYwKSxcbiAgICBjdXJTZWNzID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAtIGN1ck1pbnMgKiA2MCksXG4gICAgbWlucyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLyA2MCksXG4gICAgc2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLSBtaW5zICogNjApO1xuICAgIChjdXJTZWNzIDwgMTApICYmIChjdXJTZWNzID0gJzAnICsgY3VyU2Vjcyk7XG4gICAgKHNlY3MgPCAxMCkgJiYgKHNlY3MgPSAnMCcgKyBzZWNzKTtcblxuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gY3VyTWlucyArICc6JyArIGN1clNlY3M7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSBtaW5zICsgJzonICsgc2VjcztcblxuICAgIGlmKHNldHRpbmdzLmJ1ZmZlcmVkKSB7XG4gICAgICB2YXIgYnVmZmVyZWQgPSBhdWRpby5idWZmZXJlZDtcbiAgICAgIGlmKGJ1ZmZlcmVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgbG9hZGVkID0gTWF0aC5yb3VuZCgxMDAgKiBidWZmZXJlZC5lbmQoMCkgLyBhdWRpby5kdXJhdGlvbik7XG4gICAgICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSBsb2FkZWQgKyAnJSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRPRE8gc2h1ZmZsZVxuICAgKi9cbiAgZnVuY3Rpb24gc2h1ZmZsZSgpIHtcbiAgICBpZihzaHVmZmxlKSB7XG4gICAgICBpbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHBsYXlMaXN0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZG9FbmQoKSB7XG4gICAgaWYoaW5kZXggPT09IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFyZXBlYXRpbmcpIHtcbiAgICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgICAgcGxBY3RpdmUoKTtcbiAgICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwbGF5KDApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlQmFyKGV2dCwgZWwsIGRpcikge1xuICAgIHZhciB2YWx1ZTtcbiAgICBpZihkaXIgPT09ICdob3Jpem9udGFsJykge1xuICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKCAoKGV2dC5jbGllbnRYIC0gZWwub2Zmc2V0KCkubGVmdCkgKyB3aW5kb3cucGFnZVhPZmZzZXQpICAqIDEwMCAvIGVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGgpO1xuICAgICAgZWwuc3R5bGUud2lkdGggPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZihldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgICB2YWx1ZSA9IHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApO1xuICAgICAgICB2YXIgZGVsdGEgPSBldnQuZGVsdGFZIHx8IGV2dC5kZXRhaWwgfHwgLWV2dC53aGVlbERlbHRhO1xuICAgICAgICB2YWx1ZSA9IChkZWx0YSA+IDApID8gdmFsdWUgLSAxMCA6IHZhbHVlICsgMTA7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IChlbC5vZmZzZXQoKS50b3AgKyBlbC5vZmZzZXRIZWlnaHQpIC0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQoKG9mZnNldCAtIGV2dC5jbGllbnRZKSk7XG4gICAgICB9XG4gICAgICBpZih2YWx1ZSA+IDEwMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMTAwO1xuICAgICAgaWYodmFsdWUgPCAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAwO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJCYXIoZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmcgPSB0cnVlO1xuICAgICFyaWdodENsaWNrICYmIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIHNlZWsoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJWb2woZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSB0cnVlO1xuICAgIHNldFZvbHVtZShldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VlayhldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIHdpbmRvdy52YWx1ZSA9IG1vdmVCYXIoZXZ0LCBwcm9ncmVzc0JhciwgJ2hvcml6b250YWwnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZWVraW5nRmFsc2UoKSB7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICBhdWRpby5jdXJyZW50VGltZSA9IGF1ZGlvLmR1cmF0aW9uICogKHdpbmRvdy52YWx1ZSAvIDEwMCk7XG4gICAgICBwcm9ncmVzc0Jhci5jbGFzc0xpc3QucmVtb3ZlKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICB9XG4gICAgc2Vla2luZyA9IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZvbHVtZShldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcbiAgICBpZihzZWVraW5nVm9sICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlIHx8IGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICB2YXIgdmFsdWUgPSBtb3ZlQmFyKGV2dCwgdm9sdW1lQmFyLnBhcmVudE5vZGUsICd2ZXJ0aWNhbCcpIC8gMTAwO1xuICAgICAgaWYodmFsdWUgPD0gMCkge1xuICAgICAgICBhdWRpby52b2x1bWUgPSAwO1xuICAgICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZihhdWRpby5tdXRlZCkgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gdmFsdWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnkodGl0bGUsIGF0dHIpIHtcbiAgICBpZighc2V0dGluZ3Mubm90aWZpY2F0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKHdpbmRvdy5Ob3RpZmljYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhdHRyLnRhZyA9ICdBUCBtdXNpYyBwbGF5ZXInO1xuICAgIHdpbmRvdy5Ob3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oZnVuY3Rpb24oYWNjZXNzKSB7XG4gICAgICBpZihhY2Nlc3MgPT09ICdncmFudGVkJykge1xuICAgICAgICB2YXIgbm90aWNlID0gbmV3IE5vdGlmaWNhdGlvbih0aXRsZS5zdWJzdHIoMCwgMTEwKSwgYXR0cik7XG4gICAgICAgIHNldFRpbWVvdXQobm90aWNlLmNsb3NlLmJpbmQobm90aWNlKSwgNTAwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuLyogRGVzdHJveSBtZXRob2QuIENsZWFyIEFsbCAqL1xuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGlmKCFhcEFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcGxheUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcbiAgICBwbEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIC8vIFBsYXlsaXN0XG4gICAgcGwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIHBsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGwpO1xuXG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhcEFjdGl2ZSA9IGZhbHNlO1xuICAgIGluZGV4ID0gMDtcblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tIGIgICAgICAgIHV0ZWQnKTtcbiAgICBwbEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG5cbiAgICAvLyBSZW1vdmUgcGxheWVyIGZyb20gdGhlIERPTSBpZiBuZWNlc3NhcnlcbiAgICAvLyBwbGF5ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbGF5ZXIpO1xuICB9XG5cblxuLyoqXG4gKiAgSGVscGVyc1xuICovXG4gIGZ1bmN0aW9uIHdoZWVsKCkge1xuICAgIHZhciB3aGVlbDtcbiAgICBpZiAoJ29ud2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICd3aGVlbCc7XG4gICAgfSBlbHNlIGlmICgnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnbW91c2V3aGVlbCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZWVsID0gJ01vek1vdXNlUGl4ZWxTY3JvbGwnO1xuICAgIH1cbiAgICByZXR1cm4gd2hlZWw7XG4gIH1cblxuICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICBmb3IodmFyIG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgaWYoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlKGVsLCBhdHRyKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKTtcbiAgICBpZihhdHRyKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZihlbGVtZW50W25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlbGVtZW50W25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIEVsZW1lbnQucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgc2Nyb2xsTGVmdCA9IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCxcbiAgICBzY3JvbGxUb3AgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3A6IGVsLnRvcCArIHNjcm9sbFRvcCxcbiAgICAgIGxlZnQ6IGVsLmxlZnQgKyBzY3JvbGxMZWZ0XG4gICAgfTtcbiAgfTtcblxuICBFbGVtZW50LnByb3RvdHlwZS5jc3MgPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgaWYodHlwZW9mIGF0dHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLCAnJylbYXR0cl07XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIGF0dHIgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZih0aGlzLnN0eWxlW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLnN0eWxlW25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBtYXRjaGVzIHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyA9IEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSAobm9kZS5wYXJlbnROb2RlIHx8IG5vZGUuZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKG5vZGVzWysraV0gJiYgbm9kZXNbaV0gIT0gbm9kZSk7XG4gICAgICAgICAgcmV0dXJuICEhbm9kZXNbaV07XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAvLyBjbG9zZXN0IHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCA9IEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgZWwgPSB0aGlzO1xuICAgICAgICAgIHdoaWxlIChlbC5tYXRjaGVzICYmICFlbC5tYXRjaGVzKHNlbGVjdG9yKSkgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHJldHVybiBlbC5tYXRjaGVzID8gZWwgOiBudWxsO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbi8qKlxuICogIFB1YmxpYyBtZXRob2RzXG4gKi9cbiAgcmV0dXJuIHtcbiAgICBpbml0OiBpbml0LFxuICAgIHVwZGF0ZTogdXBkYXRlUEwsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG59KSgpO1xuXG53aW5kb3cuQVAgPSBBdWRpb1BsYXllcjtcblxufSkod2luZG93KTtcblxuLy8gVEVTVDogaW1hZ2UgZm9yIHdlYiBub3RpZmljYXRpb25zXG52YXIgaWNvbkltYWdlID0gJ2h0dHA6Ly9mdW5reWltZy5jb20vaS8yMXBYNS5wbmcnO1xuXG5BUC5pbml0KHtcbiAgcGxheUxpc3Q6IFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdUaGUgQmVzdCBvZiBCYWNoJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0RyZWFtZXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF1cbn0pO1xuXG4vLyBURVNUOiB1cGRhdGUgcGxheWxpc3Rcbi8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZFNvbmdzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4vLyAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBBUC51cGRhdGUoW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ31cbiAgXSk7XG4vL30pXG5cbiIsIlxuXG5cbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2ljb25cIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmVcIj4nK1xuICAgICAgICAgICAgICAgICc8c3ZnIGZpbGw9XCIjMDAwMDAwXCIgaGVpZ2h0PVwiMjBcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgd2lkdGg9XCIyMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPHBhdGggZD1cIk02IDE5YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY3SDZ2MTJ6TTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINXYyaDE0VjR6XCIvPicrXG4gICAgICAgICAgICAgICAgICAgICc8cGF0aCBkPVwiTTAgMGgyNHYyNEgwelwiIGZpbGw9XCJub25lXCIvPicrXG4gICAgICAgICAgICAgICAgJzwvc3ZnPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2J0bicpO1xuICAgIHBsQnRuICAgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXBsYXlsaXN0Jyk7XG4gICAgY3VyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1jdXJyZW50Jyk7XG4gICAgZHVyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1kdXJhdGlvbicpO1xuICAgIHRyYWNrVGl0bGUgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGl0bGUnKTtcbiAgICBwcm9ncmVzc0JhciAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX2JhcicpO1xuICAgIHByZWxvYWRCYXIgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fcHJlbG9hZCcpO1xuICAgIHZvbHVtZUJhciAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2JhcicpO1xuXG4gICAgcGxheUxpc3QgPSBzZXR0aW5ncy5wbGF5TGlzdDtcblxuICAgIHBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG5cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUsIGZhbHNlKTtcblxuICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGFwQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBwbGF5bGlzdFxuICAgIHJlbmRlclBMKCk7XG4gICAgcGxCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgLy8gQ3JlYXRlIGF1ZGlvIG9iamVjdFxuICAgIGF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgIGF1ZGlvLnByZWxvYWQgPSAnYXV0byc7XG5cbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IGF1ZGlvLnZvbHVtZSAqIDEwMCArICclJztcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIGlmKHNldHRpbmdzLmF1dG9QbGF5KSB7XG4gICAgICBhdWRpby5wbGF5KCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlRG9jdW1lbnRUaXRsZSh0aXRsZSkge1xuICAgIGlmKHNldHRpbmdzLmNoYW5nZURvY1RpdGxlKSB7XG4gICAgICBpZih0aXRsZSkge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jVGl0bGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlVW5sb2FkKGV2dCkge1xuICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gJ011c2ljIHN0aWxsIHBsYXlpbmcnO1xuICAgICAgZXZ0LnJldHVyblZhbHVlID0gbWVzc2FnZTtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVycm9ySGFuZGxlcihldnQpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBtZWRpYUVycm9yID0ge1xuICAgICAgJzEnOiAnTUVESUFfRVJSX0FCT1JURUQnLFxuICAgICAgJzInOiAnTUVESUFfRVJSX05FVFdPUksnLFxuICAgICAgJzMnOiAnTUVESUFfRVJSX0RFQ09ERScsXG4gICAgICAnNCc6ICdNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQnXG4gICAgfTtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgcGxMaVtpbmRleF0gJiYgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvdXN0b24gd2UgaGF2ZSBhIHByb2JsZW06ICcgKyBtZWRpYUVycm9yW2V2dC50YXJnZXQuZXJyb3IuY29kZV0pO1xuICB9XG5cbi8qKlxuICogVVBEQVRFIFBMXG4gKi9cbiAgZnVuY3Rpb24gdXBkYXRlUEwoYWRkTGlzdCkge1xuICAgIGlmKCFhcEFjdGl2ZSkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgaXMgbm90IHlldCBpbml0aWFsaXplZCc7XG4gICAgfVxuICAgIGlmKCFBcnJheS5pc0FycmF5KGFkZExpc3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGFkZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNvdW50ID0gcGxheUxpc3QubGVuZ3RoO1xuICAgIHZhciBodG1sICA9IFtdO1xuICAgIHBsYXlMaXN0LnB1c2guYXBwbHkocGxheUxpc3QsIGFkZExpc3QpO1xuICAgIGFkZExpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBodG1sLnB1c2goXG4gICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGNvdW50KyspLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICAvLyBJZiBleGlzdCBlbXB0eSBtZXNzYWdlXG4gICAgaWYocGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5yZW1vdmVDaGlsZCggcGwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykgKTtcbiAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgfVxuICAgIC8vIEFkZCBzb25nIGludG8gcGxheWxpc3RcbiAgICBwbFVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlRW5kJywgaHRtbC5qb2luKCcnKSk7XG4gICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG4gIH1cblxuLyoqXG4gKiAgUGxheUxpc3QgbWV0aG9kc1xuICovXG4gICAgZnVuY3Rpb24gcmVuZGVyUEwoKSB7XG4gICAgICB2YXIgaHRtbCA9IFtdO1xuXG4gICAgICBwbGF5TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGkpIHtcbiAgICAgICAgaHRtbC5wdXNoKFxuICAgICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGkpLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIHBsID0gY3JlYXRlKCdkaXYnLCB7XG4gICAgICAgICdjbGFzc05hbWUnOiAncGwtY29udGFpbmVyJyxcbiAgICAgICAgJ2lkJzogJ3BsJyxcbiAgICAgICAgJ2lubmVySFRNTCc6ICc8dWwgY2xhc3M9XCJwbC11bFwiPicgKyAoIWlzRW1wdHlMaXN0KCkgPyBodG1sLmpvaW4oJycpIDogJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPicpICsgJzwvdWw+J1xuICAgICAgfSk7XG5cbiAgICAgIHBsYXllci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwbCwgcGxheWVyLm5leHRTaWJsaW5nKTtcblxuICAgICAgcGxVbCA9IHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC11bCcpO1xuICAgICAgcGxMaSA9IHBsVWwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgcGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RIYW5kbGVyKGV2dCkge1xuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmKGV2dC50YXJnZXQubWF0Y2hlcygnLnBsLWxpc3RfX3RpdGxlJykpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXJzZUludChldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0JykuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcbiAgICAgICAgaWYoaW5kZXggIT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBpbmRleCA9IGN1cnJlbnQ7XG4gICAgICAgICAgcGxheShjdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBwbGF5VG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmKCEhZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdF9fcmVtb3ZlJykpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbCA9IGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKTtcbiAgICAgICAgICAgIHZhciBpc0RlbCA9IHBhcnNlSW50KHBhcmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG5cbiAgICAgICAgICAgIHBsYXlMaXN0LnNwbGljZShpc0RlbCwgMSk7XG4gICAgICAgICAgICBwYXJlbnRFbC5jbG9zZXN0KCcucGwtdWwnKS5yZW1vdmVDaGlsZChwYXJlbnRFbCk7XG5cbiAgICAgICAgICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocGxMaSwgZnVuY3Rpb24oZWwsIGkpIHtcbiAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJywgaSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHBsYXkoaW5kZXgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJBbGwoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGlzRGVsID4gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSAxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICAgICAgICAgICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGlzRGVsIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbEFjdGl2ZSgpIHtcbiAgICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50ID0gaW5kZXg7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwbExpLmxlbmd0aDsgbGVuID4gaTsgaSsrKSB7XG4gICAgICAgIHBsTGlbaV0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgfVxuICAgICAgcGxMaVtjdXJyZW50XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgfVxuXG5cbi8qKlxuICogUGxheWVyIG1ldGhvZHNcbiAqL1xuICBmdW5jdGlvbiBwbGF5KGN1cnJlbnRJbmRleCkge1xuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGNsZWFyQWxsKCk7XG4gICAgfVxuXG4gICAgaW5kZXggPSAoY3VycmVudEluZGV4ICsgcGxheUxpc3QubGVuZ3RoKSAlIHBsYXlMaXN0Lmxlbmd0aDtcblxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgLy8gQ2hhbmdlIGRvY3VtZW50IHRpdGxlXG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgLy8gQXVkaW8gcGxheVxuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIC8vIFNob3cgbm90aWZpY2F0aW9uXG4gICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICBib2R5OiAnTm93IHBsYXlpbmcnLFxuICAgICAgdGFnOiAnbXVzaWMtcGxheWVyJ1xuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIHBsYXkgYnV0dG9uXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG5cbiAgICAvLyBTZXQgYWN0aXZlIHNvbmcgcGxheWxpc3RcbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldigpIHtcbiAgICBwbGF5KGluZGV4IC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBwbGF5TGlzdC5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckFsbCgpIHtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGF1ZGlvLnNyYyA9ICcnO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gJ3F1ZXVlIGlzIGVtcHR5JztcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIGlmKCFwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLmlubmVySFRNTCA9ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nO1xuICAgIH1cbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5VG9nZ2xlKCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgIGlmKGF1ZGlvLmN1cnJlbnRUaW1lID09PSAwKSB7XG4gICAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB9XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZvbHVtZVRvZ2dsZSgpIHtcbiAgICBpZihhdWRpby5tdXRlZCkge1xuICAgICAgaWYocGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCkgPT09IDApIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHNldHRpbmdzLnZvbHVtZSAqIDEwMCArICclJztcbiAgICAgICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2b2x1bWVMZW5ndGg7XG4gICAgICB9XG4gICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGVhdFRvZ2dsZSgpIHtcbiAgICBpZihyZXBlYXRCdG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmVwZWF0aW5nID0gZmFsc2U7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVwZWF0aW5nID0gdHJ1ZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbFRvZ2dsZSgpIHtcbiAgICBwbEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgICBwbC5jbGFzc0xpc3QudG9nZ2xlKCdoLXNob3cnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVVcGRhdGUoKSB7XG4gICAgaWYoYXVkaW8ucmVhZHlTdGF0ZSA9PT0gMCB8fCBzZWVraW5nKSByZXR1cm47XG5cbiAgICB2YXIgYmFybGVuZ3RoID0gTWF0aC5yb3VuZChhdWRpby5jdXJyZW50VGltZSAqICgxMDAgLyBhdWRpby5kdXJhdGlvbikpO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gYmFybGVuZ3RoICsgJyUnO1xuXG4gICAgdmFyXG4gICAgY3VyTWlucyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLyA2MCksXG4gICAgY3VyU2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLSBjdXJNaW5zICogNjApLFxuICAgIG1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC8gNjApLFxuICAgIHNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC0gbWlucyAqIDYwKTtcbiAgICAoY3VyU2VjcyA8IDEwKSAmJiAoY3VyU2VjcyA9ICcwJyArIGN1clNlY3MpO1xuICAgIChzZWNzIDwgMTApICYmIChzZWNzID0gJzAnICsgc2Vjcyk7XG5cbiAgICBjdXJUaW1lLmlubmVySFRNTCA9IGN1ck1pbnMgKyAnOicgKyBjdXJTZWNzO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gbWlucyArICc6JyArIHNlY3M7XG5cbiAgICBpZihzZXR0aW5ncy5idWZmZXJlZCkge1xuICAgICAgdmFyIGJ1ZmZlcmVkID0gYXVkaW8uYnVmZmVyZWQ7XG4gICAgICBpZihidWZmZXJlZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IE1hdGgucm91bmQoMTAwICogYnVmZmVyZWQuZW5kKDApIC8gYXVkaW8uZHVyYXRpb24pO1xuICAgICAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gbG9hZGVkICsgJyUnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUT0RPIHNodWZmbGVcbiAgICovXG4gIGZ1bmN0aW9uIHNodWZmbGUoKSB7XG4gICAgaWYoc2h1ZmZsZSkge1xuICAgICAgaW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBwbGF5TGlzdC5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRvRW5kKCkge1xuICAgIGlmKGluZGV4ID09PSBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICBpZighcmVwZWF0aW5nKSB7XG4gICAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICAgIHBsQWN0aXZlKCk7XG4gICAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGxheSgwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwbGF5KGluZGV4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbW92ZUJhcihldnQsIGVsLCBkaXIpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgaWYoZGlyID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCggKChldnQuY2xpZW50WCAtIGVsLm9mZnNldCgpLmxlZnQpICsgd2luZG93LnBhZ2VYT2Zmc2V0KSAgKiAxMDAgLyBlbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoKTtcbiAgICAgIGVsLnN0eWxlLndpZHRoID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYoZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgICAgdmFsdWUgPSBwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKTtcbiAgICAgICAgdmFyIGRlbHRhID0gZXZ0LmRlbHRhWSB8fCBldnQuZGV0YWlsIHx8IC1ldnQud2hlZWxEZWx0YTtcbiAgICAgICAgdmFsdWUgPSAoZGVsdGEgPiAwKSA/IHZhbHVlIC0gMTAgOiB2YWx1ZSArIDEwO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAoZWwub2Zmc2V0KCkudG9wICsgZWwub2Zmc2V0SGVpZ2h0KSAtIHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKChvZmZzZXQgLSBldnQuY2xpZW50WSkpO1xuICAgICAgfVxuICAgICAgaWYodmFsdWUgPiAxMDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDEwMDtcbiAgICAgIGlmKHZhbHVlIDwgMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMDtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyQmFyKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nID0gdHJ1ZTtcbiAgICAhcmlnaHRDbGljayAmJiBwcm9ncmVzc0Jhci5jbGFzc0xpc3QuYWRkKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICBzZWVrKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyVm9sKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gdHJ1ZTtcbiAgICBzZXRWb2x1bWUoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWsoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICB3aW5kb3cudmFsdWUgPSBtb3ZlQmFyKGV2dCwgcHJvZ3Jlc3NCYXIsICdob3Jpem9udGFsJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2Vla2luZ0ZhbHNlKCkge1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgYXVkaW8uY3VycmVudFRpbWUgPSBhdWRpby5kdXJhdGlvbiAqICh3aW5kb3cudmFsdWUgLyAxMDApO1xuICAgICAgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LnJlbW92ZSgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgfVxuICAgIHNlZWtpbmcgPSBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRWb2x1bWUoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG4gICAgaWYoc2Vla2luZ1ZvbCAmJiByaWdodENsaWNrID09PSBmYWxzZSB8fCBldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgdmFyIHZhbHVlID0gbW92ZUJhcihldnQsIHZvbHVtZUJhci5wYXJlbnROb2RlLCAndmVydGljYWwnKSAvIDEwMDtcbiAgICAgIGlmKHZhbHVlIDw9IDApIHtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gMDtcbiAgICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYoYXVkaW8ubXV0ZWQpIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KHRpdGxlLCBhdHRyKSB7XG4gICAgaWYoIXNldHRpbmdzLm5vdGlmaWNhdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZih3aW5kb3cuTm90aWZpY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXR0ci50YWcgPSAnQVAgbXVzaWMgcGxheWVyJztcbiAgICB3aW5kb3cuTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKGZ1bmN0aW9uKGFjY2Vzcykge1xuICAgICAgaWYoYWNjZXNzID09PSAnZ3JhbnRlZCcpIHtcbiAgICAgICAgdmFyIG5vdGljZSA9IG5ldyBOb3RpZmljYXRpb24odGl0bGUuc3Vic3RyKDAsIDExMCksIGF0dHIpO1xuICAgICAgICBzZXRUaW1lb3V0KG5vdGljZS5jbG9zZS5iaW5kKG5vdGljZSksIDUwMDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbi8qIERlc3Ryb3kgbWV0aG9kLiBDbGVhciBBbGwgKi9cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBpZighYXBBY3RpdmUpIHJldHVybjtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHBsYXlCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG4gICAgcGxCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHByZXZCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICAvLyBQbGF5bGlzdFxuICAgIHBsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICBwbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsKTtcblxuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXBBY3RpdmUgPSBmYWxzZTtcbiAgICBpbmRleCA9IDA7XG5cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICBwbEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG5cbiAgICAvLyBSZW1vdmUgcGxheWVyIGZyb20gdGhlIERPTSBpZiBuZWNlc3NhcnlcbiAgICAvLyBwbGF5ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbGF5ZXIpO1xuICB9XG5cblxuLyoqXG4gKiAgSGVscGVyc1xuICovXG4gIGZ1bmN0aW9uIHdoZWVsKCkge1xuICAgIHZhciB3aGVlbDtcbiAgICBpZiAoJ29ud2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICd3aGVlbCc7XG4gICAgfSBlbHNlIGlmICgnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnbW91c2V3aGVlbCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZWVsID0gJ01vek1vdXNlUGl4ZWxTY3JvbGwnO1xuICAgIH1cbiAgICByZXR1cm4gd2hlZWw7XG4gIH1cblxuICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICBmb3IodmFyIG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgaWYoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlKGVsLCBhdHRyKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKTtcbiAgICBpZihhdHRyKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZihlbGVtZW50W25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlbGVtZW50W25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIEVsZW1lbnQucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgc2Nyb2xsTGVmdCA9IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCxcbiAgICBzY3JvbGxUb3AgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3A6IGVsLnRvcCArIHNjcm9sbFRvcCxcbiAgICAgIGxlZnQ6IGVsLmxlZnQgKyBzY3JvbGxMZWZ0XG4gICAgfTtcbiAgfTtcblxuICBFbGVtZW50LnByb3RvdHlwZS5jc3MgPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgaWYodHlwZW9mIGF0dHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLCAnJylbYXR0cl07XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIGF0dHIgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZih0aGlzLnN0eWxlW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLnN0eWxlW25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBtYXRjaGVzIHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyA9IEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSAobm9kZS5wYXJlbnROb2RlIHx8IG5vZGUuZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKG5vZGVzWysraV0gJiYgbm9kZXNbaV0gIT0gbm9kZSk7XG4gICAgICAgICAgcmV0dXJuICEhbm9kZXNbaV07XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAvLyBjbG9zZXN0IHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCA9IEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgZWwgPSB0aGlzO1xuICAgICAgICAgIHdoaWxlIChlbC5tYXRjaGVzICYmICFlbC5tYXRjaGVzKHNlbGVjdG9yKSkgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHJldHVybiBlbC5tYXRjaGVzID8gZWwgOiBudWxsO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbi8qKlxuICogIFB1YmxpYyBtZXRob2RzXG4gKi9cbiAgcmV0dXJuIHtcbiAgICBpbml0OiBpbml0LFxuICAgIHVwZGF0ZTogdXBkYXRlUEwsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG59KSgpO1xuXG53aW5kb3cuQVAgPSBBdWRpb1BsYXllcjtcblxufSkod2luZG93KTtcblxuLy8gVEVTVDogaW1hZ2UgZm9yIHdlYiBub3RpZmljYXRpb25zXG52YXIgaWNvbkltYWdlID0gJ2h0dHA6Ly9mdW5reWltZy5jb20vaS8yMXBYNS5wbmcnO1xuXG5BUC5pbml0KHtcbiAgcGxheUxpc3Q6IFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdIaXRtYW4nLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvSGl0bWFuLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0RyZWFtZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRHJlYW1lci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXVxufSk7XG5cbi8vIFRFU1Q6IHVwZGF0ZSBwbGF5bGlzdFxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZFNvbmdzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgQVAudXBkYXRlKFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXSk7XG59KVxuXG5cbmNvbnNvbGUubG9nKEFQLnBsYXlMaXN0KTsiLCIvKiAyMDE3LiAwMy4gXG4qL1xuXG5cbi8qID09PT09PT0gUmVzcG9uc2l2ZSBXZWIgPT09PT09PSAqL1xuY29uc3QgaFBYID0ge1xuICAgIGhlYWRlcjogNTAsXG4gICAgYXVkaW9QbGF5ZXIgOiA4MCxcbiAgICBpbnB1dEJveCA6IDQ1XG59XG5cbmNvbnN0IHJlc2l6ZU1haW5IZWlnaHQgPSBmdW5jdGlvbigpe1xuICB1dGlsLiQoXCIjbWFpblwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyICsncHgnO1xuICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyIC0gaFBYLmlucHV0Qm94ICsgJ3B4Jztcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsZnVuY3Rpb24oKXtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VhcmNoTGlzdFZpZXcuY2FsbFNlYXJjaEFQSSgpO1xuICAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbn0pO1xuXG5cbi8qID09PT09PT0gVXRpbGl0eSA9PT09PT09ICovXG52YXIgdXRpbCA9IHtcbiAgICBydW5BamF4IDogZnVuY3Rpb24odXJsLCBsaXN0ZW5lciwgcmVxRnVuYyl7XG4gICAgICAgIGxldCBvUmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIG9SZXEuYWRkRXZlbnRMaXN0ZW5lcihsaXN0ZW5lciwgcmVxRnVuYyk7XG4gICAgICAgIG9SZXEub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgICAgICBvUmVxLnNlbmQoKTtcbiAgICB9LFxuICAgICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgICQkOiBmdW5jdGlvbihzZWxlY3Rvcil7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgIC8vIGdldENoaWxkT3JkZXI6IGZ1bmN0aW9uKGVsQ2hpbGQpIHtcbiAgICAvLyAgICAgY29uc3QgZWxQYXJlbnQgPSBlbENoaWxkLnBhcmVudE5vZGU7XG4gICAgLy8gICAgIGxldCBuSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGVsUGFyZW50LmNoaWxkcmVuLCBlbENoaWxkKTtcbiAgICAvLyAgICAgcmV0dXJuIG5JbmRleDtcbiAgICAvLyB9LFxuICAgIGdldE9ialZhbExpc3Q6IGZ1bmN0aW9uKGtleSwgb2JqKXtcbiAgICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24gKGVsKSB7IHJldHVybiBlbFtrZXldOyB9KTtcbiAgICB9LFxufVxuLyogWW91dHViZSBBUEkgU2V0dGluZyAqL1xuY29uc3Qgc2V0VGFyZ2V0VVJMID0gZnVuY3Rpb24oa2V5d29yZCwgc0dldFRva2VuKXtcbiAgICBcbiAgICBjb25zdCBiYXNlVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCYnO1xuICAgIHZhciBzZXR0aW5nID0ge1xuICAgICAgICBvcmRlcjogJ3ZpZXdDb3VudCcsXG4gICAgICAgIG1heFJlc3VsdHM6IDE1LFxuICAgICAgICB0eXBlOiAndmlkZW8nLFxuICAgICAgICBxOiBrZXl3b3JkLFxuICAgICAgICBrZXk6ICdBSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWcnXG4gICAgfVxuIFxuICAgIGxldCBzVGFyZ2V0VVJMID0gT2JqZWN0LmtleXMoc2V0dGluZykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdba10pO1xuICAgIH0pLmpvaW4oJyYnKVxuICAgIFxuICAgIHNUYXJnZXRVUkwgPSBiYXNlVVJMICsgc1RhcmdldFVSTDtcbiAgICBcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVUkwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cbiAgICByZXR1cm4gc1RhcmdldFVSTDtcbn1cblxuXG4vKiA9PT09PT09IE1vZGVsID09PT09PT0gKi9cbmNvbnN0IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hbGxWaWRlb3MgPSBqc29uOyAvL+yymOydjCDroZzrlKnrkKDrloQg66qo65OgIOuNsOydtO2EsOulvCDqsIDsoLjsmLXri4jri6QuXG4gICAgfSxcbiAgICBzZWxlY3RlZFZpZGVvOiBudWxsLCAvL+yEoO2Dne2VnCDqsJJcbiAgICBuZXh0UGFnZVRva2VuTnVtZXI6IG51bGwgLy/ri6TsnYwg7Y6Y7J207KeAIO2GoO2BsCDqsJI7XG59O1xuXG5jb25zdCB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlYXJjaExpc3RWaWV3LmluaXQoKTtcbiAgICB9LFxuICAgIGdldEFsbFZpZGVvczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuYWxsVmlkZW9zLml0ZW1zO1xuICAgIH0sXG4gICAgZ2V0TmV4dFBhZ2VUb2tlbjogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQubmV4dFBhZ2VUb2tlbk51bWVyO1xuICAgIH0sXG4gICAgc2V0TmV4dFBhZ2VUb2tlbjogZnVuY3Rpb24oKXtcbiAgICAgICAgeW91dHViZUFQSVNlYXJjaFJlc3VsdC5uZXh0UGFnZVRva2VuTnVtZXIgPSB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmFsbFZpZGVvcy5uZXh0UGFnZVRva2VuO1xuICAgIH0sXG4gICAgZ2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oKXtcblxuICAgIH0sXG4gICAgc2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgfVxufVxuXG5jb25zdCBzZWFyY2hMaXN0VmlldyA9IHtcbiAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgdGhpcy5jb250ZW50ID0gdXRpbC4kKFwiLnNlYXJjaExpc3RcIik7XG4gICAgICAgdGhpcy50ZW1wbGF0ZSA9IHV0aWwuJChcIiNzZWFyY2hWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICB0aGlzLnByZXZpZXcoKTtcbiAgICBcbiAgIH0sXG4gICByZW5kZXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgdmlkZW9zID0gdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5nZXRBbGxWaWRlb3MoKTtcbiAgICAgICBsZXQgc0hUTUwgPSAnJztcbiAgICAgICBmb3IgKGxldCBpPTA7IGkgPCB2aWRlb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgbGV0IHZpZGVvSW1hZ2VVcmwgPSAgdmlkZW9zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5kZWZhdWx0LnVybDtcbiAgICAgICAgICAgbGV0IHZpZGVvVGl0bGUgPSAgdmlkZW9zW2ldLnNuaXBwZXQudGl0bGU7XG4gICAgICAgICAgIGxldCBwdWJsaXNoZWRBdCA9IHZpZGVvc1tpXS5zbmlwcGV0LnB1Ymxpc2hlZEF0O1xuICAgICAgICAgICBsZXQgdmlkZW9JZCA9IHZpZGVvc1tpXS5pZC52aWRlb0lkXG4gICAgICAgICAgIHNEb20gPSB0aGlzLnRlbXBsYXRlLnJlcGxhY2UoXCJ7dmlkZW9JbWFnZX1cIiwgdmlkZW9JbWFnZVVybClcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9UaXRsZX1cIiwgdmlkZW9UaXRsZSlcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9WaWV3c31cIiwgcHVibGlzaGVkQXQpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvSWR9XCIsIHZpZGVvSWQpO1xuICAgICAgICAgICAgc0hUTUwgPSBzSFRNTCArIHNEb207XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb250ZW50Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgc0hUTUwpO1xuICAgIH0sXG4gICAgXG4gICAgY2FsbFNlYXJjaEFQSTogZnVuY3Rpb24oKXtcbiAgICAgICAgdXRpbC4kKFwiLmdvU2VhcmNoXCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB0aGlzLnNlYXJjaEtleXdvcmQgPSB1dGlsLiQoXCIjc2VhcmNoX2JveFwiKS52YWx1ZTtcbiAgICAgICAgICAgIHNVcmwgPSBzZXRUYXJnZXRVUkwodGhpcy5zZWFyY2hLZXl3b3JkKTtcbiAgICAgICAgICAgIHV0aWwucnVuQWpheChzVXJsLCBcImxvYWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBqc29uID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgeW91dHViZUFQSVNlYXJjaFJlc3VsdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5pbml0KCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5zZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgc2VhcmNoTGlzdFZpZXcubW9yZVJlc3VsdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBtb3JlUmVzdWx0OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnNlYXJjaEtleXdvcmQgPSB1dGlsLiQoXCIjc2VhcmNoX2JveFwiKS52YWx1ZTtcbiAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLMKgZnVuY3Rpb24oKXtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoGlmKHRoaXMuc2Nyb2xsSGVpZ2h0wqAtwqB0aGlzLnNjcm9sbFRvcMKgPT09wqB0aGlzLmNsaWVudEhlaWdodCnCoHtcbiAgICAgICAgICAgICAgICBuZXh0UGFnZVRvayA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0TmV4dFBhZ2VUb2tlbigpO1xuICAgICAgICAgICAgICAgIHNVcmwgPSBzZXRUYXJnZXRVUkwodGhpcy5zZWFyY2hLZXl3b3JkLCBuZXh0UGFnZVRvayk7XG7CoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqAgdXRpbC5ydW5BamF4KHNVcmwswqBcImxvYWRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBqc29uID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5zZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgfSk7XG7CoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqB9XG7CoMKgwqDCoMKgwqDCoMKgfSk7ICBcbiAgICB9LFxuICAgIHByZXZpZXc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gIHV0aWwuJChcIi5wcmV2aWV3TW9kYWwgaVwiKTtcbiAgICAgICAgY29uc29sZS5sb2coY2xvc2VCdXR0b24pO1xuICAgICBcblxuICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICB0YXJnZXQgPSBldnQudGFyZ2V0O1xuICAgICAgICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgIT09IFwibGlcIil7IHRhcmdldCA9IHV0aWwuJChcIi5zZWFyY2hMaXN0IGxpXCIpIH1cbiAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZVwiKTtcbiAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5pbm5lckhUTUwgPSB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmlubmVySFRNTC5yZXBsYWNlKFwie2RhdGEtaWR9XCIsIHRhcmdldC5kYXRhc2V0LmlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIFxuICAgICAgICBcbiAgICB9XG5cbn1cbiAiLCIvLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgbmFtZVNwYWNlID0ge307XG5uYW1lU3BhY2UuJGdldHZhbCA9ICcnO1xubmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTtcbm5hbWVTcGFjZS5wbGF5TGlzdCA9IFtdO1xubmFtZVNwYWNlLmpkYXRhID0gW107XG5uYW1lU3BhY2UuYWxidW1TdG9yYWdlID0gbG9jYWxTdG9yYWdlO1xuLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgU1RBUlQgLy8vLy8vLy8vLy8vXG4vL2Z1bmN0aW9uYWxpdHkxIDogbmF2aWdhdGlvbiBjb250cm9sXG52YXIgbmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9nZXQgZWFjaCBidG4gaW4gbmF2IHdpdGggZG9tIGRlbGVnYXRpb24gd2l0aCBqcXVlcnkgYW5kIGV2ZW50IHByb3BhZ2F0aW9uXG4gICAgJChcIi5uYXZfcGFyZW50XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvL2J1YmJsaW5nIHByZXZlbnRcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9ICQodGhpcykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc29sZS5sb2coY2xhc3NOYW1lKTtcbiAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBcImFsYnVtX2J0blwiKSB7XG4gICAgICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuaGlkZSgpOyAvL+qygOyDiSDqsrDqs7wgQ2xlYXJcbiAgICAgICAgICAgICQoXCIuYWRkTmV3TWVkaWFcIikuaGlkZSgpOyAvL+qygOyDiSDssL0gQ2xlYXJcbiAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gXCJwb3B1bGFyX2J0blwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBPUFVMQVIuLi4uLj9cIik7XG4gICAgICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuaGlkZSgpOyAvL+qygOyDiSDqsrDqs7wgQ2xlYXJcbiAgICAgICAgICAgICQoXCIuYWRkTmV3TWVkaWFcIikuaGlkZSgpOyAvL+qygOyDiSDssL0gQ2xlYXJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU0VBUkNIIEJUTiEhISFcIilcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5zaG93KCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5zaG93KCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9XG4gICAgfSk7XG59O1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgRU5EIC8vLy8vLy8vLy8vL1xuXG5uYXYoKTsgLy9uYXYg7Iuk7ZaJXG4vLy8vLy8vLy8vLy8vIFNFQVJDSCBBUEkgU1RBUlQgLy8vLy8vLy8vLy8vLy8vLy9cbnZhciBmbkdldExpc3QgPSBmdW5jdGlvbihzR2V0VG9rZW4pIHtcbiAgICBuYW1lU3BhY2UuJGdldHZhbCA9ICQoXCIjc2VhcmNoX2JveFwiKS52YWwoKTtcbiAgICBpZiAobmFtZVNwYWNlLiRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLqsoDsg4nslrTsnoXroKXrsJTrno3ri4jri6QuXCIpO1xuICAgICAgICAkKFwiI3NlYXJjaF9ib3hcIikuZm9jdXMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL0NsZWFuc2luZyBEb20sIFZpZGVvSWRcbiAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdOyAvL2dldHZpZGVvSWQgYXJyYXnstIjquLDtmZRcbiAgICAvLyAkKFwiLnNlYXJjaExpc3RcIikuZW1wdHkoKTsgLy/qsoDsg4kg6rKw6rO8IFZpZXfstIjquLDtmZRcbiAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuXG4gICAgLy9xdWVyeXNlY3Rpb24vL1xuICAgIC8vMTXqsJzslKlcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlJm1heFJlc3VsdHM9MTUmdHlwZT12aWRlb1wiICsgXCImcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChuYW1lU3BhY2UuJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG4gICAgaWYgKHNHZXRUb2tlbikge1xuICAgICAgICBzVGFyZ2V0VXJsICs9IFwiJnBhZ2VUb2tlbj1cIiArIHNHZXRUb2tlbjtcbiAgICAgICAgY29uc29sZS5sb2coc1RhcmdldFVybCk7XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIG5hbWVTcGFjZS5qZGF0YSA9IGpkYXRhOyAvL2pkYXRhLlxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWFyY2hSZXN1bHRWaWV3KCk7XG4gICAgICAgICAgICAkKGpkYXRhLml0ZW1zKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZC5wdXNoKGpkYXRhLml0ZW1zW2ldLmlkLnZpZGVvSWQpOyAvL25hbWVTcGFjZS5nZXR2aWRlb0lk7JeQIOqygOyDieuQnCB2aWRlb0lEIOuwsOyXtOuhnCDstpTqsIBcbiAgICAgICAgICAgIH0pLnByb21pc2UoKS5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5nZXR2aWRlb0lkWzBdKTtcbiAgICAgICAgICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmFwcGVuZChcIjxpZnJhbWUgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3JjPSdodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC9cIiArIG5hbWVTcGFjZS5nZXR2aWRlb0lkWzBdICsgXCInP3JlbD0wICYgZW5hYmxlanNhcGk9MSBmcmFtZWJvcmRlcj0wIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIik7XG4gICAgICAgICAgICAgICAgLy9wbGF5VmlkZW9TZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgaWYgKGpkYXRhLm5leHRQYWdlVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgIGdldE1vcmVTZWFyY2hSZXN1bHQoamRhdGEubmV4dFBhZ2VUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBFTkQgLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vL+yKpO2BrOuhpCDri6TsmrTsi5wg7ZWo7IiYIOyLpO2Wie2VmOq4sC5cbnZhciBnZXRNb3JlU2VhcmNoUmVzdWx0ID0gZnVuY3Rpb24obmV4dFBhZ2VUb2tlbil7XG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLnNjcm9sbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKCQodGhpcykuc2Nyb2xsVG9wKCkgKyAkKHRoaXMpLmlubmVySGVpZ2h0KCkgPj0gJCh0aGlzKVswXS5zY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICAgIGZuR2V0TGlzdChuZXh0UGFnZVRva2VuKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cblxuXG4gICAgXG4vLy8vLy8vLy8vLy8gU0VBUkNIIFJFU1VMVCBWSUVXIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIHNlYXJjaFJlc3VsdFZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VhcmNoUmVzdWx0TGlzdCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBnZXRUZW1wbGF0ZSA9ICQoJyNzZWFyY2hWaWRlbycpWzBdOyAvL3RlbXBsYXRlIHF1ZXJ5c2VsZWN0XG4gICAgICAgIHZhciBnZXRIdG1sVGVtcGxhdGUgPSBnZXRUZW1wbGF0ZS5pbm5lckhUTUw7IC8vZ2V0IGh0bWwgaW4gdGVtcGxhdGVcbiAgICAgICAgdmFyIGFkYXB0VGVtcGxhdGUgPSBnZXRIdG1sVGVtcGxhdGUucmVwbGFjZShcInt2aWRlb0ltYWdlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aHVtYm5haWxzLmRlZmF1bHQudXJsKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9UaXRsZX1cIiwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGl0bGUpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1ZpZXdzfVwiLCBcIlRCRFwiKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7aWR9XCIsIGkpO1xuICAgICAgICBzZWFyY2hSZXN1bHRMaXN0ID0gc2VhcmNoUmVzdWx0TGlzdCArIGFkYXB0VGVtcGxhdGU7XG4gICAgfVxuICAgICQoJy5zZWFyY2hMaXN0JykuZW1wdHkoKS5hcHBlbmQoc2VhcmNoUmVzdWx0TGlzdCk7XG59O1xuXG5cbi8vLy8vLy8vLy8vLyBTRUFSQ0ggUkVTVUxUIFZJRVcgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vIFBMQVkgU0VMRUNUIFZJREVPIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy9cbnZhciBwbGF5VmlkZW9TZWxlY3QgPSBmdW5jdGlvbigpIHtcbiAgICAkKFwiLnNlYXJjaExpc3RcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKCkgeyAvLyDqsoDsg4nrkJwgbGlzdCBjbGlja+2WiOydhOqyveyasC5cbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmFwcGVuZChcIjxpZnJhbWUgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3JjPSdodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC9cIiArIG5hbWVTcGFjZS5nZXR2aWRlb0lkW3RhZ0lkXSArIFwiJz9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgIH0pO1xufTtcbi8vLy8vLy8vIFBMQVkgU0VMRUNUIFZJREVPIEVORCAvLy8vLy8vLy8vLy8vLy8vXG5cbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gU1RBUlQgLy8vLy8vLy8vLy8vLy8vLy9cbnZhciBhZGRQbGF5TGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoVmlkZW8gbGkgYnV0dG9uXCIpLm9uKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFBQUFcIik7XG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgLy8gdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCQodGhpcykpO1xuICAgIH0pO1xufTtcbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gRU5EIC8vLy8vLy8vLy8vLy8vLy8vXG5cblxuXG4vLyAvLyBMYXlvdXQg67OA6rK9XG4vLyB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJyxmdW5jdGlvbigpe1xuLy8gICByZXNpemVNYWluSGVpZ2h0KCk7XG4vLyB9KTtcblxuLy8gcmVzaXplTWFpbkhlaWdodCgpO1xuLy8gZnVuY3Rpb24gcmVzaXplTWFpbkhlaWdodCgpe1xuLy8gICB2YXIgaGVhZGVySGVpZ2h0ID0gNTA7XG4vLyAgIHZhciBhdWRpb1BsYXllckhlaWdodCA9IDgwO1xuLy8gICB2YXIgaW5wdXRCb3hIZWlnaHQgPSA0NTtcbi8vICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluXCIpLnN0eWxlLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWRlckhlaWdodCAtIGF1ZGlvUGxheWVySGVpZ2h0ICsncHgnO1xuLy8gICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNlYXJjaExpc3RcIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgLSBpbnB1dEJveEhlaWdodCArICdweCc7XG4vLyB9XG5cblxuXG4iXX0=
;