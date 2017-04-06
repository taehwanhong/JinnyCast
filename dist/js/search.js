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
        
        // console.log(closeButton);
     

        util.$(".searchList").addEventListener('click', function(evt) {
    
           let li =  evt.target.closest("li");
           if (!li) return;
            util.$(".previewModal").dataset.id = '';
            
           util.$(".previewModal").classList.remove("hide");
           util.$(".previewModal").innerHTML = util.$(".previewModal").innerHTML.replace("{data-id}", li.dataset.id);
          
           util.$(".searchList").classList.add("modal-open");

        });
        

        util.$(".close-previewModal").addEventListener('click', function(evt){
            console.log(evt.target);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9hdWRpb1BsYXllci5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9hdWRpb1BsYXllclNhbXBsZS5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2gtMS5qcyIsIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIlxuXG4oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXVkaW9QbGF5ZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgLy8gUGxheWVyIHZhcnMhXG4gIHZhclxuICBkb2NUaXRsZSA9IGRvY3VtZW50LnRpdGxlLFxuICBwbGF5ZXIgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcCcpLFxuICBwbGF5ZXJDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudXNlclBsYXlsaXN0JyksXG4gIHBsYXlCdG4sXG4gIHBsYXlTdmcsXG4gIHBsYXlTdmdQYXRoLFxuICBwcmV2QnRuLFxuICBuZXh0QnRuLFxuICBwbEJ0bixcbiAgcmVwZWF0QnRuLFxuICB2b2x1bWVCdG4sXG4gIHByb2dyZXNzQmFyLFxuICBwcmVsb2FkQmFyLFxuICBjdXJUaW1lLFxuICBkdXJUaW1lLFxuICB0cmFja1RpdGxlLFxuICBhdWRpbyxcbiAgaW5kZXggPSAwLFxuICBwbGF5TGlzdCxcbiAgdm9sdW1lQmFyLFxuICB3aGVlbFZvbHVtZVZhbHVlID0gMCxcbiAgdm9sdW1lTGVuZ3RoLFxuICByZXBlYXRpbmcgPSBmYWxzZSxcbiAgc2Vla2luZyA9IGZhbHNlLFxuICBzZWVraW5nVm9sID0gZmFsc2UsXG4gIHJpZ2h0Q2xpY2sgPSBmYWxzZSxcbiAgYXBBY3RpdmUgPSBmYWxzZSxcbiAgLy8gcGxheWxpc3QgdmFyc1xuICBwbCxcbiAgcGxVbCxcbiAgcGxMaSxcbiAgdHBsTGlzdCA9XG4gICAgICAgICAgICAnPGxpIGNsYXNzPVwicGwtbGlzdFwiIGRhdGEtdHJhY2s9XCJ7Y291bnR9XCI+JytcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X190cmFja1wiPicrXG4gICAgICAgICAgICAgICAgJyA8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcGxheSBpY29uX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtaGVhZHBob25lc1wiPjwvaT48L2J1dHRvbj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmUgaWNvbl9idG5cIj4nK1xuICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cImxhIGxhLW1pbnVzLWNpcmNsZVwiPjwvaT4nK1xuICAgICAgICAgICAgICAnPC9idXR0b24+JytcbiAgICAgICAgICAgICc8L2xpPicsXG4gIC8vIHNldHRpbmdzXG4gIHNldHRpbmdzID0ge1xuICAgIHZvbHVtZSAgICAgICAgOiAwLjEsXG4gICAgY2hhbmdlRG9jVGl0bGU6IHRydWUsXG4gICAgY29uZmlybUNsb3NlICA6IHRydWUsXG4gICAgYXV0b1BsYXkgICAgICA6IGZhbHNlLFxuICAgIGJ1ZmZlcmVkICAgICAgOiB0cnVlLFxuICAgIG5vdGlmaWNhdGlvbiAgOiB0cnVlLFxuICAgIHBsYXlMaXN0ICAgICAgOiBbXVxuICB9O1xuXG4gIGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuXG4gICAgaWYoISgnY2xhc3NMaXN0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYoYXBBY3RpdmUgfHwgcGxheWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBhbHJlYWR5IGluaXQnO1xuICAgIH1cblxuICAgIHNldHRpbmdzID0gZXh0ZW5kKHNldHRpbmdzLCBvcHRpb25zKTtcblxuICAgIC8vIGdldCBwbGF5ZXIgZWxlbWVudHNcbiAgICBwbGF5QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS10b2dnbGUnKTtcbiAgICBwbGF5U3ZnICAgICAgICA9IHBsYXlCdG4ucXVlcnlTZWxlY3RvcignLmljb24tcGxheScpO1xuICAgIHBsYXlTdmdQYXRoICAgID0gcGxheVN2Zy5xdWVyeVNlbGVjdG9yKCdwYXRoJyk7XG4gICAgcHJldkJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcHJldicpO1xuICAgIG5leHRCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLW5leHQnKTtcbiAgICByZXBlYXRCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1yZXBlYXQnKTtcbiAgICB2b2x1bWVCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lLWJ0bicpO1xuICAgIHBsQnRuICAgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXBsYXlsaXN0Jyk7XG4gICAgY3VyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1jdXJyZW50Jyk7XG4gICAgZHVyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1kdXJhdGlvbicpO1xuICAgIHRyYWNrVGl0bGUgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGl0bGUnKTtcbiAgICBwcm9ncmVzc0JhciAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX2JhcicpO1xuICAgIHByZWxvYWRCYXIgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fcHJlbG9hZCcpO1xuICAgIHZvbHVtZUJhciAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2JhcicpO1xuXG4gICAgcGxheUxpc3QgPSBzZXR0aW5ncy5wbGF5TGlzdDtcblxuICAgIHBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG5cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUsIGZhbHNlKTtcblxuICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGFwQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBwbGF5bGlzdFxuICAgIHJlbmRlclBMKCk7XG4gICAgcGxCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgLy8gQ3JlYXRlIGF1ZGlvIG9iamVjdFxuICAgIGF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgIGF1ZGlvLnByZWxvYWQgPSAnYXV0byc7XG5cbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IGF1ZGlvLnZvbHVtZSAqIDEwMCArICclJztcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIGlmKHNldHRpbmdzLmF1dG9QbGF5KSB7XG4gICAgICBhdWRpby5wbGF5KCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlRG9jdW1lbnRUaXRsZSh0aXRsZSkge1xuICAgIGlmKHNldHRpbmdzLmNoYW5nZURvY1RpdGxlKSB7XG4gICAgICBpZih0aXRsZSkge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jVGl0bGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlVW5sb2FkKGV2dCkge1xuICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gJ011c2ljIHN0aWxsIHBsYXlpbmcnO1xuICAgICAgZXZ0LnJldHVyblZhbHVlID0gbWVzc2FnZTtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVycm9ySGFuZGxlcihldnQpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBtZWRpYUVycm9yID0ge1xuICAgICAgJzEnOiAnTUVESUFfRVJSX0FCT1JURUQnLFxuICAgICAgJzInOiAnTUVESUFfRVJSX05FVFdPUksnLFxuICAgICAgJzMnOiAnTUVESUFfRVJSX0RFQ09ERScsXG4gICAgICAnNCc6ICdNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQnXG4gICAgfTtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgcGxMaVtpbmRleF0gJiYgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvdXN0b24gd2UgaGF2ZSBhIHByb2JsZW06ICcgKyBtZWRpYUVycm9yW2V2dC50YXJnZXQuZXJyb3IuY29kZV0pO1xuICB9XG5cbi8qKlxuICogVVBEQVRFIFBMXG4gKi9cbiAgZnVuY3Rpb24gdXBkYXRlUEwoYWRkTGlzdCkge1xuICAgIGlmKCFhcEFjdGl2ZSkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgaXMgbm90IHlldCBpbml0aWFsaXplZCc7XG4gICAgfVxuICAgIGlmKCFBcnJheS5pc0FycmF5KGFkZExpc3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGFkZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNvdW50ID0gcGxheUxpc3QubGVuZ3RoO1xuICAgIHZhciBodG1sICA9IFtdO1xuICAgIHBsYXlMaXN0LnB1c2guYXBwbHkocGxheUxpc3QsIGFkZExpc3QpO1xuICAgIGFkZExpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBodG1sLnB1c2goXG4gICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGNvdW50KyspLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICAvLyBJZiBleGlzdCBlbXB0eSBtZXNzYWdlXG4gICAgaWYocGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5yZW1vdmVDaGlsZCggcGwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykgKTtcbiAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgfVxuICAgIC8vIEFkZCBzb25nIGludG8gcGxheWxpc3RcbiAgICBwbFVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlRW5kJywgaHRtbC5qb2luKCcnKSk7XG4gICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG4gIH1cblxuLyoqXG4gKiAgUGxheUxpc3QgbWV0aG9kc1xuICovXG4gICAgZnVuY3Rpb24gcmVuZGVyUEwoKSB7XG4gICAgICB2YXIgaHRtbCA9IFtdO1xuXG4gICAgICBwbGF5TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGkpIHtcbiAgICAgICAgaHRtbC5wdXNoKFxuICAgICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGkpLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIHBsID0gY3JlYXRlKCdkaXYnLCB7XG4gICAgICAgICdjbGFzc05hbWUnOiAncGwtY29udGFpbmVyJyxcbiAgICAgICAgJ2lkJzogJ3BsJyxcbiAgICAgICAgJ2lubmVySFRNTCc6ICc8dWwgY2xhc3M9XCJwbC11bFwiPicgKyAoIWlzRW1wdHlMaXN0KCkgPyBodG1sLmpvaW4oJycpIDogJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPicpICsgJzwvdWw+J1xuICAgICAgfSk7XG5cbiAgICAgIHBsYXllckNvbnRhaW5lci5pbnNlcnRCZWZvcmUocGwsIHBsYXllckNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgIHBsVWwgPSBwbC5xdWVyeVNlbGVjdG9yKCcucGwtdWwnKTtcbiAgICAgIHBsTGkgPSBwbFVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgIHBsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0SGFuZGxlcihldnQpIHtcbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICBpZihldnQudGFyZ2V0Lm1hdGNoZXMoJy5wbC1saXN0X190aXRsZScpKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcGFyc2VJbnQoZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG4gICAgICAgIGlmKGluZGV4ICE9PSBjdXJyZW50KSB7XG4gICAgICAgICAgaW5kZXggPSBjdXJyZW50O1xuICAgICAgICAgIHBsYXkoY3VycmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcGxheVRvZ2dsZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgICBpZighIWV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3RfX3JlbW92ZScpKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50RWwgPSBldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0Jyk7XG4gICAgICAgICAgICB2YXIgaXNEZWwgPSBwYXJzZUludChwYXJlbnRFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuXG4gICAgICAgICAgICBwbGF5TGlzdC5zcGxpY2UoaXNEZWwsIDEpO1xuICAgICAgICAgICAgcGFyZW50RWwuY2xvc2VzdCgnLnBsLXVsJykucmVtb3ZlQ2hpbGQocGFyZW50RWwpO1xuXG4gICAgICAgICAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBsTGksIGZ1bmN0aW9uKGVsLCBpKSB7XG4gICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycsIGkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcblxuICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBwbGF5KGluZGV4KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgICAgICAgICAgIGNsZWFyQWxsKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBpZihpc0RlbCA+IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggLT0gMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgICAgICAgICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgICAgICAgICAgICAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihpc0RlbCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgIGluZGV4LS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGxBY3RpdmUoKSB7XG4gICAgICBpZihhdWRpby5wYXVzZWQpIHtcbiAgICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudCA9IGluZGV4O1xuICAgICAgZm9yKHZhciBpID0gMCwgbGVuID0gcGxMaS5sZW5ndGg7IGxlbiA+IGk7IGkrKykge1xuICAgICAgICBwbExpW2ldLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIH1cbiAgICAgIHBsTGlbY3VycmVudF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIH1cblxuXG4vKipcbiAqIFBsYXllciBtZXRob2RzXG4gKi9cbiAgZnVuY3Rpb24gcGxheShjdXJyZW50SW5kZXgpIHtcblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBjbGVhckFsbCgpO1xuICAgIH1cblxuICAgIGluZGV4ID0gKGN1cnJlbnRJbmRleCArIHBsYXlMaXN0Lmxlbmd0aCkgJSBwbGF5TGlzdC5sZW5ndGg7XG5cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIC8vIENoYW5nZSBkb2N1bWVudCB0aXRsZVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgIC8vIEF1ZGlvIHBsYXlcbiAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAvLyBTaG93IG5vdGlmaWNhdGlvblxuICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgYm9keTogJ05vdyBwbGF5aW5nJyxcbiAgICAgIHRhZzogJ211c2ljLXBsYXllcidcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBwbGF5IGJ1dHRvblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuXG4gICAgLy8gU2V0IGFjdGl2ZSBzb25nIHBsYXlsaXN0XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgcGxheShpbmRleCAtIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICBwbGF5KGluZGV4ICsgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5TGlzdCgpIHtcbiAgICByZXR1cm4gcGxheUxpc3QubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJBbGwoKSB7XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhdWRpby5zcmMgPSAnJztcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9ICdxdWV1ZSBpcyBlbXB0eSc7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBpZighcGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5pbm5lckhUTUwgPSAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JztcbiAgICB9XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGxheVRvZ2dsZSgpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICBpZihhdWRpby5jdXJyZW50VGltZSA9PT0gMCkge1xuICAgICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgICAgYXVkaW8ucGxheSgpO1xuXG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgfVxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB2b2x1bWVUb2dnbGUoKSB7XG4gICAgaWYoYXVkaW8ubXV0ZWQpIHtcbiAgICAgIGlmKHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApID09PSAwKSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBzZXR0aW5ncy52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdm9sdW1lTGVuZ3RoO1xuICAgICAgfVxuICAgICAgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXBlYXRUb2dnbGUoKSB7XG4gICAgaWYocmVwZWF0QnRuLmNsYXNzTGlzdC5jb250YWlucygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHJlcGVhdGluZyA9IGZhbHNlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJlcGVhdGluZyA9IHRydWU7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGxUb2dnbGUoKSB7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnRvZ2dsZSgnaXMtYWN0aXZlJyk7XG4gICAgLy9wbC5jbGFzc0xpc3QudG9nZ2xlKCdoLXNob3cnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVVcGRhdGUoKSB7XG4gICAgaWYoYXVkaW8ucmVhZHlTdGF0ZSA9PT0gMCB8fCBzZWVraW5nKSByZXR1cm47XG5cbiAgICB2YXIgYmFybGVuZ3RoID0gTWF0aC5yb3VuZChhdWRpby5jdXJyZW50VGltZSAqICgxMDAgLyBhdWRpby5kdXJhdGlvbikpO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gYmFybGVuZ3RoICsgJyUnO1xuXG4gICAgdmFyXG4gICAgY3VyTWlucyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLyA2MCksXG4gICAgY3VyU2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLSBjdXJNaW5zICogNjApLFxuICAgIG1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC8gNjApLFxuICAgIHNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC0gbWlucyAqIDYwKTtcbiAgICAoY3VyU2VjcyA8IDEwKSAmJiAoY3VyU2VjcyA9ICcwJyArIGN1clNlY3MpO1xuICAgIChzZWNzIDwgMTApICYmIChzZWNzID0gJzAnICsgc2Vjcyk7XG5cbiAgICBjdXJUaW1lLmlubmVySFRNTCA9IGN1ck1pbnMgKyAnOicgKyBjdXJTZWNzO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gbWlucyArICc6JyArIHNlY3M7XG5cbiAgICBpZihzZXR0aW5ncy5idWZmZXJlZCkge1xuICAgICAgdmFyIGJ1ZmZlcmVkID0gYXVkaW8uYnVmZmVyZWQ7XG4gICAgICBpZihidWZmZXJlZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IE1hdGgucm91bmQoMTAwICogYnVmZmVyZWQuZW5kKDApIC8gYXVkaW8uZHVyYXRpb24pO1xuICAgICAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gbG9hZGVkICsgJyUnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUT0RPIHNodWZmbGVcbiAgICovXG4gIGZ1bmN0aW9uIHNodWZmbGUoKSB7XG4gICAgaWYoc2h1ZmZsZSkge1xuICAgICAgaW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBwbGF5TGlzdC5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRvRW5kKCkge1xuICAgIGlmKGluZGV4ID09PSBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICBpZighcmVwZWF0aW5nKSB7XG4gICAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICAgIHBsQWN0aXZlKCk7XG4gICAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGxheSgwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwbGF5KGluZGV4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbW92ZUJhcihldnQsIGVsLCBkaXIpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgaWYoZGlyID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCggKChldnQuY2xpZW50WCAtIGVsLm9mZnNldCgpLmxlZnQpICsgd2luZG93LnBhZ2VYT2Zmc2V0KSAgKiAxMDAgLyBlbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoKTtcbiAgICAgIGVsLnN0eWxlLndpZHRoID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYoZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgICAgdmFsdWUgPSBwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKTtcbiAgICAgICAgdmFyIGRlbHRhID0gZXZ0LmRlbHRhWSB8fCBldnQuZGV0YWlsIHx8IC1ldnQud2hlZWxEZWx0YTtcbiAgICAgICAgdmFsdWUgPSAoZGVsdGEgPiAwKSA/IHZhbHVlIC0gMTAgOiB2YWx1ZSArIDEwO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAoZWwub2Zmc2V0KCkudG9wICsgZWwub2Zmc2V0SGVpZ2h0KSAtIHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKChvZmZzZXQgLSBldnQuY2xpZW50WSkpO1xuICAgICAgfVxuICAgICAgaWYodmFsdWUgPiAxMDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDEwMDtcbiAgICAgIGlmKHZhbHVlIDwgMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMDtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyQmFyKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nID0gdHJ1ZTtcbiAgICAhcmlnaHRDbGljayAmJiBwcm9ncmVzc0Jhci5jbGFzc0xpc3QuYWRkKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICBzZWVrKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyVm9sKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gdHJ1ZTtcbiAgICBzZXRWb2x1bWUoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWsoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICB3aW5kb3cudmFsdWUgPSBtb3ZlQmFyKGV2dCwgcHJvZ3Jlc3NCYXIsICdob3Jpem9udGFsJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2Vla2luZ0ZhbHNlKCkge1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgYXVkaW8uY3VycmVudFRpbWUgPSBhdWRpby5kdXJhdGlvbiAqICh3aW5kb3cudmFsdWUgLyAxMDApO1xuICAgICAgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LnJlbW92ZSgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgfVxuICAgIHNlZWtpbmcgPSBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRWb2x1bWUoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG4gICAgaWYoc2Vla2luZ1ZvbCAmJiByaWdodENsaWNrID09PSBmYWxzZSB8fCBldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgdmFyIHZhbHVlID0gbW92ZUJhcihldnQsIHZvbHVtZUJhci5wYXJlbnROb2RlLCAndmVydGljYWwnKSAvIDEwMDtcbiAgICAgIGlmKHZhbHVlIDw9IDApIHtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gMDtcbiAgICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYoYXVkaW8ubXV0ZWQpIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KHRpdGxlLCBhdHRyKSB7XG4gICAgaWYoIXNldHRpbmdzLm5vdGlmaWNhdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZih3aW5kb3cuTm90aWZpY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXR0ci50YWcgPSAnQVAgbXVzaWMgcGxheWVyJztcbiAgICB3aW5kb3cuTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKGZ1bmN0aW9uKGFjY2Vzcykge1xuICAgICAgaWYoYWNjZXNzID09PSAnZ3JhbnRlZCcpIHtcbiAgICAgICAgdmFyIG5vdGljZSA9IG5ldyBOb3RpZmljYXRpb24odGl0bGUuc3Vic3RyKDAsIDExMCksIGF0dHIpO1xuICAgICAgICBzZXRUaW1lb3V0KG5vdGljZS5jbG9zZS5iaW5kKG5vdGljZSksIDUwMDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbi8qIERlc3Ryb3kgbWV0aG9kLiBDbGVhciBBbGwgKi9cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBpZighYXBBY3RpdmUpIHJldHVybjtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHBsYXlCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG4gICAgcGxCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHByZXZCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICAvLyBQbGF5bGlzdFxuICAgIHBsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICBwbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsKTtcblxuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXBBY3RpdmUgPSBmYWxzZTtcbiAgICBpbmRleCA9IDA7XG5cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbSBiICAgICAgICB1dGVkJyk7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuXG4gICAgLy8gUmVtb3ZlIHBsYXllciBmcm9tIHRoZSBET00gaWYgbmVjZXNzYXJ5XG4gICAgLy8gcGxheWVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGxheWVyKTtcbiAgfVxuXG5cbi8qKlxuICogIEhlbHBlcnNcbiAqL1xuICBmdW5jdGlvbiB3aGVlbCgpIHtcbiAgICB2YXIgd2hlZWw7XG4gICAgaWYgKCdvbndoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnd2hlZWwnO1xuICAgIH0gZWxzZSBpZiAoJ29ubW91c2V3aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ21vdXNld2hlZWwnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGVlbCA9ICdNb3pNb3VzZVBpeGVsU2Nyb2xsJztcbiAgICB9XG4gICAgcmV0dXJuIHdoZWVsO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgZm9yKHZhciBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmKGRlZmF1bHRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZShlbCwgYXR0cikge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbCk7XG4gICAgaWYoYXR0cikge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYoZWxlbWVudFtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZWxlbWVudFtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICBFbGVtZW50LnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgIHNjcm9sbExlZnQgPSB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXG4gICAgc2Nyb2xsVG9wID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiBlbC50b3AgKyBzY3JvbGxUb3AsXG4gICAgICBsZWZ0OiBlbC5sZWZ0ICsgc2Nyb2xsTGVmdFxuICAgIH07XG4gIH07XG5cbiAgRWxlbWVudC5wcm90b3R5cGUuY3NzID0gZnVuY3Rpb24oYXR0cikge1xuICAgIGlmKHR5cGVvZiBhdHRyID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUodGhpcywgJycpW2F0dHJdO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiBhdHRyID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYodGhpcy5zdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5zdHlsZVtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gbWF0Y2hlcyBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgPSBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMsIG5vZGVzID0gKG5vZGUucGFyZW50Tm9kZSB8fCBub2RlLmRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSwgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlIChub2Rlc1srK2ldICYmIG5vZGVzW2ldICE9IG5vZGUpO1xuICAgICAgICAgIHJldHVybiAhIW5vZGVzW2ldO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbiAgLy8gY2xvc2VzdCBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgPSBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIGVsID0gdGhpcztcbiAgICAgICAgICB3aGlsZSAoZWwubWF0Y2hlcyAmJiAhZWwubWF0Y2hlcyhzZWxlY3RvcikpIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICByZXR1cm4gZWwubWF0Y2hlcyA/IGVsIDogbnVsbDtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4vKipcbiAqICBQdWJsaWMgbWV0aG9kc1xuICovXG4gIHJldHVybiB7XG4gICAgaW5pdDogaW5pdCxcbiAgICB1cGRhdGU6IHVwZGF0ZVBMLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcblxufSkoKTtcblxud2luZG93LkFQID0gQXVkaW9QbGF5ZXI7XG5cbn0pKHdpbmRvdyk7XG5cbi8vIFRFU1Q6IGltYWdlIGZvciB3ZWIgbm90aWZpY2F0aW9uc1xudmFyIGljb25JbWFnZSA9ICdodHRwOi8vZnVua3lpbWcuY29tL2kvMjFwWDUucG5nJztcblxuQVAuaW5pdCh7XG4gIHBsYXlMaXN0OiBbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnVGhlIEJlc3Qgb2YgQmFjaCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EcmVhbWVyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9Sb2NrZXQlMjBQb3dlci5tcDMnfVxuICBdXG59KTtcblxuLy8gVEVTVDogdXBkYXRlIHBsYXlsaXN0XG4vL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRTb25ncycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuLy8gIGUucHJldmVudERlZmF1bHQoKTtcbiAgQVAudXBkYXRlKFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1BcGJaZmw3aEljZyd9XG4gIF0pO1xuLy99KVxuXG4iLCJcblxuXG4oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBBdWRpb1BsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAvLyBQbGF5ZXIgdmFycyFcbiAgdmFyXG4gIGRvY1RpdGxlID0gZG9jdW1lbnQudGl0bGUsXG4gIHBsYXllciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwJyksXG4gIHBsYXlCdG4sXG4gIHBsYXlTdmcsXG4gIHBsYXlTdmdQYXRoLFxuICBwcmV2QnRuLFxuICBuZXh0QnRuLFxuICBwbEJ0bixcbiAgcmVwZWF0QnRuLFxuICB2b2x1bWVCdG4sXG4gIHByb2dyZXNzQmFyLFxuICBwcmVsb2FkQmFyLFxuICBjdXJUaW1lLFxuICBkdXJUaW1lLFxuICB0cmFja1RpdGxlLFxuICBhdWRpbyxcbiAgaW5kZXggPSAwLFxuICBwbGF5TGlzdCxcbiAgdm9sdW1lQmFyLFxuICB3aGVlbFZvbHVtZVZhbHVlID0gMCxcbiAgdm9sdW1lTGVuZ3RoLFxuICByZXBlYXRpbmcgPSBmYWxzZSxcbiAgc2Vla2luZyA9IGZhbHNlLFxuICBzZWVraW5nVm9sID0gZmFsc2UsXG4gIHJpZ2h0Q2xpY2sgPSBmYWxzZSxcbiAgYXBBY3RpdmUgPSBmYWxzZSxcbiAgLy8gcGxheWxpc3QgdmFyc1xuICBwbCxcbiAgcGxVbCxcbiAgcGxMaSxcbiAgdHBsTGlzdCA9XG4gICAgICAgICAgICAnPGxpIGNsYXNzPVwicGwtbGlzdFwiIGRhdGEtdHJhY2s9XCJ7Y291bnR9XCI+JytcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X190cmFja1wiPicrXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X19pY29uXCI+PC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2VxXCI+JytcbiAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RpdGxlXCI+e3RpdGxlfTwvZGl2PicrXG4gICAgICAgICAgICAgICc8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcmVtb3ZlXCI+JytcbiAgICAgICAgICAgICAgICAnPHN2ZyBmaWxsPVwiIzAwMDAwMFwiIGhlaWdodD1cIjIwXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHdpZHRoPVwiMjBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+JytcbiAgICAgICAgICAgICAgICAgICAgJzxwYXRoIGQ9XCJNNiAxOWMwIDEuMS45IDIgMiAyaDhjMS4xIDAgMi0uOSAyLTJWN0g2djEyek0xOSA0aC0zLjVsLTEtMWgtNWwtMSAxSDV2MmgxNFY0elwiLz4nK1xuICAgICAgICAgICAgICAgICAgICAnPHBhdGggZD1cIk0wIDBoMjR2MjRIMHpcIiBmaWxsPVwibm9uZVwiLz4nK1xuICAgICAgICAgICAgICAgICc8L3N2Zz4nK1xuICAgICAgICAgICAgICAnPC9idXR0b24+JytcbiAgICAgICAgICAgICc8L2xpPicsXG4gIC8vIHNldHRpbmdzXG4gIHNldHRpbmdzID0ge1xuICAgIHZvbHVtZSAgICAgICAgOiAwLjEsXG4gICAgY2hhbmdlRG9jVGl0bGU6IHRydWUsXG4gICAgY29uZmlybUNsb3NlICA6IHRydWUsXG4gICAgYXV0b1BsYXkgICAgICA6IGZhbHNlLFxuICAgIGJ1ZmZlcmVkICAgICAgOiB0cnVlLFxuICAgIG5vdGlmaWNhdGlvbiAgOiB0cnVlLFxuICAgIHBsYXlMaXN0ICAgICAgOiBbXVxuICB9O1xuXG4gIGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuXG4gICAgaWYoISgnY2xhc3NMaXN0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYoYXBBY3RpdmUgfHwgcGxheWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBhbHJlYWR5IGluaXQnO1xuICAgIH1cblxuICAgIHNldHRpbmdzID0gZXh0ZW5kKHNldHRpbmdzLCBvcHRpb25zKTtcblxuICAgIC8vIGdldCBwbGF5ZXIgZWxlbWVudHNcbiAgICBwbGF5QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS10b2dnbGUnKTtcbiAgICBwbGF5U3ZnICAgICAgICA9IHBsYXlCdG4ucXVlcnlTZWxlY3RvcignLmljb24tcGxheScpO1xuICAgIHBsYXlTdmdQYXRoICAgID0gcGxheVN2Zy5xdWVyeVNlbGVjdG9yKCdwYXRoJyk7XG4gICAgcHJldkJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcHJldicpO1xuICAgIG5leHRCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLW5leHQnKTtcbiAgICByZXBlYXRCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1yZXBlYXQnKTtcbiAgICB2b2x1bWVCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lX19idG4nKTtcbiAgICBwbEJ0biAgICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wbGF5bGlzdCcpO1xuICAgIGN1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tY3VycmVudCcpO1xuICAgIGR1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tZHVyYXRpb24nKTtcbiAgICB0cmFja1RpdGxlICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpdGxlJyk7XG4gICAgcHJvZ3Jlc3NCYXIgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19iYXInKTtcbiAgICBwcmVsb2FkQmFyICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX3ByZWxvYWQnKTtcbiAgICB2b2x1bWVCYXIgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lX19iYXInKTtcblxuICAgIHBsYXlMaXN0ID0gc2V0dGluZ3MucGxheUxpc3Q7XG5cbiAgICBwbGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhcEFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBDcmVhdGUgcGxheWxpc3RcbiAgICByZW5kZXJQTCgpO1xuICAgIHBsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIC8vIENyZWF0ZSBhdWRpbyBvYmplY3RcbiAgICBhdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICBhdWRpby5wcmVsb2FkID0gJ2F1dG8nO1xuXG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBhdWRpby52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICBpZihzZXR0aW5ncy5hdXRvUGxheSkge1xuICAgICAgYXVkaW8ucGxheSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZURvY3VtZW50VGl0bGUodGl0bGUpIHtcbiAgICBpZihzZXR0aW5ncy5jaGFuZ2VEb2NUaXRsZSkge1xuICAgICAgaWYodGl0bGUpIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY1RpdGxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZVVubG9hZChldnQpIHtcbiAgICBpZighYXVkaW8ucGF1c2VkKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdNdXNpYyBzdGlsbCBwbGF5aW5nJztcbiAgICAgIGV2dC5yZXR1cm5WYWx1ZSA9IG1lc3NhZ2U7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlcnJvckhhbmRsZXIoZXZ0KSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbWVkaWFFcnJvciA9IHtcbiAgICAgICcxJzogJ01FRElBX0VSUl9BQk9SVEVEJyxcbiAgICAgICcyJzogJ01FRElBX0VSUl9ORVRXT1JLJyxcbiAgICAgICczJzogJ01FRElBX0VSUl9ERUNPREUnLFxuICAgICAgJzQnOiAnTUVESUFfRVJSX1NSQ19OT1RfU1VQUE9SVEVEJ1xuICAgIH07XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHBsTGlbaW5kZXhdICYmIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdIb3VzdG9uIHdlIGhhdmUgYSBwcm9ibGVtOiAnICsgbWVkaWFFcnJvcltldnQudGFyZ2V0LmVycm9yLmNvZGVdKTtcbiAgfVxuXG4vKipcbiAqIFVQREFURSBQTFxuICovXG4gIGZ1bmN0aW9uIHVwZGF0ZVBMKGFkZExpc3QpIHtcbiAgICBpZighYXBBY3RpdmUpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGlzIG5vdCB5ZXQgaW5pdGlhbGl6ZWQnO1xuICAgIH1cbiAgICBpZighQXJyYXkuaXNBcnJheShhZGRMaXN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhZGRMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb3VudCA9IHBsYXlMaXN0Lmxlbmd0aDtcbiAgICB2YXIgaHRtbCAgPSBbXTtcbiAgICBwbGF5TGlzdC5wdXNoLmFwcGx5KHBsYXlMaXN0LCBhZGRMaXN0KTtcbiAgICBhZGRMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaHRtbC5wdXNoKFxuICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBjb3VudCsrKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgLy8gSWYgZXhpc3QgZW1wdHkgbWVzc2FnZVxuICAgIGlmKHBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwucmVtb3ZlQ2hpbGQoIHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpICk7XG4gICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgIH1cbiAgICAvLyBBZGQgc29uZyBpbnRvIHBsYXlsaXN0XG4gICAgcGxVbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZUVuZCcsIGh0bWwuam9pbignJykpO1xuICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuICB9XG5cbi8qKlxuICogIFBsYXlMaXN0IG1ldGhvZHNcbiAqL1xuICAgIGZ1bmN0aW9uIHJlbmRlclBMKCkge1xuICAgICAgdmFyIGh0bWwgPSBbXTtcblxuICAgICAgcGxheUxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpKSB7XG4gICAgICAgIGh0bWwucHVzaChcbiAgICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBpKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBwbCA9IGNyZWF0ZSgnZGl2Jywge1xuICAgICAgICAnY2xhc3NOYW1lJzogJ3BsLWNvbnRhaW5lcicsXG4gICAgICAgICdpZCc6ICdwbCcsXG4gICAgICAgICdpbm5lckhUTUwnOiAnPHVsIGNsYXNzPVwicGwtdWxcIj4nICsgKCFpc0VtcHR5TGlzdCgpID8gaHRtbC5qb2luKCcnKSA6ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nKSArICc8L3VsPidcbiAgICAgIH0pO1xuXG4gICAgICBwbGF5ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocGwsIHBsYXllci5uZXh0U2libGluZyk7XG5cbiAgICAgIHBsVWwgPSBwbC5xdWVyeVNlbGVjdG9yKCcucGwtdWwnKTtcbiAgICAgIHBsTGkgPSBwbFVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgIHBsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0SGFuZGxlcihldnQpIHtcbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICBpZihldnQudGFyZ2V0Lm1hdGNoZXMoJy5wbC1saXN0X190aXRsZScpKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcGFyc2VJbnQoZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG4gICAgICAgIGlmKGluZGV4ICE9PSBjdXJyZW50KSB7XG4gICAgICAgICAgaW5kZXggPSBjdXJyZW50O1xuICAgICAgICAgIHBsYXkoY3VycmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcGxheVRvZ2dsZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgICBpZighIWV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3RfX3JlbW92ZScpKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50RWwgPSBldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0Jyk7XG4gICAgICAgICAgICB2YXIgaXNEZWwgPSBwYXJzZUludChwYXJlbnRFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuXG4gICAgICAgICAgICBwbGF5TGlzdC5zcGxpY2UoaXNEZWwsIDEpO1xuICAgICAgICAgICAgcGFyZW50RWwuY2xvc2VzdCgnLnBsLXVsJykucmVtb3ZlQ2hpbGQocGFyZW50RWwpO1xuXG4gICAgICAgICAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBsTGksIGZ1bmN0aW9uKGVsLCBpKSB7XG4gICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycsIGkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcblxuICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBwbGF5KGluZGV4KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgICAgICAgICAgIGNsZWFyQWxsKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBpZihpc0RlbCA+IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggLT0gMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgICAgICAgICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgICAgICAgICAgICAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihpc0RlbCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgIGluZGV4LS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGxBY3RpdmUoKSB7XG4gICAgICBpZihhdWRpby5wYXVzZWQpIHtcbiAgICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudCA9IGluZGV4O1xuICAgICAgZm9yKHZhciBpID0gMCwgbGVuID0gcGxMaS5sZW5ndGg7IGxlbiA+IGk7IGkrKykge1xuICAgICAgICBwbExpW2ldLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIH1cbiAgICAgIHBsTGlbY3VycmVudF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIH1cblxuXG4vKipcbiAqIFBsYXllciBtZXRob2RzXG4gKi9cbiAgZnVuY3Rpb24gcGxheShjdXJyZW50SW5kZXgpIHtcblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBjbGVhckFsbCgpO1xuICAgIH1cblxuICAgIGluZGV4ID0gKGN1cnJlbnRJbmRleCArIHBsYXlMaXN0Lmxlbmd0aCkgJSBwbGF5TGlzdC5sZW5ndGg7XG5cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIC8vIENoYW5nZSBkb2N1bWVudCB0aXRsZVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgIC8vIEF1ZGlvIHBsYXlcbiAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAvLyBTaG93IG5vdGlmaWNhdGlvblxuICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgYm9keTogJ05vdyBwbGF5aW5nJyxcbiAgICAgIHRhZzogJ211c2ljLXBsYXllcidcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBwbGF5IGJ1dHRvblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuXG4gICAgLy8gU2V0IGFjdGl2ZSBzb25nIHBsYXlsaXN0XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgcGxheShpbmRleCAtIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICBwbGF5KGluZGV4ICsgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5TGlzdCgpIHtcbiAgICByZXR1cm4gcGxheUxpc3QubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJBbGwoKSB7XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhdWRpby5zcmMgPSAnJztcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9ICdxdWV1ZSBpcyBlbXB0eSc7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBpZighcGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5pbm5lckhUTUwgPSAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JztcbiAgICB9XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGxheVRvZ2dsZSgpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICBpZihhdWRpby5jdXJyZW50VGltZSA9PT0gMCkge1xuICAgICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgICAgYXVkaW8ucGxheSgpO1xuXG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgfVxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB2b2x1bWVUb2dnbGUoKSB7XG4gICAgaWYoYXVkaW8ubXV0ZWQpIHtcbiAgICAgIGlmKHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApID09PSAwKSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBzZXR0aW5ncy52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdm9sdW1lTGVuZ3RoO1xuICAgICAgfVxuICAgICAgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXBlYXRUb2dnbGUoKSB7XG4gICAgaWYocmVwZWF0QnRuLmNsYXNzTGlzdC5jb250YWlucygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHJlcGVhdGluZyA9IGZhbHNlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJlcGVhdGluZyA9IHRydWU7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGxUb2dnbGUoKSB7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnRvZ2dsZSgnaXMtYWN0aXZlJyk7XG4gICAgcGwuY2xhc3NMaXN0LnRvZ2dsZSgnaC1zaG93Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0aW1lVXBkYXRlKCkge1xuICAgIGlmKGF1ZGlvLnJlYWR5U3RhdGUgPT09IDAgfHwgc2Vla2luZykgcmV0dXJuO1xuXG4gICAgdmFyIGJhcmxlbmd0aCA9IE1hdGgucm91bmQoYXVkaW8uY3VycmVudFRpbWUgKiAoMTAwIC8gYXVkaW8uZHVyYXRpb24pKTtcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IGJhcmxlbmd0aCArICclJztcblxuICAgIHZhclxuICAgIGN1ck1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC8gNjApLFxuICAgIGN1clNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC0gY3VyTWlucyAqIDYwKSxcbiAgICBtaW5zID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAvIDYwKSxcbiAgICBzZWNzID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAtIG1pbnMgKiA2MCk7XG4gICAgKGN1clNlY3MgPCAxMCkgJiYgKGN1clNlY3MgPSAnMCcgKyBjdXJTZWNzKTtcbiAgICAoc2VjcyA8IDEwKSAmJiAoc2VjcyA9ICcwJyArIHNlY3MpO1xuXG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSBjdXJNaW5zICsgJzonICsgY3VyU2VjcztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9IG1pbnMgKyAnOicgKyBzZWNzO1xuXG4gICAgaWYoc2V0dGluZ3MuYnVmZmVyZWQpIHtcbiAgICAgIHZhciBidWZmZXJlZCA9IGF1ZGlvLmJ1ZmZlcmVkO1xuICAgICAgaWYoYnVmZmVyZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBNYXRoLnJvdW5kKDEwMCAqIGJ1ZmZlcmVkLmVuZCgwKSAvIGF1ZGlvLmR1cmF0aW9uKTtcbiAgICAgICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IGxvYWRlZCArICclJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVE9ETyBzaHVmZmxlXG4gICAqL1xuICBmdW5jdGlvbiBzaHVmZmxlKCkge1xuICAgIGlmKHNodWZmbGUpIHtcbiAgICAgIGluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogcGxheUxpc3QubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkb0VuZCgpIHtcbiAgICBpZihpbmRleCA9PT0gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIXJlcGVhdGluZykge1xuICAgICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgICBwbEFjdGl2ZSgpO1xuICAgICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBsYXkoMCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGxheShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVCYXIoZXZ0LCBlbCwgZGlyKSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmKGRpciA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgICB2YWx1ZSA9IE1hdGgucm91bmQoICgoZXZ0LmNsaWVudFggLSBlbC5vZmZzZXQoKS5sZWZ0KSArIHdpbmRvdy5wYWdlWE9mZnNldCkgICogMTAwIC8gZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCk7XG4gICAgICBlbC5zdHlsZS53aWR0aCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmKGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICAgIHZhbHVlID0gcGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCk7XG4gICAgICAgIHZhciBkZWx0YSA9IGV2dC5kZWx0YVkgfHwgZXZ0LmRldGFpbCB8fCAtZXZ0LndoZWVsRGVsdGE7XG4gICAgICAgIHZhbHVlID0gKGRlbHRhID4gMCkgPyB2YWx1ZSAtIDEwIDogdmFsdWUgKyAxMDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gKGVsLm9mZnNldCgpLnRvcCArIGVsLm9mZnNldEhlaWdodCkgLSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCgob2Zmc2V0IC0gZXZ0LmNsaWVudFkpKTtcbiAgICAgIH1cbiAgICAgIGlmKHZhbHVlID4gMTAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAxMDA7XG4gICAgICBpZih2YWx1ZSA8IDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDA7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlckJhcihldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZyA9IHRydWU7XG4gICAgIXJpZ2h0Q2xpY2sgJiYgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgc2VlayhldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlclZvbChldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IHRydWU7XG4gICAgc2V0Vm9sdW1lKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWVrKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgd2luZG93LnZhbHVlID0gbW92ZUJhcihldnQsIHByb2dyZXNzQmFyLCAnaG9yaXpvbnRhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWtpbmdGYWxzZSgpIHtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIGF1ZGlvLmN1cnJlbnRUaW1lID0gYXVkaW8uZHVyYXRpb24gKiAod2luZG93LnZhbHVlIC8gMTAwKTtcbiAgICAgIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5yZW1vdmUoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIH1cbiAgICBzZWVraW5nID0gZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Vm9sdW1lKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuICAgIGlmKHNlZWtpbmdWb2wgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgfHwgZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IG1vdmVCYXIoZXZ0LCB2b2x1bWVCYXIucGFyZW50Tm9kZSwgJ3ZlcnRpY2FsJykgLyAxMDA7XG4gICAgICBpZih2YWx1ZSA8PSAwKSB7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmKGF1ZGlvLm11dGVkKSBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgICBhdWRpby52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeSh0aXRsZSwgYXR0cikge1xuICAgIGlmKCFzZXR0aW5ncy5ub3RpZmljYXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYod2luZG93Lk5vdGlmaWNhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF0dHIudGFnID0gJ0FQIG11c2ljIHBsYXllcic7XG4gICAgd2luZG93Lk5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbihhY2Nlc3MpIHtcbiAgICAgIGlmKGFjY2VzcyA9PT0gJ2dyYW50ZWQnKSB7XG4gICAgICAgIHZhciBub3RpY2UgPSBuZXcgTm90aWZpY2F0aW9uKHRpdGxlLnN1YnN0cigwLCAxMTApLCBhdHRyKTtcbiAgICAgICAgc2V0VGltZW91dChub3RpY2UuY2xvc2UuYmluZChub3RpY2UpLCA1MDAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4vKiBEZXN0cm95IG1ldGhvZC4gQ2xlYXIgQWxsICovXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgaWYoIWFwQWN0aXZlKSByZXR1cm47XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBwbGF5QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuICAgIHBsQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgLy8gUGxheWxpc3RcbiAgICBwbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgcGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbCk7XG5cbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGFwQWN0aXZlID0gZmFsc2U7XG4gICAgaW5kZXggPSAwO1xuXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuXG4gICAgLy8gUmVtb3ZlIHBsYXllciBmcm9tIHRoZSBET00gaWYgbmVjZXNzYXJ5XG4gICAgLy8gcGxheWVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGxheWVyKTtcbiAgfVxuXG5cbi8qKlxuICogIEhlbHBlcnNcbiAqL1xuICBmdW5jdGlvbiB3aGVlbCgpIHtcbiAgICB2YXIgd2hlZWw7XG4gICAgaWYgKCdvbndoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnd2hlZWwnO1xuICAgIH0gZWxzZSBpZiAoJ29ubW91c2V3aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ21vdXNld2hlZWwnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGVlbCA9ICdNb3pNb3VzZVBpeGVsU2Nyb2xsJztcbiAgICB9XG4gICAgcmV0dXJuIHdoZWVsO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgZm9yKHZhciBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmKGRlZmF1bHRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZShlbCwgYXR0cikge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbCk7XG4gICAgaWYoYXR0cikge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYoZWxlbWVudFtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZWxlbWVudFtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICBFbGVtZW50LnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgIHNjcm9sbExlZnQgPSB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXG4gICAgc2Nyb2xsVG9wID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiBlbC50b3AgKyBzY3JvbGxUb3AsXG4gICAgICBsZWZ0OiBlbC5sZWZ0ICsgc2Nyb2xsTGVmdFxuICAgIH07XG4gIH07XG5cbiAgRWxlbWVudC5wcm90b3R5cGUuY3NzID0gZnVuY3Rpb24oYXR0cikge1xuICAgIGlmKHR5cGVvZiBhdHRyID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUodGhpcywgJycpW2F0dHJdO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiBhdHRyID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYodGhpcy5zdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5zdHlsZVtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gbWF0Y2hlcyBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgPSBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMsIG5vZGVzID0gKG5vZGUucGFyZW50Tm9kZSB8fCBub2RlLmRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSwgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlIChub2Rlc1srK2ldICYmIG5vZGVzW2ldICE9IG5vZGUpO1xuICAgICAgICAgIHJldHVybiAhIW5vZGVzW2ldO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbiAgLy8gY2xvc2VzdCBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgPSBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIGVsID0gdGhpcztcbiAgICAgICAgICB3aGlsZSAoZWwubWF0Y2hlcyAmJiAhZWwubWF0Y2hlcyhzZWxlY3RvcikpIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICByZXR1cm4gZWwubWF0Y2hlcyA/IGVsIDogbnVsbDtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4vKipcbiAqICBQdWJsaWMgbWV0aG9kc1xuICovXG4gIHJldHVybiB7XG4gICAgaW5pdDogaW5pdCxcbiAgICB1cGRhdGU6IHVwZGF0ZVBMLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcblxufSkoKTtcblxud2luZG93LkFQID0gQXVkaW9QbGF5ZXI7XG5cbn0pKHdpbmRvdyk7XG5cbi8vIFRFU1Q6IGltYWdlIGZvciB3ZWIgbm90aWZpY2F0aW9uc1xudmFyIGljb25JbWFnZSA9ICdodHRwOi8vZnVua3lpbWcuY29tL2kvMjFwWDUucG5nJztcblxuQVAuaW5pdCh7XG4gIHBsYXlMaXN0OiBbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnSGl0bWFuJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0hpdG1hbi5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEcmVhbWVyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0RyZWFtZXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF1cbn0pO1xuXG4vLyBURVNUOiB1cGRhdGUgcGxheWxpc3RcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRTb25ncycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIEFQLnVwZGF0ZShbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF0pO1xufSlcblxuXG5jb25zb2xlLmxvZyhBUC5wbGF5TGlzdCk7IiwiLyogMjAxNy4gMDMuIFxuKi9cblxuXG4vKiA9PT09PT09IFJlc3BvbnNpdmUgV2ViID09PT09PT0gKi9cbmNvbnN0IGhQWCA9IHtcbiAgICBoZWFkZXI6IDUwLFxuICAgIGF1ZGlvUGxheWVyIDogODAsXG4gICAgaW5wdXRCb3ggOiA0NVxufVxuXG5jb25zdCByZXNpemVNYWluSGVpZ2h0ID0gZnVuY3Rpb24oKXtcbiAgdXRpbC4kKFwiI21haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaFBYLmhlYWRlciAtIGhQWC5hdWRpb1BsYXllciArJ3B4JztcbiAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaFBYLmhlYWRlciAtIGhQWC5hdWRpb1BsYXllciAtIGhQWC5pbnB1dEJveCArICdweCc7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7XG4gICAgcmVzaXplTWFpbkhlaWdodCgpO1xufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGZ1bmN0aW9uKCkge1xuICAgIHNlYXJjaExpc3RWaWV3LmNhbGxTZWFyY2hBUEkoKTtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuXG4vKiA9PT09PT09IFV0aWxpdHkgPT09PT09PSAqL1xudmFyIHV0aWwgPSB7XG4gICAgcnVuQWpheCA6IGZ1bmN0aW9uKHVybCwgbGlzdGVuZXIsIHJlcUZ1bmMpe1xuICAgICAgICBsZXQgb1JlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICBvUmVxLmFkZEV2ZW50TGlzdGVuZXIobGlzdGVuZXIsIHJlcUZ1bmMpO1xuICAgICAgICBvUmVxLm9wZW4oXCJHRVRcIiwgdXJsKTtcbiAgICAgICAgb1JlcS5zZW5kKCk7XG4gICAgfSxcbiAgICAkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfSxcbiAgICAkJDogZnVuY3Rpb24oc2VsZWN0b3Ipe1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgfVxufVxuXG4vKiA9PT09PT09IFlvdXR1YmUgQVBJIFNldHRpbmcgPT09PT09PSAqL1xuY29uc3Qgc2V0VGFyZ2V0VVJMID0gZnVuY3Rpb24oa2V5d29yZCwgc0dldFRva2VuKXtcbiAgICBcbiAgICBjb25zdCBiYXNlVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCYnO1xuICAgIHZhciBzZXR0aW5nID0ge1xuICAgICAgICBvcmRlcjogJ3ZpZXdDb3VudCcsXG4gICAgICAgIG1heFJlc3VsdHM6IDE1LFxuICAgICAgICB0eXBlOiAndmlkZW8nLFxuICAgICAgICBxOiBrZXl3b3JkLFxuICAgICAgICBrZXk6ICdBSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWcnXG4gICAgfVxuIFxuICAgIGxldCBzVGFyZ2V0VVJMID0gT2JqZWN0LmtleXMoc2V0dGluZykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdba10pO1xuICAgIH0pLmpvaW4oJyYnKVxuICAgIFxuICAgIHNUYXJnZXRVUkwgPSBiYXNlVVJMICsgc1RhcmdldFVSTDtcbiAgICBcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVUkwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cbiAgICByZXR1cm4gc1RhcmdldFVSTDtcbn1cblxuXG4vKiA9PT09PT09IE1vZGVsID09PT09PT0gKi9cbmNvbnN0IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hbGxWaWRlb3MgPSBqc29uOyAvL+yymOydjCDroZzrlKnrkKDrloQg66qo65OgIOuNsOydtO2EsOulvCDqsIDsoLjsmLXri4jri6QuXG4gICAgfSxcbiAgICBzZWxlY3RlZFZpZGVvSUQ6IG51bGwsIC8v7ISg7YOd7ZWcIOqwklxuICAgIG5leHRQYWdlVG9rZW5OdW1lcjogbnVsbCAvL+uLpOydjCDtjpjsnbTsp4Ag7Yag7YGwIOqwkjtcbn07XG5cbmNvbnN0IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgc2VhcmNoTGlzdFZpZXcuaW5pdCgpO1xuICAgIH0sXG4gICAgZ2V0QWxsVmlkZW9zOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5hbGxWaWRlb3MuaXRlbXM7XG4gICAgfSxcbiAgICBnZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5uZXh0UGFnZVRva2VuTnVtZXI7XG4gICAgfSxcbiAgICBzZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0Lm5leHRQYWdlVG9rZW5OdW1lciA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuYWxsVmlkZW9zLm5leHRQYWdlVG9rZW47XG4gICAgfSxcbiAgICBnZXRTZWxlY3RlZFZpZGVvSUQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LnNlbGVjdGVkVmlkZW9JRFxuICAgIH0sXG4gICAgc2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oaWQpe1xuICAgICAgICBpZCA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuc2VsZWN0ZWRWaWRlb0lEXG4gICAgfVxufVxuXG5jb25zdCBzZWFyY2hMaXN0VmlldyA9IHtcbiAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgdGhpcy5jb250ZW50ID0gdXRpbC4kKFwiLnNlYXJjaExpc3RcIik7XG4gICAgICAgdGhpcy50ZW1wbGF0ZSA9IHV0aWwuJChcIiNzZWFyY2hWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICB0aGlzLnByZXZpZXcoKTtcbiAgICBcbiAgIH0sXG4gICByZW5kZXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgdmlkZW9zID0gdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5nZXRBbGxWaWRlb3MoKTtcbiAgICAgICBsZXQgc0hUTUwgPSAnJztcbiAgICAgICBmb3IgKGxldCBpPTA7IGkgPCB2aWRlb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgbGV0IHZpZGVvSW1hZ2VVcmwgPSAgdmlkZW9zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5kZWZhdWx0LnVybDtcbiAgICAgICAgICAgbGV0IHZpZGVvVGl0bGUgPSAgdmlkZW9zW2ldLnNuaXBwZXQudGl0bGU7XG4gICAgICAgICAgIGxldCBwdWJsaXNoZWRBdCA9IHZpZGVvc1tpXS5zbmlwcGV0LnB1Ymxpc2hlZEF0O1xuICAgICAgICAgICBsZXQgdmlkZW9JZCA9IHZpZGVvc1tpXS5pZC52aWRlb0lkXG4gICAgICAgICAgIHNEb20gPSB0aGlzLnRlbXBsYXRlLnJlcGxhY2UoXCJ7dmlkZW9JbWFnZX1cIiwgdmlkZW9JbWFnZVVybClcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9UaXRsZX1cIiwgdmlkZW9UaXRsZSlcbiAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9WaWV3c31cIiwgcHVibGlzaGVkQXQpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvSWR9XCIsIHZpZGVvSWQpO1xuICAgICAgICAgICAgc0hUTUwgPSBzSFRNTCArIHNEb207XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb250ZW50Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgc0hUTUwpO1xuICAgIH0sXG4gICAgXG4gICAgY2FsbFNlYXJjaEFQSTogZnVuY3Rpb24oKXtcbiAgICAgICAgdXRpbC4kKFwiLmdvU2VhcmNoXCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICB0aGlzLnNlYXJjaEtleXdvcmQgPSB1dGlsLiQoXCIjc2VhcmNoX2JveFwiKS52YWx1ZTtcbiAgICAgICAgICAgIHNVcmwgPSBzZXRUYXJnZXRVUkwodGhpcy5zZWFyY2hLZXl3b3JkKTtcbiAgICAgICAgICAgIHV0aWwucnVuQWpheChzVXJsLCBcImxvYWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBqc29uID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgeW91dHViZUFQSVNlYXJjaFJlc3VsdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5pbml0KCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5zZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgc2VhcmNoTGlzdFZpZXcubW9yZVJlc3VsdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBtb3JlUmVzdWx0OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnNlYXJjaEtleXdvcmQgPSB1dGlsLiQoXCIjc2VhcmNoX2JveFwiKS52YWx1ZTtcbiAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLMKgZnVuY3Rpb24oKXtcbsKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoGlmKHRoaXMuc2Nyb2xsSGVpZ2h0wqAtwqB0aGlzLnNjcm9sbFRvcMKgPT09wqB0aGlzLmNsaWVudEhlaWdodCnCoHtcbiAgICAgICAgICAgICAgICBuZXh0UGFnZVRvayA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0TmV4dFBhZ2VUb2tlbigpO1xuICAgICAgICAgICAgICAgIHNVcmwgPSBzZXRUYXJnZXRVUkwodGhpcy5zZWFyY2hLZXl3b3JkLCBuZXh0UGFnZVRvayk7XG7CoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqAgdXRpbC5ydW5BamF4KHNVcmwswqBcImxvYWRcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBqc29uID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5zZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICAgICAgfSk7XG7CoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqB9XG7CoMKgwqDCoMKgwqDCoMKgfSk7ICBcbiAgICB9LFxuICAgIHByZXZpZXc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIFxuICAgICAgICAvLyBjb25zb2xlLmxvZyhjbG9zZUJ1dHRvbik7XG4gICAgIFxuXG4gICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgXG4gICAgICAgICAgIGxldCBsaSA9ICBldnQudGFyZ2V0LmNsb3Nlc3QoXCJsaVwiKTtcbiAgICAgICAgICAgaWYgKCFsaSkgcmV0dXJuO1xuICAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5kYXRhc2V0LmlkID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZVwiKTtcbiAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5pbm5lckhUTUwgPSB1dGlsLiQoXCIucHJldmlld01vZGFsXCIpLmlubmVySFRNTC5yZXBsYWNlKFwie2RhdGEtaWR9XCIsIGxpLmRhdGFzZXQuaWQpO1xuICAgICAgICAgIFxuICAgICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5jbGFzc0xpc3QuYWRkKFwibW9kYWwtb3BlblwiKTtcblxuICAgICAgICB9KTtcbiAgICAgICAgXG5cbiAgICAgICAgdXRpbC4kKFwiLmNsb3NlLXByZXZpZXdNb2RhbFwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhldnQudGFyZ2V0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cblxufVxuICIsIi8vLy8vLy8vLy8vLy8gTkFNRSBTUEFDRSBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBuYW1lU3BhY2UgPSB7fTtcbm5hbWVTcGFjZS4kZ2V0dmFsID0gJyc7XG5uYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdO1xubmFtZVNwYWNlLnBsYXlMaXN0ID0gW107XG5uYW1lU3BhY2UuamRhdGEgPSBbXTtcbm5hbWVTcGFjZS5hbGJ1bVN0b3JhZ2UgPSBsb2NhbFN0b3JhZ2U7XG4vLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBTVEFSVCAvLy8vLy8vLy8vLy9cbi8vZnVuY3Rpb25hbGl0eTEgOiBuYXZpZ2F0aW9uIGNvbnRyb2xcbnZhciBuYXYgPSBmdW5jdGlvbigpIHtcbiAgICAvL2dldCBlYWNoIGJ0biBpbiBuYXYgd2l0aCBkb20gZGVsZWdhdGlvbiB3aXRoIGpxdWVyeSBhbmQgZXZlbnQgcHJvcGFnYXRpb25cbiAgICAkKFwiLm5hdl9wYXJlbnRcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vYnViYmxpbmcgcHJldmVudFxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zb2xlLmxvZyhjbGFzc05hbWUpO1xuICAgICAgICBpZiAoY2xhc3NOYW1lID09IFwiYWxidW1fYnRuXCIpIHtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBcInBvcHVsYXJfYnRuXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUE9QVUxBUi4uLi4uP1wiKTtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTRUFSQ0ggQlROISEhIVwiKVxuICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLnNob3coKTsgLy/qsoDsg4kg6rKw6rO8IENsZWFyXG4gICAgICAgICAgICAkKFwiLmFkZE5ld01lZGlhXCIpLnNob3coKTsgLy/qsoDsg4kg7LC9IENsZWFyXG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBFTkQgLy8vLy8vLy8vLy8vXG5cbm5hdigpOyAvL25hdiDsi6Ttlolcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGZuR2V0TGlzdCA9IGZ1bmN0aW9uKHNHZXRUb2tlbikge1xuICAgIG5hbWVTcGFjZS4kZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmIChuYW1lU3BhY2UuJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuqygOyDieyWtOyeheugpeuwlOuejeuLiOuLpC5cIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vQ2xlYW5zaW5nIERvbSwgVmlkZW9JZFxuICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107IC8vZ2V0dmlkZW9JZCBhcnJheey0iOq4sO2ZlFxuICAgIC8vICQoXCIuc2VhcmNoTGlzdFwiKS5lbXB0eSgpOyAvL+qygOyDiSDqsrDqs7wgVmlld+y0iOq4sO2ZlFxuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgICAgICBjb25zb2xlLmxvZyhzVGFyZ2V0VXJsKTtcbiAgICB9XG5cbiAgICAkLmFqYXgoe1xuICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgdXJsOiBzVGFyZ2V0VXJsLFxuICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqZGF0YSkge1xuICAgICAgICAgICAgbmFtZVNwYWNlLmpkYXRhID0gamRhdGE7IC8vamRhdGEuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlYXJjaFJlc3VsdFZpZXcoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkLnB1c2goamRhdGEuaXRlbXNbaV0uaWQudmlkZW9JZCk7IC8vbmFtZVNwYWNlLmdldHZpZGVvSWTsl5Ag6rKA7IOJ65CcIHZpZGVvSUQg67Cw7Je066GcIOy2lOqwgFxuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbMF0pO1xuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICAgICAgICAgICAgICAvL3BsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgZ2V0TW9yZVNlYXJjaFJlc3VsdChqZGF0YS5uZXh0UGFnZVRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLy8vLy8vLy8vLy8vLyBTRUFSQ0ggQVBJIEVORCAvLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8v7Iqk7YGs66GkIOuLpOyatOyLnCDtlajsiJgg7Iuk7ZaJ7ZWY6riwLlxudmFyIGdldE1vcmVTZWFyY2hSZXN1bHQgPSBmdW5jdGlvbihuZXh0UGFnZVRva2VuKXtcbiAgICAkKFwiLnNlYXJjaExpc3RcIikuc2Nyb2xsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoJCh0aGlzKS5zY3JvbGxUb3AoKSArICQodGhpcykuaW5uZXJIZWlnaHQoKSA+PSAkKHRoaXMpWzBdLnNjcm9sbEhlaWdodCkge1xuICAgICAgICAgICAgZm5HZXRMaXN0KG5leHRQYWdlVG9rZW4pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuXG5cbiAgICBcbi8vLy8vLy8vLy8vLyBTRUFSQ0ggUkVTVUxUIFZJRVcgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgc2VhcmNoUmVzdWx0VmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWFyY2hSZXN1bHRMaXN0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lU3BhY2UuamRhdGEuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdldFRlbXBsYXRlID0gJCgnI3NlYXJjaFZpZGVvJylbMF07IC8vdGVtcGxhdGUgcXVlcnlzZWxlY3RcbiAgICAgICAgdmFyIGdldEh0bWxUZW1wbGF0ZSA9IGdldFRlbXBsYXRlLmlubmVySFRNTDsgLy9nZXQgaHRtbCBpbiB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRhcHRUZW1wbGF0ZSA9IGdldEh0bWxUZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmwpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1RpdGxlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aXRsZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAucmVwbGFjZShcIntpZH1cIiwgaSk7XG4gICAgICAgIHNlYXJjaFJlc3VsdExpc3QgPSBzZWFyY2hSZXN1bHRMaXN0ICsgYWRhcHRUZW1wbGF0ZTtcbiAgICB9XG4gICAgJCgnLnNlYXJjaExpc3QnKS5lbXB0eSgpLmFwcGVuZChzZWFyY2hSZXN1bHRMaXN0KTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gU1RBUlQgLy8vLy8vLy8vLy8vLy8vL1xudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdICsgXCInP3JlbD0wICYgZW5hYmxlanNhcGk9MSBmcmFtZWJvcmRlcj0wIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIik7XG4gICAgfSk7XG59O1xuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gRU5EIC8vLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGFkZFBsYXlMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hWaWRlbyBsaSBidXR0b25cIikub24oXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUFBQVwiKTtcbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAvLyB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJCh0aGlzKSk7XG4gICAgfSk7XG59O1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBFTkQgLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cbi8vIC8vIExheW91dCDrs4Dqsr1cbi8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7XG4vLyAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbi8vIH0pO1xuXG4vLyByZXNpemVNYWluSGVpZ2h0KCk7XG4vLyBmdW5jdGlvbiByZXNpemVNYWluSGVpZ2h0KCl7XG4vLyAgIHZhciBoZWFkZXJIZWlnaHQgPSA1MDtcbi8vICAgdmFyIGF1ZGlvUGxheWVySGVpZ2h0ID0gODA7XG4vLyAgIHZhciBpbnB1dEJveEhlaWdodCA9IDQ1O1xuLy8gICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgKydweCc7XG4vLyAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkZXJIZWlnaHQgLSBhdWRpb1BsYXllckhlaWdodCAtIGlucHV0Qm94SGVpZ2h0ICsgJ3B4Jztcbi8vIH1cblxuXG5cbiJdfQ==
;