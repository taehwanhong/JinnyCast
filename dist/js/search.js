;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var util = {
    $: function(selector) {
        return document.querySelector(selector);
    },
    $$: function(selector){
        return document.querySelectorAll(selector);
    },
    getChildOrder: function(elChild) {
        const elParent = elChild.parentNode;
        let nIndex = Array.prototype.indexOf.call(elParent.children, elChild);
        return nIndex;
    },
}



//mediaPlayView

util.$(".userPlaylist li").addEventListener("click", function(evt) {
    
    // a = util.getChildOrder(evt.target);
    console.log(this);
    // if (target.tagName === "I"){ target = target.parentNode; }
    // util.$(".ap").classList.toggle("ap__hide");
    // util.$(".icon-up").classList.toggle("hide");
    // util.$(".icon-down").classList.toggle("hide");
});





// 아이콘 변경
// util.$(".close_btn").addEventListener("click", showAudioPlayerWindow, false);

// function showAudioPlayerWindow(evt){
//     target = evt.target;
//     if (target.tagName === "I"){ target = target.parentNode; }
//     util.$(".ap").classList.toggle("ap__hide");
//     util.$(".icon-up").classList.toggle("hide");
//     util.$(".icon-down").classList.toggle("hide");

// };

// util.$(".volume_btn").addEventListener("click", function(evt) {
//     target = evt.target;
//     if (target.tagName === "I"){ target = target.parentNode; }
//     util.$(".icon-volume-on").classList.toggle("hide");
//     util.$(".icon-volume-off").classList.toggle("hide");
// });





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
// document.getElementById('addSongs').addEventListener('click', function(e) {
//   e.preventDefault();
  AP.update([
    {'icon': iconImage, 'title': 'District Four', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3'},
    {'icon': iconImage, 'title': 'Christmas Rap', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Christmas%20Rap.mp3'},
    {'icon': iconImage, 'title': 'Rocket Power', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket%20Power.mp3'}
  ]);
// })

console.log(AP);
},{}],3:[function(require,module,exports){



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
},{}],4:[function(require,module,exports){
function fnGetList(sGetToken) {
    var $getval = $("#search_box").val();
    if ($getval == "") {
        alert == ("뭐임마");
        $("#search_box").focus();
        return;
    }

    $("#get_view").empty();
    $("#nav_view").empty();

    var sTargetUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance" +
        "&q=" + encodeURIComponent($getval) + "&key=AIzaSyDjBfDWFgQa6bdeLc1PAM8EoDAFB_CGYig";
    if (sGetToken) {
        sTargetUrl += "&pageToken=" + sGetToken;
    }

    $.ajax({
        type: "POST",
        url: sTargetUrl,
        dataType: "jsonp",
        success: function(jdata) {
            console.log(jdata);

            $(jdata.items).each(function(i) {
                console.log(this.snippet.channelId);
            }).promise().done(function() {
                if (jdata.prevPageToken) {
                    $("#nav_view").append("<a href='javascript:fnGetList(\""+jdata.prevPageToken+"\");'><이전페이지></a>");
                }
                if (jdata.nextPageToken) {
                    $("#nav_view").append("<a href='javascript:fnGetList(\""+jdata.nextPageToken+"\");'><다음페이지></a>");
                }
            });
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
}
},{}],5:[function(require,module,exports){
///iframe player

var firstID
    // 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');
// console.log(jdata);
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: '8A2t_tAjMz8',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
    event.target.playVideo();
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING && !done) {
        setTimeout(stopVideo, 60000);
        done = true;
    }
}

function stopVideo() {
    player.stopVideo();
}
},{}],6:[function(require,module,exports){
///////////// NAME SPACE START ///////////////
var nameSpace = {};
nameSpace.$getval = '';
nameSpace.getvideoId = [];
nameSpace.playList = [];
nameSpace.jdata = [];
///////////// NAME SPACE END ///////////////

//DEVMODE/////////// NAV control START ////////////
//functionality1 : navigation control
var nav = function() {
    //get each btn in nav with dom delegation with jquery and event propagation
    $(".nav_parent").on("click", "li", function(event) {
        event.preventDefault(); //bubbling prevent
        var target = event.currentTarget;
        // target =
        // if (event.currentTarget == "li.")
        console.log(target);
    });
};


/*<ul id="nav_parent">
                 <li class="search_btn"><i class="la la-search"></i><span>Search</span></li>
                 <li class="album_btn"><i class="la la-music"></i><span>My Album</span></li>
                 <li class="popular_btn"><i class="la la-heart-o"></i><span>popular</span></li>
                 <li class="about_btn"><i class="la la-info-circle"></i><span>About<span></li>
             </ul>*/

nav();
//DEVMODE/////////// NAV control END ////////////





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
    $(".searchList").empty(); //검색 결과 View초기화
    // $(".nav_view").empty();
    $(".videoPlayer").empty(); //player Dom초기화

    //querysection//
    //15개씩

    var sTargetUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance&maxResults=15&type=video" + "&q=" + encodeURIComponent(nameSpace.$getval) + "&key=AIzaSyDjBfDWFgQa6bdeLc1PAM8EoDAFB_CGYig";

    if (sGetToken) {
        sTargetUrl += "&pageToken=" + sGetToken;
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
                console.log(nameSpace.getvideoId[0]);
                $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[0] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
                playVideoSelect();
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

//////////// SEARCH RESULT VIEW START ///////////////
var searchResultView = function() {
    var searchResultList = '';
    var getSearchListDOM = document.querySelector('.searchList');
    for (var i = 0; i < nameSpace.jdata.items.length; i++) {
        var getTemplate = document.querySelector('#searchVideo'); //template queryselect
        var getHtmlTemplate = getTemplate.innerHTML; //get html in template
        var adaptTemplate = getHtmlTemplate.replace("{videoImage}", nameSpace.jdata.items[i].snippet.thumbnails.default.url)
            .replace("{videoTitle}", nameSpace.jdata.items[i].snippet.title)
            .replace("{videoViews}", "TBD")
            .replace("{id}", i);

        searchResultList = searchResultList + adaptTemplate;
        console.log();
    }
    getSearchListDOM.innerHTML = searchResultList;
};
// $(".searchList").append("<li class='box' id='" + i + "'><img src='" + jdata.items[i].snippet.thumbnails.high.url + "' width = 20px>" + this.snippet.title + "<button id='" + i + "'type='button' onclick='addPlayList()'>add</button></li>"); //list보여주기
//////////// SEARCH RESULT VIEW END ///////////////


//////// PLAY SELECT VIDEO START ////////////////
var playVideoSelect = function() {
    $(".searchList").on("click", "li", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        console.log(tagId);
        console.log(nameSpace.getvideoId[tagId]);
        $(".videoPlayer").empty(); //player Dom초기화
        $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[tagId] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
    });
};
//////// PLAY SELECT VIDEO END ////////////////

//DEVMODE/////////// ADD PLAY LIST TO ALBUM START /////////////////
var addPlayList = function() {
    $(".searchList li").on("click", "button", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        nameSpace.playList.push(nameSpace.getvideoId[tagId]);
        console.log(nameSpace.playList);
    });
};
//DEVMODE/////////// ADD PLAY LIST TO ALBUM END /////////////////
},{}]},{},[1,2,3,4,5,6])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbmxlZS9Eb2N1bWVudHMvZGQvSmlubnlDYXN0L3N0YXRpYy9qcy9Zb3V0dWJlc2VhcmNoLmpzIiwiL1VzZXJzL3N1amlubGVlL0RvY3VtZW50cy9kZC9KaW5ueUNhc3Qvc3RhdGljL2pzL2F1ZGlvUGxheWVyLmpzIiwiL1VzZXJzL3N1amlubGVlL0RvY3VtZW50cy9kZC9KaW5ueUNhc3Qvc3RhdGljL2pzL2F1ZGlvUGxheWVyU2FtcGxlLmpzIiwiL1VzZXJzL3N1amlubGVlL0RvY3VtZW50cy9kZC9KaW5ueUNhc3Qvc3RhdGljL2pzL2F1dGguanMiLCIvVXNlcnMvc3VqaW5sZWUvRG9jdW1lbnRzL2RkL0ppbm55Q2FzdC9zdGF0aWMvanMvcGxheWVyLmpzIiwiL1VzZXJzL3N1amlubGVlL0RvY3VtZW50cy9kZC9KaW5ueUNhc3Qvc3RhdGljL2pzL3NlYXJjaC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6W251bGwsInZhciB1dGlsID0ge1xuICAgICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgICQkOiBmdW5jdGlvbihzZWxlY3Rvcil7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICB9LFxuICAgIGdldENoaWxkT3JkZXI6IGZ1bmN0aW9uKGVsQ2hpbGQpIHtcbiAgICAgICAgY29uc3QgZWxQYXJlbnQgPSBlbENoaWxkLnBhcmVudE5vZGU7XG4gICAgICAgIGxldCBuSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGVsUGFyZW50LmNoaWxkcmVuLCBlbENoaWxkKTtcbiAgICAgICAgcmV0dXJuIG5JbmRleDtcbiAgICB9LFxufVxuXG5cblxuLy9tZWRpYVBsYXlWaWV3XG5cbnV0aWwuJChcIi51c2VyUGxheWxpc3QgbGlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGV2dCkge1xuICAgIFxuICAgIC8vIGEgPSB1dGlsLmdldENoaWxkT3JkZXIoZXZ0LnRhcmdldCk7XG4gICAgY29uc29sZS5sb2codGhpcyk7XG4gICAgLy8gaWYgKHRhcmdldC50YWdOYW1lID09PSBcIklcIil7IHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlOyB9XG4gICAgLy8gdXRpbC4kKFwiLmFwXCIpLmNsYXNzTGlzdC50b2dnbGUoXCJhcF9faGlkZVwiKTtcbiAgICAvLyB1dGlsLiQoXCIuaWNvbi11cFwiKS5jbGFzc0xpc3QudG9nZ2xlKFwiaGlkZVwiKTtcbiAgICAvLyB1dGlsLiQoXCIuaWNvbi1kb3duXCIpLmNsYXNzTGlzdC50b2dnbGUoXCJoaWRlXCIpO1xufSk7XG5cblxuXG5cblxuLy8g7JWE7J207L2YIOuzgOqyvVxuLy8gdXRpbC4kKFwiLmNsb3NlX2J0blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0F1ZGlvUGxheWVyV2luZG93LCBmYWxzZSk7XG5cbi8vIGZ1bmN0aW9uIHNob3dBdWRpb1BsYXllcldpbmRvdyhldnQpe1xuLy8gICAgIHRhcmdldCA9IGV2dC50YXJnZXQ7XG4vLyAgICAgaWYgKHRhcmdldC50YWdOYW1lID09PSBcIklcIil7IHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlOyB9XG4vLyAgICAgdXRpbC4kKFwiLmFwXCIpLmNsYXNzTGlzdC50b2dnbGUoXCJhcF9faGlkZVwiKTtcbi8vICAgICB1dGlsLiQoXCIuaWNvbi11cFwiKS5jbGFzc0xpc3QudG9nZ2xlKFwiaGlkZVwiKTtcbi8vICAgICB1dGlsLiQoXCIuaWNvbi1kb3duXCIpLmNsYXNzTGlzdC50b2dnbGUoXCJoaWRlXCIpO1xuXG4vLyB9O1xuXG4vLyB1dGlsLiQoXCIudm9sdW1lX2J0blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZXZ0KSB7XG4vLyAgICAgdGFyZ2V0ID0gZXZ0LnRhcmdldDtcbi8vICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgPT09IFwiSVwiKXsgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGU7IH1cbi8vICAgICB1dGlsLiQoXCIuaWNvbi12b2x1bWUtb25cIikuY2xhc3NMaXN0LnRvZ2dsZShcImhpZGVcIik7XG4vLyAgICAgdXRpbC4kKFwiLmljb24tdm9sdW1lLW9mZlwiKS5jbGFzc0xpc3QudG9nZ2xlKFwiaGlkZVwiKTtcbi8vIH0pO1xuXG5cblxuXG5cbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2ljb25cIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmVcIj4nK1xuICAgICAgICAgICAgICAgICc8c3ZnIGZpbGw9XCIjMDAwMDAwXCIgaGVpZ2h0PVwiMjBcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgd2lkdGg9XCIyMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPHBhdGggZD1cIk02IDE5YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY3SDZ2MTJ6TTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINXYyaDE0VjR6XCIvPicrXG4gICAgICAgICAgICAgICAgICAgICc8cGF0aCBkPVwiTTAgMGgyNHYyNEgwelwiIGZpbGw9XCJub25lXCIvPicrXG4gICAgICAgICAgICAgICAgJzwvc3ZnPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWUtYnRuJyk7XG4gICAgcGxCdG4gICAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcGxheWxpc3QnKTtcbiAgICBjdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWN1cnJlbnQnKTtcbiAgICBkdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWR1cmF0aW9uJyk7XG4gICAgdHJhY2tUaXRsZSAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aXRsZScpO1xuICAgIHByb2dyZXNzQmFyICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fYmFyJyk7XG4gICAgcHJlbG9hZEJhciAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19wcmVsb2FkJyk7XG4gICAgdm9sdW1lQmFyICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZV9fYmFyJyk7XG5cbiAgICBwbGF5TGlzdCA9IHNldHRpbmdzLnBsYXlMaXN0O1xuXG4gICAgcGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcblxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXBBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIHBsYXlsaXN0XG4gICAgcmVuZGVyUEwoKTtcbiAgICBwbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaW8gb2JqZWN0XG4gICAgYXVkaW8gPSBuZXcgQXVkaW8oKTtcbiAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgYXVkaW8ucHJlbG9hZCA9ICdhdXRvJztcblxuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gYXVkaW8udm9sdW1lICogMTAwICsgJyUnO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgaWYoc2V0dGluZ3MuYXV0b1BsYXkpIHtcbiAgICAgIGF1ZGlvLnBsYXkoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VEb2N1bWVudFRpdGxlKHRpdGxlKSB7XG4gICAgaWYoc2V0dGluZ3MuY2hhbmdlRG9jVGl0bGUpIHtcbiAgICAgIGlmKHRpdGxlKSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2NUaXRsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVVbmxvYWQoZXZ0KSB7XG4gICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnTXVzaWMgc3RpbGwgcGxheWluZyc7XG4gICAgICBldnQucmV0dXJuVmFsdWUgPSBtZXNzYWdlO1xuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKGV2dCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG1lZGlhRXJyb3IgPSB7XG4gICAgICAnMSc6ICdNRURJQV9FUlJfQUJPUlRFRCcsXG4gICAgICAnMic6ICdNRURJQV9FUlJfTkVUV09SSycsXG4gICAgICAnMyc6ICdNRURJQV9FUlJfREVDT0RFJyxcbiAgICAgICc0JzogJ01FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCdcbiAgICB9O1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBwbExpW2luZGV4XSAmJiBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgIHRocm93IG5ldyBFcnJvcignSG91c3RvbiB3ZSBoYXZlIGEgcHJvYmxlbTogJyArIG1lZGlhRXJyb3JbZXZ0LnRhcmdldC5lcnJvci5jb2RlXSk7XG4gIH1cblxuLyoqXG4gKiBVUERBVEUgUExcbiAqL1xuICBmdW5jdGlvbiB1cGRhdGVQTChhZGRMaXN0KSB7XG4gICAgaWYoIWFwQWN0aXZlKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBpcyBub3QgeWV0IGluaXRpYWxpemVkJztcbiAgICB9XG4gICAgaWYoIUFycmF5LmlzQXJyYXkoYWRkTGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYWRkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY291bnQgPSBwbGF5TGlzdC5sZW5ndGg7XG4gICAgdmFyIGh0bWwgID0gW107XG4gICAgcGxheUxpc3QucHVzaC5hcHBseShwbGF5TGlzdCwgYWRkTGlzdCk7XG4gICAgYWRkTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGh0bWwucHVzaChcbiAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgY291bnQrKykucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICApO1xuICAgIH0pO1xuICAgIC8vIElmIGV4aXN0IGVtcHR5IG1lc3NhZ2VcbiAgICBpZihwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLnJlbW92ZUNoaWxkKCBwbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSApO1xuICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICB9XG4gICAgLy8gQWRkIHNvbmcgaW50byBwbGF5bGlzdFxuICAgIHBsVWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVFbmQnLCBodG1sLmpvaW4oJycpKTtcbiAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcbiAgfVxuXG4vKipcbiAqICBQbGF5TGlzdCBtZXRob2RzXG4gKi9cbiAgICBmdW5jdGlvbiByZW5kZXJQTCgpIHtcbiAgICAgIHZhciBodG1sID0gW107XG5cbiAgICAgIHBsYXlMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaSkge1xuICAgICAgICBodG1sLnB1c2goXG4gICAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgaSkucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgcGwgPSBjcmVhdGUoJ2RpdicsIHtcbiAgICAgICAgJ2NsYXNzTmFtZSc6ICdwbC1jb250YWluZXInLFxuICAgICAgICAnaWQnOiAncGwnLFxuICAgICAgICAnaW5uZXJIVE1MJzogJzx1bCBjbGFzcz1cInBsLXVsXCI+JyArICghaXNFbXB0eUxpc3QoKSA/IGh0bWwuam9pbignJykgOiAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JykgKyAnPC91bD4nXG4gICAgICB9KTtcblxuICAgICAgcGxheWVyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHBsLCBwbGF5ZXIubmV4dFNpYmxpbmcpO1xuXG4gICAgICBwbFVsID0gcGwucXVlcnlTZWxlY3RvcignLnBsLXVsJyk7XG4gICAgICBwbExpID0gcGxVbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICBwbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdEhhbmRsZXIoZXZ0KSB7XG4gICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgaWYoZXZ0LnRhcmdldC5tYXRjaGVzKCcucGwtbGlzdF9fdGl0bGUnKSkge1xuICAgICAgICB2YXIgY3VycmVudCA9IHBhcnNlSW50KGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuICAgICAgICBpZihpbmRleCAhPT0gY3VycmVudCkge1xuICAgICAgICAgIGluZGV4ID0gY3VycmVudDtcbiAgICAgICAgICBwbGF5KGN1cnJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYoISFldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0X19yZW1vdmUnKSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudEVsID0gZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpO1xuICAgICAgICAgICAgdmFyIGlzRGVsID0gcGFyc2VJbnQocGFyZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcblxuICAgICAgICAgICAgcGxheUxpc3Quc3BsaWNlKGlzRGVsLCAxKTtcbiAgICAgICAgICAgIHBhcmVudEVsLmNsb3Nlc3QoJy5wbC11bCcpLnJlbW92ZUNoaWxkKHBhcmVudEVsKTtcblxuICAgICAgICAgICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwbExpLCBmdW5jdGlvbihlbCwgaSkge1xuICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snLCBpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcGxheShpbmRleCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckFsbCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgaWYoaXNEZWwgPiBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4IC09IDE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgICAgICAgICAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoaXNEZWwgPCBpbmRleCkge1xuICAgICAgICAgICAgICBpbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsQWN0aXZlKCkge1xuICAgICAgaWYoYXVkaW8ucGF1c2VkKSB7XG4gICAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnQgPSBpbmRleDtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHBsTGkubGVuZ3RoOyBsZW4gPiBpOyBpKyspIHtcbiAgICAgICAgcGxMaVtpXS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICB9XG4gICAgICBwbExpW2N1cnJlbnRdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICB9XG5cblxuLyoqXG4gKiBQbGF5ZXIgbWV0aG9kc1xuICovXG4gIGZ1bmN0aW9uIHBsYXkoY3VycmVudEluZGV4KSB7XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gY2xlYXJBbGwoKTtcbiAgICB9XG5cbiAgICBpbmRleCA9IChjdXJyZW50SW5kZXggKyBwbGF5TGlzdC5sZW5ndGgpICUgcGxheUxpc3QubGVuZ3RoO1xuXG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICAvLyBDaGFuZ2UgZG9jdW1lbnQgdGl0bGVcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAvLyBBdWRpbyBwbGF5XG4gICAgYXVkaW8ucGxheSgpO1xuXG4gICAgLy8gU2hvdyBub3RpZmljYXRpb25cbiAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgIGJvZHk6ICdOb3cgcGxheWluZycsXG4gICAgICB0YWc6ICdtdXNpYy1wbGF5ZXInXG4gICAgfSk7XG5cbiAgICAvLyBUb2dnbGUgcGxheSBidXR0b25cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcblxuICAgIC8vIFNldCBhY3RpdmUgc29uZyBwbGF5bGlzdFxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmV2KCkge1xuICAgIHBsYXkoaW5kZXggLSAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgcGxheShpbmRleCArIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eUxpc3QoKSB7XG4gICAgcmV0dXJuIHBsYXlMaXN0Lmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyQWxsKCkge1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXVkaW8uc3JjID0gJyc7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSAncXVldWUgaXMgZW1wdHknO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgaWYoIXBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwuaW5uZXJIVE1MID0gJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPic7XG4gICAgfVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXlUb2dnbGUoKSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhdWRpby5wYXVzZWQpIHtcblxuICAgICAgaWYoYXVkaW8uY3VycmVudFRpbWUgPT09IDApIHtcbiAgICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIH1cbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdm9sdW1lVG9nZ2xlKCkge1xuICAgIGlmKGF1ZGlvLm11dGVkKSB7XG4gICAgICBpZihwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKSA9PT0gMCkge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gc2V0dGluZ3Mudm9sdW1lICogMTAwICsgJyUnO1xuICAgICAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZvbHVtZUxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVwZWF0VG9nZ2xlKCkge1xuICAgIGlmKHJlcGVhdEJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICByZXBlYXRpbmcgPSBmYWxzZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXBlYXRpbmcgPSB0cnVlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBsVG9nZ2xlKCkge1xuICAgIHBsQnRuLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICAgIHBsLmNsYXNzTGlzdC50b2dnbGUoJ2gtc2hvdycpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZVVwZGF0ZSgpIHtcbiAgICBpZihhdWRpby5yZWFkeVN0YXRlID09PSAwIHx8IHNlZWtpbmcpIHJldHVybjtcblxuICAgIHZhciBiYXJsZW5ndGggPSBNYXRoLnJvdW5kKGF1ZGlvLmN1cnJlbnRUaW1lICogKDEwMCAvIGF1ZGlvLmR1cmF0aW9uKSk7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSBiYXJsZW5ndGggKyAnJSc7XG5cbiAgICB2YXJcbiAgICBjdXJNaW5zID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAvIDYwKSxcbiAgICBjdXJTZWNzID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAtIGN1ck1pbnMgKiA2MCksXG4gICAgbWlucyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLyA2MCksXG4gICAgc2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLSBtaW5zICogNjApO1xuICAgIChjdXJTZWNzIDwgMTApICYmIChjdXJTZWNzID0gJzAnICsgY3VyU2Vjcyk7XG4gICAgKHNlY3MgPCAxMCkgJiYgKHNlY3MgPSAnMCcgKyBzZWNzKTtcblxuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gY3VyTWlucyArICc6JyArIGN1clNlY3M7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSBtaW5zICsgJzonICsgc2VjcztcblxuICAgIGlmKHNldHRpbmdzLmJ1ZmZlcmVkKSB7XG4gICAgICB2YXIgYnVmZmVyZWQgPSBhdWRpby5idWZmZXJlZDtcbiAgICAgIGlmKGJ1ZmZlcmVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgbG9hZGVkID0gTWF0aC5yb3VuZCgxMDAgKiBidWZmZXJlZC5lbmQoMCkgLyBhdWRpby5kdXJhdGlvbik7XG4gICAgICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSBsb2FkZWQgKyAnJSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRPRE8gc2h1ZmZsZVxuICAgKi9cbiAgZnVuY3Rpb24gc2h1ZmZsZSgpIHtcbiAgICBpZihzaHVmZmxlKSB7XG4gICAgICBpbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHBsYXlMaXN0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZG9FbmQoKSB7XG4gICAgaWYoaW5kZXggPT09IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFyZXBlYXRpbmcpIHtcbiAgICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgICAgcGxBY3RpdmUoKTtcbiAgICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwbGF5KDApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlQmFyKGV2dCwgZWwsIGRpcikge1xuICAgIHZhciB2YWx1ZTtcbiAgICBpZihkaXIgPT09ICdob3Jpem9udGFsJykge1xuICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKCAoKGV2dC5jbGllbnRYIC0gZWwub2Zmc2V0KCkubGVmdCkgKyB3aW5kb3cucGFnZVhPZmZzZXQpICAqIDEwMCAvIGVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGgpO1xuICAgICAgZWwuc3R5bGUud2lkdGggPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZihldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgICB2YWx1ZSA9IHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApO1xuICAgICAgICB2YXIgZGVsdGEgPSBldnQuZGVsdGFZIHx8IGV2dC5kZXRhaWwgfHwgLWV2dC53aGVlbERlbHRhO1xuICAgICAgICB2YWx1ZSA9IChkZWx0YSA+IDApID8gdmFsdWUgLSAxMCA6IHZhbHVlICsgMTA7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IChlbC5vZmZzZXQoKS50b3AgKyBlbC5vZmZzZXRIZWlnaHQpIC0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQoKG9mZnNldCAtIGV2dC5jbGllbnRZKSk7XG4gICAgICB9XG4gICAgICBpZih2YWx1ZSA+IDEwMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMTAwO1xuICAgICAgaWYodmFsdWUgPCAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAwO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJCYXIoZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmcgPSB0cnVlO1xuICAgICFyaWdodENsaWNrICYmIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIHNlZWsoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJWb2woZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSB0cnVlO1xuICAgIHNldFZvbHVtZShldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VlayhldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIHdpbmRvdy52YWx1ZSA9IG1vdmVCYXIoZXZ0LCBwcm9ncmVzc0JhciwgJ2hvcml6b250YWwnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZWVraW5nRmFsc2UoKSB7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICBhdWRpby5jdXJyZW50VGltZSA9IGF1ZGlvLmR1cmF0aW9uICogKHdpbmRvdy52YWx1ZSAvIDEwMCk7XG4gICAgICBwcm9ncmVzc0Jhci5jbGFzc0xpc3QucmVtb3ZlKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICB9XG4gICAgc2Vla2luZyA9IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZvbHVtZShldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcbiAgICBpZihzZWVraW5nVm9sICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlIHx8IGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICB2YXIgdmFsdWUgPSBtb3ZlQmFyKGV2dCwgdm9sdW1lQmFyLnBhcmVudE5vZGUsICd2ZXJ0aWNhbCcpIC8gMTAwO1xuICAgICAgaWYodmFsdWUgPD0gMCkge1xuICAgICAgICBhdWRpby52b2x1bWUgPSAwO1xuICAgICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZihhdWRpby5tdXRlZCkgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gdmFsdWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnkodGl0bGUsIGF0dHIpIHtcbiAgICBpZighc2V0dGluZ3Mubm90aWZpY2F0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKHdpbmRvdy5Ob3RpZmljYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhdHRyLnRhZyA9ICdBUCBtdXNpYyBwbGF5ZXInO1xuICAgIHdpbmRvdy5Ob3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oZnVuY3Rpb24oYWNjZXNzKSB7XG4gICAgICBpZihhY2Nlc3MgPT09ICdncmFudGVkJykge1xuICAgICAgICB2YXIgbm90aWNlID0gbmV3IE5vdGlmaWNhdGlvbih0aXRsZS5zdWJzdHIoMCwgMTEwKSwgYXR0cik7XG4gICAgICAgIHNldFRpbWVvdXQobm90aWNlLmNsb3NlLmJpbmQobm90aWNlKSwgNTAwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuLyogRGVzdHJveSBtZXRob2QuIENsZWFyIEFsbCAqL1xuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGlmKCFhcEFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcGxheUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcbiAgICBwbEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIC8vIFBsYXlsaXN0XG4gICAgcGwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIHBsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGwpO1xuXG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhcEFjdGl2ZSA9IGZhbHNlO1xuICAgIGluZGV4ID0gMDtcblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIHBsQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcblxuICAgIC8vIFJlbW92ZSBwbGF5ZXIgZnJvbSB0aGUgRE9NIGlmIG5lY2Vzc2FyeVxuICAgIC8vIHBsYXllci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsYXllcik7XG4gIH1cblxuXG4vKipcbiAqICBIZWxwZXJzXG4gKi9cbiAgZnVuY3Rpb24gd2hlZWwoKSB7XG4gICAgdmFyIHdoZWVsO1xuICAgIGlmICgnb253aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ3doZWVsJztcbiAgICB9IGVsc2UgaWYgKCdvbm1vdXNld2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICdtb3VzZXdoZWVsJztcbiAgICB9IGVsc2Uge1xuICAgICAgd2hlZWwgPSAnTW96TW91c2VQaXhlbFNjcm9sbCc7XG4gICAgfVxuICAgIHJldHVybiB3aGVlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIGZvcih2YXIgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICBpZihkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGUoZWwsIGF0dHIpIHtcbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpO1xuICAgIGlmKGF0dHIpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKGVsZW1lbnRbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGVsZW1lbnRbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgRWxlbWVudC5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICBzY3JvbGxMZWZ0ID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LFxuICAgIHNjcm9sbFRvcCA9IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogZWwudG9wICsgc2Nyb2xsVG9wLFxuICAgICAgbGVmdDogZWwubGVmdCArIHNjcm9sbExlZnRcbiAgICB9O1xuICB9O1xuXG4gIEVsZW1lbnQucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlKHRoaXMsICcnKVthdHRyXTtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgYXR0ciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKHRoaXMuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuc3R5bGVbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIG1hdGNoZXMgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzID0gRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLCBub2RlcyA9IChub2RlLnBhcmVudE5vZGUgfHwgbm9kZS5kb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvciksIGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAobm9kZXNbKytpXSAmJiBub2Rlc1tpXSAhPSBub2RlKTtcbiAgICAgICAgICByZXR1cm4gISFub2Rlc1tpXTtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4gIC8vIGNsb3Nlc3QgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0ID0gRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0IHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBlbCA9IHRoaXM7XG4gICAgICAgICAgd2hpbGUgKGVsLm1hdGNoZXMgJiYgIWVsLm1hdGNoZXMoc2VsZWN0b3IpKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgcmV0dXJuIGVsLm1hdGNoZXMgPyBlbCA6IG51bGw7XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuLyoqXG4gKiAgUHVibGljIG1ldGhvZHNcbiAqL1xuICByZXR1cm4ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgdXBkYXRlOiB1cGRhdGVQTCxcbiAgICBkZXN0cm95OiBkZXN0cm95XG4gIH07XG5cbn0pKCk7XG5cbndpbmRvdy5BUCA9IEF1ZGlvUGxheWVyO1xuXG59KSh3aW5kb3cpO1xuXG4vLyBURVNUOiBpbWFnZSBmb3Igd2ViIG5vdGlmaWNhdGlvbnNcbnZhciBpY29uSW1hZ2UgPSAnaHR0cDovL2Z1bmt5aW1nLmNvbS9pLzIxcFg1LnBuZyc7XG5cbkFQLmluaXQoe1xuICBwbGF5TGlzdDogW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0hpdG1hbicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9IaXRtYW4ubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRHJlYW1lcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EcmVhbWVyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9Sb2NrZXQlMjBQb3dlci5tcDMnfVxuICBdXG59KTtcblxuXG4vLyBURVNUOiB1cGRhdGUgcGxheWxpc3Rcbi8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRTb25ncycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuLy8gICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIEFQLnVwZGF0ZShbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF0pO1xuLy8gfSlcblxuY29uc29sZS5sb2coQVApOyIsIlxuXG5cbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2ljb25cIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmVcIj4nK1xuICAgICAgICAgICAgICAgICc8c3ZnIGZpbGw9XCIjMDAwMDAwXCIgaGVpZ2h0PVwiMjBcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgd2lkdGg9XCIyMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPHBhdGggZD1cIk02IDE5YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY3SDZ2MTJ6TTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINXYyaDE0VjR6XCIvPicrXG4gICAgICAgICAgICAgICAgICAgICc8cGF0aCBkPVwiTTAgMGgyNHYyNEgwelwiIGZpbGw9XCJub25lXCIvPicrXG4gICAgICAgICAgICAgICAgJzwvc3ZnPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2J0bicpO1xuICAgIHBsQnRuICAgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXBsYXlsaXN0Jyk7XG4gICAgY3VyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1jdXJyZW50Jyk7XG4gICAgZHVyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1kdXJhdGlvbicpO1xuICAgIHRyYWNrVGl0bGUgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGl0bGUnKTtcbiAgICBwcm9ncmVzc0JhciAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX2JhcicpO1xuICAgIHByZWxvYWRCYXIgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fcHJlbG9hZCcpO1xuICAgIHZvbHVtZUJhciAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2JhcicpO1xuXG4gICAgcGxheUxpc3QgPSBzZXR0aW5ncy5wbGF5TGlzdDtcblxuICAgIHBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG5cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUsIGZhbHNlKTtcblxuICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGFwQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBwbGF5bGlzdFxuICAgIHJlbmRlclBMKCk7XG4gICAgcGxCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgLy8gQ3JlYXRlIGF1ZGlvIG9iamVjdFxuICAgIGF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgIGF1ZGlvLnByZWxvYWQgPSAnYXV0byc7XG5cbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IGF1ZGlvLnZvbHVtZSAqIDEwMCArICclJztcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIGlmKHNldHRpbmdzLmF1dG9QbGF5KSB7XG4gICAgICBhdWRpby5wbGF5KCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlRG9jdW1lbnRUaXRsZSh0aXRsZSkge1xuICAgIGlmKHNldHRpbmdzLmNoYW5nZURvY1RpdGxlKSB7XG4gICAgICBpZih0aXRsZSkge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jVGl0bGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlVW5sb2FkKGV2dCkge1xuICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gJ011c2ljIHN0aWxsIHBsYXlpbmcnO1xuICAgICAgZXZ0LnJldHVyblZhbHVlID0gbWVzc2FnZTtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVycm9ySGFuZGxlcihldnQpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBtZWRpYUVycm9yID0ge1xuICAgICAgJzEnOiAnTUVESUFfRVJSX0FCT1JURUQnLFxuICAgICAgJzInOiAnTUVESUFfRVJSX05FVFdPUksnLFxuICAgICAgJzMnOiAnTUVESUFfRVJSX0RFQ09ERScsXG4gICAgICAnNCc6ICdNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQnXG4gICAgfTtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgcGxMaVtpbmRleF0gJiYgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvdXN0b24gd2UgaGF2ZSBhIHByb2JsZW06ICcgKyBtZWRpYUVycm9yW2V2dC50YXJnZXQuZXJyb3IuY29kZV0pO1xuICB9XG5cbi8qKlxuICogVVBEQVRFIFBMXG4gKi9cbiAgZnVuY3Rpb24gdXBkYXRlUEwoYWRkTGlzdCkge1xuICAgIGlmKCFhcEFjdGl2ZSkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgaXMgbm90IHlldCBpbml0aWFsaXplZCc7XG4gICAgfVxuICAgIGlmKCFBcnJheS5pc0FycmF5KGFkZExpc3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGFkZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNvdW50ID0gcGxheUxpc3QubGVuZ3RoO1xuICAgIHZhciBodG1sICA9IFtdO1xuICAgIHBsYXlMaXN0LnB1c2guYXBwbHkocGxheUxpc3QsIGFkZExpc3QpO1xuICAgIGFkZExpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBodG1sLnB1c2goXG4gICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGNvdW50KyspLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICAvLyBJZiBleGlzdCBlbXB0eSBtZXNzYWdlXG4gICAgaWYocGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5yZW1vdmVDaGlsZCggcGwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykgKTtcbiAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgfVxuICAgIC8vIEFkZCBzb25nIGludG8gcGxheWxpc3RcbiAgICBwbFVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlRW5kJywgaHRtbC5qb2luKCcnKSk7XG4gICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG4gIH1cblxuLyoqXG4gKiAgUGxheUxpc3QgbWV0aG9kc1xuICovXG4gICAgZnVuY3Rpb24gcmVuZGVyUEwoKSB7XG4gICAgICB2YXIgaHRtbCA9IFtdO1xuXG4gICAgICBwbGF5TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGkpIHtcbiAgICAgICAgaHRtbC5wdXNoKFxuICAgICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGkpLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIHBsID0gY3JlYXRlKCdkaXYnLCB7XG4gICAgICAgICdjbGFzc05hbWUnOiAncGwtY29udGFpbmVyJyxcbiAgICAgICAgJ2lkJzogJ3BsJyxcbiAgICAgICAgJ2lubmVySFRNTCc6ICc8dWwgY2xhc3M9XCJwbC11bFwiPicgKyAoIWlzRW1wdHlMaXN0KCkgPyBodG1sLmpvaW4oJycpIDogJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPicpICsgJzwvdWw+J1xuICAgICAgfSk7XG5cbiAgICAgIHBsYXllci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwbCwgcGxheWVyLm5leHRTaWJsaW5nKTtcblxuICAgICAgcGxVbCA9IHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC11bCcpO1xuICAgICAgcGxMaSA9IHBsVWwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgcGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RIYW5kbGVyKGV2dCkge1xuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmKGV2dC50YXJnZXQubWF0Y2hlcygnLnBsLWxpc3RfX3RpdGxlJykpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXJzZUludChldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0JykuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcbiAgICAgICAgaWYoaW5kZXggIT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBpbmRleCA9IGN1cnJlbnQ7XG4gICAgICAgICAgcGxheShjdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBwbGF5VG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmKCEhZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdF9fcmVtb3ZlJykpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbCA9IGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKTtcbiAgICAgICAgICAgIHZhciBpc0RlbCA9IHBhcnNlSW50KHBhcmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG5cbiAgICAgICAgICAgIHBsYXlMaXN0LnNwbGljZShpc0RlbCwgMSk7XG4gICAgICAgICAgICBwYXJlbnRFbC5jbG9zZXN0KCcucGwtdWwnKS5yZW1vdmVDaGlsZChwYXJlbnRFbCk7XG5cbiAgICAgICAgICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocGxMaSwgZnVuY3Rpb24oZWwsIGkpIHtcbiAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJywgaSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHBsYXkoaW5kZXgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJBbGwoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGlzRGVsID4gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSAxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICAgICAgICAgICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGlzRGVsIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbEFjdGl2ZSgpIHtcbiAgICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50ID0gaW5kZXg7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwbExpLmxlbmd0aDsgbGVuID4gaTsgaSsrKSB7XG4gICAgICAgIHBsTGlbaV0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgfVxuICAgICAgcGxMaVtjdXJyZW50XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgfVxuXG5cbi8qKlxuICogUGxheWVyIG1ldGhvZHNcbiAqL1xuICBmdW5jdGlvbiBwbGF5KGN1cnJlbnRJbmRleCkge1xuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGNsZWFyQWxsKCk7XG4gICAgfVxuXG4gICAgaW5kZXggPSAoY3VycmVudEluZGV4ICsgcGxheUxpc3QubGVuZ3RoKSAlIHBsYXlMaXN0Lmxlbmd0aDtcblxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgLy8gQ2hhbmdlIGRvY3VtZW50IHRpdGxlXG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgLy8gQXVkaW8gcGxheVxuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIC8vIFNob3cgbm90aWZpY2F0aW9uXG4gICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICBib2R5OiAnTm93IHBsYXlpbmcnLFxuICAgICAgdGFnOiAnbXVzaWMtcGxheWVyJ1xuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIHBsYXkgYnV0dG9uXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG5cbiAgICAvLyBTZXQgYWN0aXZlIHNvbmcgcGxheWxpc3RcbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldigpIHtcbiAgICBwbGF5KGluZGV4IC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBwbGF5TGlzdC5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckFsbCgpIHtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGF1ZGlvLnNyYyA9ICcnO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gJ3F1ZXVlIGlzIGVtcHR5JztcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIGlmKCFwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLmlubmVySFRNTCA9ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nO1xuICAgIH1cbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5VG9nZ2xlKCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgIGlmKGF1ZGlvLmN1cnJlbnRUaW1lID09PSAwKSB7XG4gICAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB9XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZvbHVtZVRvZ2dsZSgpIHtcbiAgICBpZihhdWRpby5tdXRlZCkge1xuICAgICAgaWYocGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCkgPT09IDApIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHNldHRpbmdzLnZvbHVtZSAqIDEwMCArICclJztcbiAgICAgICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2b2x1bWVMZW5ndGg7XG4gICAgICB9XG4gICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGVhdFRvZ2dsZSgpIHtcbiAgICBpZihyZXBlYXRCdG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmVwZWF0aW5nID0gZmFsc2U7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVwZWF0aW5nID0gdHJ1ZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbFRvZ2dsZSgpIHtcbiAgICBwbEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgICBwbC5jbGFzc0xpc3QudG9nZ2xlKCdoLXNob3cnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVVcGRhdGUoKSB7XG4gICAgaWYoYXVkaW8ucmVhZHlTdGF0ZSA9PT0gMCB8fCBzZWVraW5nKSByZXR1cm47XG5cbiAgICB2YXIgYmFybGVuZ3RoID0gTWF0aC5yb3VuZChhdWRpby5jdXJyZW50VGltZSAqICgxMDAgLyBhdWRpby5kdXJhdGlvbikpO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gYmFybGVuZ3RoICsgJyUnO1xuXG4gICAgdmFyXG4gICAgY3VyTWlucyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLyA2MCksXG4gICAgY3VyU2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLSBjdXJNaW5zICogNjApLFxuICAgIG1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC8gNjApLFxuICAgIHNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC0gbWlucyAqIDYwKTtcbiAgICAoY3VyU2VjcyA8IDEwKSAmJiAoY3VyU2VjcyA9ICcwJyArIGN1clNlY3MpO1xuICAgIChzZWNzIDwgMTApICYmIChzZWNzID0gJzAnICsgc2Vjcyk7XG5cbiAgICBjdXJUaW1lLmlubmVySFRNTCA9IGN1ck1pbnMgKyAnOicgKyBjdXJTZWNzO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gbWlucyArICc6JyArIHNlY3M7XG5cbiAgICBpZihzZXR0aW5ncy5idWZmZXJlZCkge1xuICAgICAgdmFyIGJ1ZmZlcmVkID0gYXVkaW8uYnVmZmVyZWQ7XG4gICAgICBpZihidWZmZXJlZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IE1hdGgucm91bmQoMTAwICogYnVmZmVyZWQuZW5kKDApIC8gYXVkaW8uZHVyYXRpb24pO1xuICAgICAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gbG9hZGVkICsgJyUnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUT0RPIHNodWZmbGVcbiAgICovXG4gIGZ1bmN0aW9uIHNodWZmbGUoKSB7XG4gICAgaWYoc2h1ZmZsZSkge1xuICAgICAgaW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBwbGF5TGlzdC5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRvRW5kKCkge1xuICAgIGlmKGluZGV4ID09PSBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICBpZighcmVwZWF0aW5nKSB7XG4gICAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICAgIHBsQWN0aXZlKCk7XG4gICAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGxheSgwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwbGF5KGluZGV4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbW92ZUJhcihldnQsIGVsLCBkaXIpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgaWYoZGlyID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCggKChldnQuY2xpZW50WCAtIGVsLm9mZnNldCgpLmxlZnQpICsgd2luZG93LnBhZ2VYT2Zmc2V0KSAgKiAxMDAgLyBlbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoKTtcbiAgICAgIGVsLnN0eWxlLndpZHRoID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYoZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgICAgdmFsdWUgPSBwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKTtcbiAgICAgICAgdmFyIGRlbHRhID0gZXZ0LmRlbHRhWSB8fCBldnQuZGV0YWlsIHx8IC1ldnQud2hlZWxEZWx0YTtcbiAgICAgICAgdmFsdWUgPSAoZGVsdGEgPiAwKSA/IHZhbHVlIC0gMTAgOiB2YWx1ZSArIDEwO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAoZWwub2Zmc2V0KCkudG9wICsgZWwub2Zmc2V0SGVpZ2h0KSAtIHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKChvZmZzZXQgLSBldnQuY2xpZW50WSkpO1xuICAgICAgfVxuICAgICAgaWYodmFsdWUgPiAxMDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDEwMDtcbiAgICAgIGlmKHZhbHVlIDwgMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMDtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyQmFyKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nID0gdHJ1ZTtcbiAgICAhcmlnaHRDbGljayAmJiBwcm9ncmVzc0Jhci5jbGFzc0xpc3QuYWRkKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICBzZWVrKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyVm9sKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gdHJ1ZTtcbiAgICBzZXRWb2x1bWUoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWsoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICB3aW5kb3cudmFsdWUgPSBtb3ZlQmFyKGV2dCwgcHJvZ3Jlc3NCYXIsICdob3Jpem9udGFsJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2Vla2luZ0ZhbHNlKCkge1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgYXVkaW8uY3VycmVudFRpbWUgPSBhdWRpby5kdXJhdGlvbiAqICh3aW5kb3cudmFsdWUgLyAxMDApO1xuICAgICAgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LnJlbW92ZSgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgfVxuICAgIHNlZWtpbmcgPSBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRWb2x1bWUoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG4gICAgaWYoc2Vla2luZ1ZvbCAmJiByaWdodENsaWNrID09PSBmYWxzZSB8fCBldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgdmFyIHZhbHVlID0gbW92ZUJhcihldnQsIHZvbHVtZUJhci5wYXJlbnROb2RlLCAndmVydGljYWwnKSAvIDEwMDtcbiAgICAgIGlmKHZhbHVlIDw9IDApIHtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gMDtcbiAgICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYoYXVkaW8ubXV0ZWQpIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KHRpdGxlLCBhdHRyKSB7XG4gICAgaWYoIXNldHRpbmdzLm5vdGlmaWNhdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZih3aW5kb3cuTm90aWZpY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXR0ci50YWcgPSAnQVAgbXVzaWMgcGxheWVyJztcbiAgICB3aW5kb3cuTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKGZ1bmN0aW9uKGFjY2Vzcykge1xuICAgICAgaWYoYWNjZXNzID09PSAnZ3JhbnRlZCcpIHtcbiAgICAgICAgdmFyIG5vdGljZSA9IG5ldyBOb3RpZmljYXRpb24odGl0bGUuc3Vic3RyKDAsIDExMCksIGF0dHIpO1xuICAgICAgICBzZXRUaW1lb3V0KG5vdGljZS5jbG9zZS5iaW5kKG5vdGljZSksIDUwMDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbi8qIERlc3Ryb3kgbWV0aG9kLiBDbGVhciBBbGwgKi9cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBpZighYXBBY3RpdmUpIHJldHVybjtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHBsYXlCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG4gICAgcGxCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHByZXZCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICAvLyBQbGF5bGlzdFxuICAgIHBsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICBwbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsKTtcblxuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXBBY3RpdmUgPSBmYWxzZTtcbiAgICBpbmRleCA9IDA7XG5cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICBwbEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG5cbiAgICAvLyBSZW1vdmUgcGxheWVyIGZyb20gdGhlIERPTSBpZiBuZWNlc3NhcnlcbiAgICAvLyBwbGF5ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbGF5ZXIpO1xuICB9XG5cblxuLyoqXG4gKiAgSGVscGVyc1xuICovXG4gIGZ1bmN0aW9uIHdoZWVsKCkge1xuICAgIHZhciB3aGVlbDtcbiAgICBpZiAoJ29ud2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICd3aGVlbCc7XG4gICAgfSBlbHNlIGlmICgnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnbW91c2V3aGVlbCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZWVsID0gJ01vek1vdXNlUGl4ZWxTY3JvbGwnO1xuICAgIH1cbiAgICByZXR1cm4gd2hlZWw7XG4gIH1cblxuICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICBmb3IodmFyIG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgaWYoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlKGVsLCBhdHRyKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsKTtcbiAgICBpZihhdHRyKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZihlbGVtZW50W25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBlbGVtZW50W25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIEVsZW1lbnQucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgc2Nyb2xsTGVmdCA9IHdpbmRvdy5wYWdlWE9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCxcbiAgICBzY3JvbGxUb3AgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcblxuICAgIHJldHVybiB7XG4gICAgICB0b3A6IGVsLnRvcCArIHNjcm9sbFRvcCxcbiAgICAgIGxlZnQ6IGVsLmxlZnQgKyBzY3JvbGxMZWZ0XG4gICAgfTtcbiAgfTtcblxuICBFbGVtZW50LnByb3RvdHlwZS5jc3MgPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgaWYodHlwZW9mIGF0dHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLCAnJylbYXR0cl07XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIGF0dHIgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IodmFyIG5hbWUgaW4gYXR0cikge1xuICAgICAgICBpZih0aGlzLnN0eWxlW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLnN0eWxlW25hbWVdID0gYXR0cltuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBtYXRjaGVzIHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyA9IEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlcyB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSAobm9kZS5wYXJlbnROb2RlIHx8IG5vZGUuZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKG5vZGVzWysraV0gJiYgbm9kZXNbaV0gIT0gbm9kZSk7XG4gICAgICAgICAgcmV0dXJuICEhbm9kZXNbaV07XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAvLyBjbG9zZXN0IHBvbHlmaWxsXG4gIHdpbmRvdy5FbGVtZW50ICYmIGZ1bmN0aW9uKEVsZW1lbnRQcm90b3R5cGUpIHtcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCA9IEVsZW1lbnRQcm90b3R5cGUuY2xvc2VzdCB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgZWwgPSB0aGlzO1xuICAgICAgICAgIHdoaWxlIChlbC5tYXRjaGVzICYmICFlbC5tYXRjaGVzKHNlbGVjdG9yKSkgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHJldHVybiBlbC5tYXRjaGVzID8gZWwgOiBudWxsO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbi8qKlxuICogIFB1YmxpYyBtZXRob2RzXG4gKi9cbiAgcmV0dXJuIHtcbiAgICBpbml0OiBpbml0LFxuICAgIHVwZGF0ZTogdXBkYXRlUEwsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG59KSgpO1xuXG53aW5kb3cuQVAgPSBBdWRpb1BsYXllcjtcblxufSkod2luZG93KTtcblxuLy8gVEVTVDogaW1hZ2UgZm9yIHdlYiBub3RpZmljYXRpb25zXG52YXIgaWNvbkltYWdlID0gJ2h0dHA6Ly9mdW5reWltZy5jb20vaS8yMXBYNS5wbmcnO1xuXG5BUC5pbml0KHtcbiAgcGxheUxpc3Q6IFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdIaXRtYW4nLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvSGl0bWFuLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0RyZWFtZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRHJlYW1lci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXVxufSk7XG5cbi8vIFRFU1Q6IHVwZGF0ZSBwbGF5bGlzdFxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZFNvbmdzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgQVAudXBkYXRlKFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXSk7XG59KVxuXG5cbmNvbnNvbGUubG9nKEFQLnBsYXlMaXN0KTsiLCJmdW5jdGlvbiBmbkdldExpc3Qoc0dldFRva2VuKSB7XG4gICAgdmFyICRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKCRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLrrZDsnoTrp4hcIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJChcIiNnZXRfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIjbmF2X3ZpZXdcIikuZW1wdHkoKTtcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlXCIgK1xuICAgICAgICBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCRnZXR2YWwpICsgXCIma2V5PUFJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZ1wiO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGpkYXRhKTtcblxuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zbmlwcGV0LmNoYW5uZWxJZCk7XG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhIGhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIitqZGF0YS5wcmV2UGFnZVRva2VuK1wiXFxcIik7Jz487J207KCE7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGEgaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiK2pkYXRhLm5leHRQYWdlVG9rZW4rXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59IiwiLy8vaWZyYW1lIHBsYXllclxuXG52YXIgZmlyc3RJRFxuICAgIC8vIDIuIFRoaXMgY29kZSBsb2FkcyB0aGUgSUZyYW1lIFBsYXllciBBUEkgY29kZSBhc3luY2hyb25vdXNseS5cbnZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbi8vIGNvbnNvbGUubG9nKGpkYXRhKTtcbnRhZy5zcmMgPSBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIjtcbnZhciBmaXJzdFNjcmlwdFRhZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbmZpcnN0U2NyaXB0VGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRhZywgZmlyc3RTY3JpcHRUYWcpO1xuXG4vLyAzLiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgYW4gPGlmcmFtZT4gKGFuZCBZb3VUdWJlIHBsYXllcilcbi8vICAgIGFmdGVyIHRoZSBBUEkgY29kZSBkb3dubG9hZHMuXG52YXIgcGxheWVyO1xuXG5mdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcbiAgICBwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCdwbGF5ZXInLCB7XG4gICAgICAgIGhlaWdodDogJzM2MCcsXG4gICAgICAgIHdpZHRoOiAnNjQwJyxcbiAgICAgICAgdmlkZW9JZDogJzhBMnRfdEFqTXo4JyxcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAnb25SZWFkeSc6IG9uUGxheWVyUmVhZHksXG4gICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IG9uUGxheWVyU3RhdGVDaGFuZ2VcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vLyA0LiBUaGUgQVBJIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHdoZW4gdGhlIHZpZGVvIHBsYXllciBpcyByZWFkeS5cbmZ1bmN0aW9uIG9uUGxheWVyUmVhZHkoZXZlbnQpIHtcbiAgICBldmVudC50YXJnZXQucGxheVZpZGVvKCk7XG59XG5cbi8vIDUuIFRoZSBBUEkgY2FsbHMgdGhpcyBmdW5jdGlvbiB3aGVuIHRoZSBwbGF5ZXIncyBzdGF0ZSBjaGFuZ2VzLlxuLy8gICAgVGhlIGZ1bmN0aW9uIGluZGljYXRlcyB0aGF0IHdoZW4gcGxheWluZyBhIHZpZGVvIChzdGF0ZT0xKSxcbi8vICAgIHRoZSBwbGF5ZXIgc2hvdWxkIHBsYXkgZm9yIHNpeCBzZWNvbmRzIGFuZCB0aGVuIHN0b3AuXG52YXIgZG9uZSA9IGZhbHNlO1xuXG5mdW5jdGlvbiBvblBsYXllclN0YXRlQ2hhbmdlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyAmJiAhZG9uZSkge1xuICAgICAgICBzZXRUaW1lb3V0KHN0b3BWaWRlbywgNjAwMDApO1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0b3BWaWRlbygpIHtcbiAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG59IiwiLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIG5hbWVTcGFjZSA9IHt9O1xubmFtZVNwYWNlLiRnZXR2YWwgPSAnJztcbm5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107XG5uYW1lU3BhY2UucGxheUxpc3QgPSBbXTtcbm5hbWVTcGFjZS5qZGF0YSA9IFtdO1xuLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgU1RBUlQgLy8vLy8vLy8vLy8vXG4vL2Z1bmN0aW9uYWxpdHkxIDogbmF2aWdhdGlvbiBjb250cm9sXG52YXIgbmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9nZXQgZWFjaCBidG4gaW4gbmF2IHdpdGggZG9tIGRlbGVnYXRpb24gd2l0aCBqcXVlcnkgYW5kIGV2ZW50IHByb3BhZ2F0aW9uXG4gICAgJChcIi5uYXZfcGFyZW50XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvL2J1YmJsaW5nIHByZXZlbnRcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XG4gICAgICAgIC8vIHRhcmdldCA9XG4gICAgICAgIC8vIGlmIChldmVudC5jdXJyZW50VGFyZ2V0ID09IFwibGkuXCIpXG4gICAgICAgIGNvbnNvbGUubG9nKHRhcmdldCk7XG4gICAgfSk7XG59O1xuXG5cbi8qPHVsIGlkPVwibmF2X3BhcmVudFwiPlxuICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9XCJzZWFyY2hfYnRuXCI+PGkgY2xhc3M9XCJsYSBsYS1zZWFyY2hcIj48L2k+PHNwYW4+U2VhcmNoPC9zcGFuPjwvbGk+XG4gICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cImFsYnVtX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtbXVzaWNcIj48L2k+PHNwYW4+TXkgQWxidW08L3NwYW4+PC9saT5cbiAgICAgICAgICAgICAgICAgPGxpIGNsYXNzPVwicG9wdWxhcl9idG5cIj48aSBjbGFzcz1cImxhIGxhLWhlYXJ0LW9cIj48L2k+PHNwYW4+cG9wdWxhcjwvc3Bhbj48L2xpPlxuICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9XCJhYm91dF9idG5cIj48aSBjbGFzcz1cImxhIGxhLWluZm8tY2lyY2xlXCI+PC9pPjxzcGFuPkFib3V0PHNwYW4+PC9saT5cbiAgICAgICAgICAgICA8L3VsPiovXG5cbm5hdigpO1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgRU5EIC8vLy8vLy8vLy8vL1xuXG5cblxuXG5cbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGZuR2V0TGlzdCA9IGZ1bmN0aW9uKHNHZXRUb2tlbikge1xuICAgIG5hbWVTcGFjZS4kZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmIChuYW1lU3BhY2UuJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuqygOyDieyWtOyeheugpeuwlOuejeuLiOuLpC5cIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vQ2xlYW5zaW5nIERvbSwgVmlkZW9JZFxuICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107IC8vZ2V0dmlkZW9JZCBhcnJheey0iOq4sO2ZlFxuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5lbXB0eSgpOyAvL+qygOyDiSDqsrDqs7wgVmlld+y0iOq4sO2ZlFxuICAgIC8vICQoXCIubmF2X3ZpZXdcIikuZW1wdHkoKTtcbiAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuXG4gICAgLy9xdWVyeXNlY3Rpb24vL1xuICAgIC8vMTXqsJzslKlcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlJm1heFJlc3VsdHM9MTUmdHlwZT12aWRlb1wiICsgXCImcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChuYW1lU3BhY2UuJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG5cbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cblxuICAgICQuYWpheCh7XG4gICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICB1cmw6IHNUYXJnZXRVcmwsXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpkYXRhKSB7XG4gICAgICAgICAgICBuYW1lU3BhY2UuamRhdGEgPSBqZGF0YTsgLy9qZGF0YS5cbiAgICAgICAgICAgIHNlYXJjaFJlc3VsdFZpZXcoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkLnB1c2goamRhdGEuaXRlbXNbaV0uaWQudmlkZW9JZCk7IC8vbmFtZVNwYWNlLmdldHZpZGVvSWTsl5Ag6rKA7IOJ65CcIHZpZGVvSUQg67Cw7Je066GcIOy2lOqwgFxuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbMF0pO1xuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICAgICAgICAgICAgICBwbGF5VmlkZW9TZWxlY3QoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIGFsZXJ0KFwiZXJyb3JcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vIFNFQVJDSCBBUEkgRU5EIC8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBzZWFyY2hSZXN1bHRWaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlYXJjaFJlc3VsdExpc3QgPSAnJztcbiAgICB2YXIgZ2V0U2VhcmNoTGlzdERPTSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWFyY2hMaXN0Jyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lU3BhY2UuamRhdGEuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdldFRlbXBsYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlYXJjaFZpZGVvJyk7IC8vdGVtcGxhdGUgcXVlcnlzZWxlY3RcbiAgICAgICAgdmFyIGdldEh0bWxUZW1wbGF0ZSA9IGdldFRlbXBsYXRlLmlubmVySFRNTDsgLy9nZXQgaHRtbCBpbiB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRhcHRUZW1wbGF0ZSA9IGdldEh0bWxUZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmwpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1RpdGxlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aXRsZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAucmVwbGFjZShcIntpZH1cIiwgaSk7XG5cbiAgICAgICAgc2VhcmNoUmVzdWx0TGlzdCA9IHNlYXJjaFJlc3VsdExpc3QgKyBhZGFwdFRlbXBsYXRlO1xuICAgICAgICBjb25zb2xlLmxvZygpO1xuICAgIH1cbiAgICBnZXRTZWFyY2hMaXN0RE9NLmlubmVySFRNTCA9IHNlYXJjaFJlc3VsdExpc3Q7XG59O1xuLy8gJChcIi5zZWFyY2hMaXN0XCIpLmFwcGVuZChcIjxsaSBjbGFzcz0nYm94JyBpZD0nXCIgKyBpICsgXCInPjxpbWcgc3JjPSdcIiArIGpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5oaWdoLnVybCArIFwiJyB3aWR0aCA9IDIwcHg+XCIgKyB0aGlzLnNuaXBwZXQudGl0bGUgKyBcIjxidXR0b24gaWQ9J1wiICsgaSArIFwiJ3R5cGU9J2J1dHRvbicgb25jbGljaz0nYWRkUGxheUxpc3QoKSc+YWRkPC9idXR0b24+PC9saT5cIik7IC8vbGlzdOuztOyXrOyjvOq4sFxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gU1RBUlQgLy8vLy8vLy8vLy8vLy8vL1xudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhZ0lkKTtcbiAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdKTtcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICB9KTtcbn07XG4vLy8vLy8vLyBQTEFZIFNFTEVDVCBWSURFTyBFTkQgLy8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy8vXG52YXIgYWRkUGxheUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICAkKFwiLnNlYXJjaExpc3QgbGlcIikub24oXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgbmFtZVNwYWNlLnBsYXlMaXN0LnB1c2gobmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdKTtcbiAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLnBsYXlMaXN0KTtcbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIEVORCAvLy8vLy8vLy8vLy8vLy8vLyJdfQ==
;