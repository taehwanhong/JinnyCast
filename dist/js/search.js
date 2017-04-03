;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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
                ' <button class="icon_btn"><i class="la la-headphones"></i></button>'+
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
    {'icon': iconImage, 'title': 'Hitman', 'file': 'https://www.youtube.com/watch?v=ApbZfl7hIcg'},
    {'icon': iconImage, 'title': 'Dreamer', 'file': 'http://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreamer.mp3'},
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

AP.update([])

},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{}]},{},[1,2,3,4,5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvWW91dHViZXNlYXJjaC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL2F1dGguanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL3BsYXllci5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvc2VhcmNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBdWRpb1BsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAvLyBQbGF5ZXIgdmFycyFcbiAgdmFyXG4gIGRvY1RpdGxlID0gZG9jdW1lbnQudGl0bGUsXG4gIHBsYXllciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwJyksXG4gIHBsYXllckNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51c2VyUGxheWxpc3QnKSxcbiAgcGxheUJ0bixcbiAgcGxheVN2ZyxcbiAgcGxheVN2Z1BhdGgsXG4gIHByZXZCdG4sXG4gIG5leHRCdG4sXG4gIHBsQnRuLFxuICByZXBlYXRCdG4sXG4gIHZvbHVtZUJ0bixcbiAgcHJvZ3Jlc3NCYXIsXG4gIHByZWxvYWRCYXIsXG4gIGN1clRpbWUsXG4gIGR1clRpbWUsXG4gIHRyYWNrVGl0bGUsXG4gIGF1ZGlvLFxuICBpbmRleCA9IDAsXG4gIHBsYXlMaXN0LFxuICB2b2x1bWVCYXIsXG4gIHdoZWVsVm9sdW1lVmFsdWUgPSAwLFxuICB2b2x1bWVMZW5ndGgsXG4gIHJlcGVhdGluZyA9IGZhbHNlLFxuICBzZWVraW5nID0gZmFsc2UsXG4gIHNlZWtpbmdWb2wgPSBmYWxzZSxcbiAgcmlnaHRDbGljayA9IGZhbHNlLFxuICBhcEFjdGl2ZSA9IGZhbHNlLFxuICAvLyBwbGF5bGlzdCB2YXJzXG4gIHBsLFxuICBwbFVsLFxuICBwbExpLFxuICB0cGxMaXN0ID1cbiAgICAgICAgICAgICc8bGkgY2xhc3M9XCJwbC1saXN0XCIgZGF0YS10cmFjaz1cIntjb3VudH1cIj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RyYWNrXCI+JytcbiAgICAgICAgICAgICAgICAnIDxidXR0b24gY2xhc3M9XCJpY29uX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtaGVhZHBob25lc1wiPjwvaT48L2J1dHRvbj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmVcIj4nK1xuICAgICAgICAgICAgICAgICc8c3ZnIGZpbGw9XCIjMDAwMDAwXCIgaGVpZ2h0PVwiMjBcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgd2lkdGg9XCIyMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPHBhdGggZD1cIk02IDE5YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY3SDZ2MTJ6TTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINXYyaDE0VjR6XCIvPicrXG4gICAgICAgICAgICAgICAgICAgICc8cGF0aCBkPVwiTTAgMGgyNHYyNEgwelwiIGZpbGw9XCJub25lXCIvPicrXG4gICAgICAgICAgICAgICAgJzwvc3ZnPicrXG4gICAgICAgICAgICAgICc8L2J1dHRvbj4nK1xuICAgICAgICAgICAgJzwvbGk+JyxcbiAgLy8gc2V0dGluZ3NcbiAgc2V0dGluZ3MgPSB7XG4gICAgdm9sdW1lICAgICAgICA6IDAuMSxcbiAgICBjaGFuZ2VEb2NUaXRsZTogdHJ1ZSxcbiAgICBjb25maXJtQ2xvc2UgIDogdHJ1ZSxcbiAgICBhdXRvUGxheSAgICAgIDogZmFsc2UsXG4gICAgYnVmZmVyZWQgICAgICA6IHRydWUsXG4gICAgbm90aWZpY2F0aW9uICA6IHRydWUsXG4gICAgcGxheUxpc3QgICAgICA6IFtdXG4gIH07XG5cbiAgZnVuY3Rpb24gaW5pdChvcHRpb25zKSB7XG5cbiAgICBpZighKCdjbGFzc0xpc3QnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZihhcEFjdGl2ZSB8fCBwbGF5ZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGFscmVhZHkgaW5pdCc7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MgPSBleHRlbmQoc2V0dGluZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gZ2V0IHBsYXllciBlbGVtZW50c1xuICAgIHBsYXlCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXRvZ2dsZScpO1xuICAgIHBsYXlTdmcgICAgICAgID0gcGxheUJ0bi5xdWVyeVNlbGVjdG9yKCcuaWNvbi1wbGF5Jyk7XG4gICAgcGxheVN2Z1BhdGggICAgPSBwbGF5U3ZnLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKTtcbiAgICBwcmV2QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wcmV2Jyk7XG4gICAgbmV4dEJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tbmV4dCcpO1xuICAgIHJlcGVhdEJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXJlcGVhdCcpO1xuICAgIHZvbHVtZUJ0biAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWUtYnRuJyk7XG4gICAgcGxCdG4gICAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcGxheWxpc3QnKTtcbiAgICBjdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWN1cnJlbnQnKTtcbiAgICBkdXJUaW1lICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpbWUtLWR1cmF0aW9uJyk7XG4gICAgdHJhY2tUaXRsZSAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aXRsZScpO1xuICAgIHByb2dyZXNzQmFyICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fYmFyJyk7XG4gICAgcHJlbG9hZEJhciAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19wcmVsb2FkJyk7XG4gICAgdm9sdW1lQmFyICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZV9fYmFyJyk7XG5cbiAgICBwbGF5TGlzdCA9IHNldHRpbmdzLnBsYXlMaXN0O1xuXG4gICAgcGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcblxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXBBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIHBsYXlsaXN0XG4gICAgcmVuZGVyUEwoKTtcbiAgICBwbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaW8gb2JqZWN0XG4gICAgYXVkaW8gPSBuZXcgQXVkaW8oKTtcbiAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgYXVkaW8ucHJlbG9hZCA9ICdhdXRvJztcblxuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gYXVkaW8udm9sdW1lICogMTAwICsgJyUnO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgaWYoc2V0dGluZ3MuYXV0b1BsYXkpIHtcbiAgICAgIGF1ZGlvLnBsYXkoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VEb2N1bWVudFRpdGxlKHRpdGxlKSB7XG4gICAgaWYoc2V0dGluZ3MuY2hhbmdlRG9jVGl0bGUpIHtcbiAgICAgIGlmKHRpdGxlKSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2NUaXRsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVVbmxvYWQoZXZ0KSB7XG4gICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnTXVzaWMgc3RpbGwgcGxheWluZyc7XG4gICAgICBldnQucmV0dXJuVmFsdWUgPSBtZXNzYWdlO1xuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKGV2dCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG1lZGlhRXJyb3IgPSB7XG4gICAgICAnMSc6ICdNRURJQV9FUlJfQUJPUlRFRCcsXG4gICAgICAnMic6ICdNRURJQV9FUlJfTkVUV09SSycsXG4gICAgICAnMyc6ICdNRURJQV9FUlJfREVDT0RFJyxcbiAgICAgICc0JzogJ01FRElBX0VSUl9TUkNfTk9UX1NVUFBPUlRFRCdcbiAgICB9O1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBwbExpW2luZGV4XSAmJiBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgIHRocm93IG5ldyBFcnJvcignSG91c3RvbiB3ZSBoYXZlIGEgcHJvYmxlbTogJyArIG1lZGlhRXJyb3JbZXZ0LnRhcmdldC5lcnJvci5jb2RlXSk7XG4gIH1cblxuLyoqXG4gKiBVUERBVEUgUExcbiAqL1xuICBmdW5jdGlvbiB1cGRhdGVQTChhZGRMaXN0KSB7XG4gICAgaWYoIWFwQWN0aXZlKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBpcyBub3QgeWV0IGluaXRpYWxpemVkJztcbiAgICB9XG4gICAgaWYoIUFycmF5LmlzQXJyYXkoYWRkTGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYWRkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY291bnQgPSBwbGF5TGlzdC5sZW5ndGg7XG4gICAgdmFyIGh0bWwgID0gW107XG4gICAgcGxheUxpc3QucHVzaC5hcHBseShwbGF5TGlzdCwgYWRkTGlzdCk7XG4gICAgYWRkTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGh0bWwucHVzaChcbiAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgY291bnQrKykucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICApO1xuICAgIH0pO1xuICAgIC8vIElmIGV4aXN0IGVtcHR5IG1lc3NhZ2VcbiAgICBpZihwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLnJlbW92ZUNoaWxkKCBwbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSApO1xuICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICB9XG4gICAgLy8gQWRkIHNvbmcgaW50byBwbGF5bGlzdFxuICAgIHBsVWwuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVFbmQnLCBodG1sLmpvaW4oJycpKTtcbiAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcbiAgfVxuXG4vKipcbiAqICBQbGF5TGlzdCBtZXRob2RzXG4gKi9cbiAgICBmdW5jdGlvbiByZW5kZXJQTCgpIHtcbiAgICAgIHZhciBodG1sID0gW107XG5cbiAgICAgIHBsYXlMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaSkge1xuICAgICAgICBodG1sLnB1c2goXG4gICAgICAgICAgdHBsTGlzdC5yZXBsYWNlKCd7Y291bnR9JywgaSkucmVwbGFjZSgne3RpdGxlfScsIGl0ZW0udGl0bGUpXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgcGwgPSBjcmVhdGUoJ2RpdicsIHtcbiAgICAgICAgJ2NsYXNzTmFtZSc6ICdwbC1jb250YWluZXInLFxuICAgICAgICAnaWQnOiAncGwnLFxuICAgICAgICAnaW5uZXJIVE1MJzogJzx1bCBjbGFzcz1cInBsLXVsXCI+JyArICghaXNFbXB0eUxpc3QoKSA/IGh0bWwuam9pbignJykgOiAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JykgKyAnPC91bD4nXG4gICAgICB9KTtcblxuICAgICAgcGxheWVyQ29udGFpbmVyLmluc2VydEJlZm9yZShwbCwgcGxheWVyQ29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgcGxVbCA9IHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC11bCcpO1xuICAgICAgcGxMaSA9IHBsVWwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgcGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RIYW5kbGVyKGV2dCkge1xuICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGlmKGV2dC50YXJnZXQubWF0Y2hlcygnLnBsLWxpc3RfX3RpdGxlJykpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBwYXJzZUludChldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0JykuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcbiAgICAgICAgaWYoaW5kZXggIT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBpbmRleCA9IGN1cnJlbnQ7XG4gICAgICAgICAgcGxheShjdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBwbGF5VG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmKCEhZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdF9fcmVtb3ZlJykpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnRFbCA9IGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKTtcbiAgICAgICAgICAgIHZhciBpc0RlbCA9IHBhcnNlSW50KHBhcmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG5cbiAgICAgICAgICAgIHBsYXlMaXN0LnNwbGljZShpc0RlbCwgMSk7XG4gICAgICAgICAgICBwYXJlbnRFbC5jbG9zZXN0KCcucGwtdWwnKS5yZW1vdmVDaGlsZChwYXJlbnRFbCk7XG5cbiAgICAgICAgICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwocGxMaSwgZnVuY3Rpb24oZWwsIGkpIHtcbiAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJywgaSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgIHBsYXkoaW5kZXgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJBbGwoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGlzRGVsID4gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCAtPSAxO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgICAgICAgICAgICAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcbiAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGlzRGVsIDwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbEFjdGl2ZSgpIHtcbiAgICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICBwbExpW2luZGV4XS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50ID0gaW5kZXg7XG4gICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwbExpLmxlbmd0aDsgbGVuID4gaTsgaSsrKSB7XG4gICAgICAgIHBsTGlbaV0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgfVxuICAgICAgcGxMaVtjdXJyZW50XS5jbGFzc0xpc3QuYWRkKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgfVxuXG5cbi8qKlxuICogUGxheWVyIG1ldGhvZHNcbiAqL1xuICBmdW5jdGlvbiBwbGF5KGN1cnJlbnRJbmRleCkge1xuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGNsZWFyQWxsKCk7XG4gICAgfVxuXG4gICAgaW5kZXggPSAoY3VycmVudEluZGV4ICsgcGxheUxpc3QubGVuZ3RoKSAlIHBsYXlMaXN0Lmxlbmd0aDtcblxuICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuXG4gICAgLy8gQ2hhbmdlIGRvY3VtZW50IHRpdGxlXG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgLy8gQXVkaW8gcGxheVxuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIC8vIFNob3cgbm90aWZpY2F0aW9uXG4gICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICBib2R5OiAnTm93IHBsYXlpbmcnLFxuICAgICAgdGFnOiAnbXVzaWMtcGxheWVyJ1xuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIHBsYXkgYnV0dG9uXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG5cbiAgICAvLyBTZXQgYWN0aXZlIHNvbmcgcGxheWxpc3RcbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldigpIHtcbiAgICBwbGF5KGluZGV4IC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBwbGF5TGlzdC5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckFsbCgpIHtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGF1ZGlvLnNyYyA9ICcnO1xuICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gJ3F1ZXVlIGlzIGVtcHR5JztcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIGlmKCFwbFVsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpKSB7XG4gICAgICBwbFVsLmlubmVySFRNTCA9ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nO1xuICAgIH1cbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5VG9nZ2xlKCkge1xuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgIGlmKGF1ZGlvLmN1cnJlbnRUaW1lID09PSAwKSB7XG4gICAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgICBib2R5OiAnTm93IHBsYXlpbmcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZShwbGF5TGlzdFtpbmRleF0udGl0bGUpO1xuXG4gICAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGF1c2UnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB9XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZvbHVtZVRvZ2dsZSgpIHtcbiAgICBpZihhdWRpby5tdXRlZCkge1xuICAgICAgaWYocGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCkgPT09IDApIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHNldHRpbmdzLnZvbHVtZSAqIDEwMCArICclJztcbiAgICAgICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2b2x1bWVMZW5ndGg7XG4gICAgICB9XG4gICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSAwO1xuICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGVhdFRvZ2dsZSgpIHtcbiAgICBpZihyZXBlYXRCdG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmVwZWF0aW5nID0gZmFsc2U7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVwZWF0aW5nID0gdHJ1ZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbFRvZ2dsZSgpIHtcbiAgICBwbEJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgICAvL3BsLmNsYXNzTGlzdC50b2dnbGUoJ2gtc2hvdycpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZVVwZGF0ZSgpIHtcbiAgICBpZihhdWRpby5yZWFkeVN0YXRlID09PSAwIHx8IHNlZWtpbmcpIHJldHVybjtcblxuICAgIHZhciBiYXJsZW5ndGggPSBNYXRoLnJvdW5kKGF1ZGlvLmN1cnJlbnRUaW1lICogKDEwMCAvIGF1ZGlvLmR1cmF0aW9uKSk7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSBiYXJsZW5ndGggKyAnJSc7XG5cbiAgICB2YXJcbiAgICBjdXJNaW5zID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAvIDYwKSxcbiAgICBjdXJTZWNzID0gTWF0aC5mbG9vcihhdWRpby5jdXJyZW50VGltZSAtIGN1ck1pbnMgKiA2MCksXG4gICAgbWlucyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLyA2MCksXG4gICAgc2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uZHVyYXRpb24gLSBtaW5zICogNjApO1xuICAgIChjdXJTZWNzIDwgMTApICYmIChjdXJTZWNzID0gJzAnICsgY3VyU2Vjcyk7XG4gICAgKHNlY3MgPCAxMCkgJiYgKHNlY3MgPSAnMCcgKyBzZWNzKTtcblxuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gY3VyTWlucyArICc6JyArIGN1clNlY3M7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSBtaW5zICsgJzonICsgc2VjcztcblxuICAgIGlmKHNldHRpbmdzLmJ1ZmZlcmVkKSB7XG4gICAgICB2YXIgYnVmZmVyZWQgPSBhdWRpby5idWZmZXJlZDtcbiAgICAgIGlmKGJ1ZmZlcmVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgbG9hZGVkID0gTWF0aC5yb3VuZCgxMDAgKiBidWZmZXJlZC5lbmQoMCkgLyBhdWRpby5kdXJhdGlvbik7XG4gICAgICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSBsb2FkZWQgKyAnJSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRPRE8gc2h1ZmZsZVxuICAgKi9cbiAgZnVuY3Rpb24gc2h1ZmZsZSgpIHtcbiAgICBpZihzaHVmZmxlKSB7XG4gICAgICBpbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHBsYXlMaXN0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZG9FbmQoKSB7XG4gICAgaWYoaW5kZXggPT09IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgIGlmKCFyZXBlYXRpbmcpIHtcbiAgICAgICAgYXVkaW8ucGF1c2UoKTtcbiAgICAgICAgcGxBY3RpdmUoKTtcbiAgICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwbGF5KDApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBsYXkoaW5kZXggKyAxKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlQmFyKGV2dCwgZWwsIGRpcikge1xuICAgIHZhciB2YWx1ZTtcbiAgICBpZihkaXIgPT09ICdob3Jpem9udGFsJykge1xuICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKCAoKGV2dC5jbGllbnRYIC0gZWwub2Zmc2V0KCkubGVmdCkgKyB3aW5kb3cucGFnZVhPZmZzZXQpICAqIDEwMCAvIGVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGgpO1xuICAgICAgZWwuc3R5bGUud2lkdGggPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZihldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgICB2YWx1ZSA9IHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApO1xuICAgICAgICB2YXIgZGVsdGEgPSBldnQuZGVsdGFZIHx8IGV2dC5kZXRhaWwgfHwgLWV2dC53aGVlbERlbHRhO1xuICAgICAgICB2YWx1ZSA9IChkZWx0YSA+IDApID8gdmFsdWUgLSAxMCA6IHZhbHVlICsgMTA7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IChlbC5vZmZzZXQoKS50b3AgKyBlbC5vZmZzZXRIZWlnaHQpIC0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICB2YWx1ZSA9IE1hdGgucm91bmQoKG9mZnNldCAtIGV2dC5jbGllbnRZKSk7XG4gICAgICB9XG4gICAgICBpZih2YWx1ZSA+IDEwMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMTAwO1xuICAgICAgaWYodmFsdWUgPCAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAwO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJCYXIoZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmcgPSB0cnVlO1xuICAgICFyaWdodENsaWNrICYmIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIHNlZWsoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZXJWb2woZXZ0KSB7XG4gICAgcmlnaHRDbGljayA9IChldnQud2hpY2ggPT09IDMpID8gdHJ1ZSA6IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSB0cnVlO1xuICAgIHNldFZvbHVtZShldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VlayhldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIHdpbmRvdy52YWx1ZSA9IG1vdmVCYXIoZXZ0LCBwcm9ncmVzc0JhciwgJ2hvcml6b250YWwnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZWVraW5nRmFsc2UoKSB7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICBhdWRpby5jdXJyZW50VGltZSA9IGF1ZGlvLmR1cmF0aW9uICogKHdpbmRvdy52YWx1ZSAvIDEwMCk7XG4gICAgICBwcm9ncmVzc0Jhci5jbGFzc0xpc3QucmVtb3ZlKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICB9XG4gICAgc2Vla2luZyA9IGZhbHNlO1xuICAgIHNlZWtpbmdWb2wgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZvbHVtZShldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcbiAgICBpZihzZWVraW5nVm9sICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlIHx8IGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICB2YXIgdmFsdWUgPSBtb3ZlQmFyKGV2dCwgdm9sdW1lQmFyLnBhcmVudE5vZGUsICd2ZXJ0aWNhbCcpIC8gMTAwO1xuICAgICAgaWYodmFsdWUgPD0gMCkge1xuICAgICAgICBhdWRpby52b2x1bWUgPSAwO1xuICAgICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZihhdWRpby5tdXRlZCkgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gdmFsdWU7XG4gICAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnkodGl0bGUsIGF0dHIpIHtcbiAgICBpZighc2V0dGluZ3Mubm90aWZpY2F0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKHdpbmRvdy5Ob3RpZmljYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhdHRyLnRhZyA9ICdBUCBtdXNpYyBwbGF5ZXInO1xuICAgIHdpbmRvdy5Ob3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oZnVuY3Rpb24oYWNjZXNzKSB7XG4gICAgICBpZihhY2Nlc3MgPT09ICdncmFudGVkJykge1xuICAgICAgICB2YXIgbm90aWNlID0gbmV3IE5vdGlmaWNhdGlvbih0aXRsZS5zdWJzdHIoMCwgMTEwKSwgYXR0cik7XG4gICAgICAgIHNldFRpbWVvdXQobm90aWNlLmNsb3NlLmJpbmQobm90aWNlKSwgNTAwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuLyogRGVzdHJveSBtZXRob2QuIENsZWFyIEFsbCAqL1xuICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgIGlmKCFhcEFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgaWYoc2V0dGluZ3MuY29uZmlybUNsb3NlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgcGxheUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlUb2dnbGUsIGZhbHNlKTtcbiAgICB2b2x1bWVCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB2b2x1bWVUb2dnbGUsIGZhbHNlKTtcbiAgICByZXBlYXRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXBlYXRUb2dnbGUsIGZhbHNlKTtcbiAgICBwbEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHBsVG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgcHJldkJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHByZXYsIGZhbHNlKTtcbiAgICBuZXh0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmV4dCwgZmFsc2UpO1xuXG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIC8vIFBsYXlsaXN0XG4gICAgcGwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBsaXN0SGFuZGxlciwgZmFsc2UpO1xuICAgIHBsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGwpO1xuXG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhcEFjdGl2ZSA9IGZhbHNlO1xuICAgIGluZGV4ID0gMDtcblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgIHBsQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcblxuICAgIC8vIFJlbW92ZSBwbGF5ZXIgZnJvbSB0aGUgRE9NIGlmIG5lY2Vzc2FyeVxuICAgIC8vIHBsYXllci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsYXllcik7XG4gIH1cblxuXG4vKipcbiAqICBIZWxwZXJzXG4gKi9cbiAgZnVuY3Rpb24gd2hlZWwoKSB7XG4gICAgdmFyIHdoZWVsO1xuICAgIGlmICgnb253aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ3doZWVsJztcbiAgICB9IGVsc2UgaWYgKCdvbm1vdXNld2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICdtb3VzZXdoZWVsJztcbiAgICB9IGVsc2Uge1xuICAgICAgd2hlZWwgPSAnTW96TW91c2VQaXhlbFNjcm9sbCc7XG4gICAgfVxuICAgIHJldHVybiB3aGVlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIGZvcih2YXIgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICBpZihkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGUoZWwsIGF0dHIpIHtcbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpO1xuICAgIGlmKGF0dHIpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKGVsZW1lbnRbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGVsZW1lbnRbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgRWxlbWVudC5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICBzY3JvbGxMZWZ0ID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LFxuICAgIHNjcm9sbFRvcCA9IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogZWwudG9wICsgc2Nyb2xsVG9wLFxuICAgICAgbGVmdDogZWwubGVmdCArIHNjcm9sbExlZnRcbiAgICB9O1xuICB9O1xuXG4gIEVsZW1lbnQucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlKHRoaXMsICcnKVthdHRyXTtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgYXR0ciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKHRoaXMuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuc3R5bGVbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIG1hdGNoZXMgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzID0gRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLCBub2RlcyA9IChub2RlLnBhcmVudE5vZGUgfHwgbm9kZS5kb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvciksIGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAobm9kZXNbKytpXSAmJiBub2Rlc1tpXSAhPSBub2RlKTtcbiAgICAgICAgICByZXR1cm4gISFub2Rlc1tpXTtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4gIC8vIGNsb3Nlc3QgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0ID0gRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0IHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBlbCA9IHRoaXM7XG4gICAgICAgICAgd2hpbGUgKGVsLm1hdGNoZXMgJiYgIWVsLm1hdGNoZXMoc2VsZWN0b3IpKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgcmV0dXJuIGVsLm1hdGNoZXMgPyBlbCA6IG51bGw7XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuLyoqXG4gKiAgUHVibGljIG1ldGhvZHNcbiAqL1xuICByZXR1cm4ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgdXBkYXRlOiB1cGRhdGVQTCxcbiAgICBkZXN0cm95OiBkZXN0cm95XG4gIH07XG5cbn0pKCk7XG5cbndpbmRvdy5BUCA9IEF1ZGlvUGxheWVyO1xuXG59KSh3aW5kb3cpO1xuXG4vLyBURVNUOiBpbWFnZSBmb3Igd2ViIG5vdGlmaWNhdGlvbnNcbnZhciBpY29uSW1hZ2UgPSAnaHR0cDovL2Z1bmt5aW1nLmNvbS9pLzIxcFg1LnBuZyc7XG5cbkFQLmluaXQoe1xuICBwbGF5TGlzdDogW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0hpdG1hbicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEcmVhbWVyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0RyZWFtZXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL1JvY2tldCUyMFBvd2VyLm1wMyd9XG4gIF1cbn0pO1xuXG4vLyBURVNUOiB1cGRhdGUgcGxheWxpc3Rcbi8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FkZFNvbmdzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4vLyAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBBUC51cGRhdGUoW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ31cbiAgXSk7XG4vL30pXG5cbkFQLnVwZGF0ZShbXSlcbiIsImZ1bmN0aW9uIGZuR2V0TGlzdChzR2V0VG9rZW4pIHtcbiAgICB2YXIgJGdldHZhbCA9ICQoXCIjc2VhcmNoX2JveFwiKS52YWwoKTtcbiAgICBpZiAoJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuutkOyehOuniFwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAkKFwiI2dldF92aWV3XCIpLmVtcHR5KCk7XG4gICAgJChcIiNuYXZfdmlld1wiKS5lbXB0eSgpO1xuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2VcIiArXG4gICAgICAgIFwiJnE9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG4gICAgaWYgKHNHZXRUb2tlbikge1xuICAgICAgICBzVGFyZ2V0VXJsICs9IFwiJnBhZ2VUb2tlbj1cIiArIHNHZXRUb2tlbjtcbiAgICB9XG5cbiAgICAkLmFqYXgoe1xuICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgdXJsOiBzVGFyZ2V0VXJsLFxuICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqZGF0YSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coamRhdGEpO1xuXG4gICAgICAgICAgICAkKGpkYXRhLml0ZW1zKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnNuaXBwZXQuY2hhbm5lbElkKTtcbiAgICAgICAgICAgIH0pLnByb21pc2UoKS5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChqZGF0YS5wcmV2UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGEgaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiK2pkYXRhLnByZXZQYWdlVG9rZW4rXCJcXFwiKTsnPjzsnbTsoITtjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGpkYXRhLm5leHRQYWdlVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgJChcIiNuYXZfdmlld1wiKS5hcHBlbmQoXCI8YSBocmVmPSdqYXZhc2NyaXB0OmZuR2V0TGlzdChcXFwiXCIramRhdGEubmV4dFBhZ2VUb2tlbitcIlxcXCIpOyc+POuLpOydjO2OmOydtOyngD48L2E+XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIGFsZXJ0KFwiZXJyb3JcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9KTtcbn0iLCIvLy9pZnJhbWUgcGxheWVyXG5cbnZhciBmaXJzdElEXG4gICAgLy8gMi4gVGhpcyBjb2RlIGxvYWRzIHRoZSBJRnJhbWUgUGxheWVyIEFQSSBjb2RlIGFzeW5jaHJvbm91c2x5LlxudmFyIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuLy8gY29uc29sZS5sb2coamRhdGEpO1xudGFnLnNyYyA9IFwiaHR0cHM6Ly93d3cueW91dHViZS5jb20vaWZyYW1lX2FwaVwiO1xudmFyIGZpcnN0U2NyaXB0VGFnID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdO1xuZmlyc3RTY3JpcHRUYWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGFnLCBmaXJzdFNjcmlwdFRhZyk7XG5cbi8vIDMuIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyBhbiA8aWZyYW1lPiAoYW5kIFlvdVR1YmUgcGxheWVyKVxuLy8gICAgYWZ0ZXIgdGhlIEFQSSBjb2RlIGRvd25sb2Fkcy5cbnZhciBwbGF5ZXI7XG5cbmZ1bmN0aW9uIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5KCkge1xuICAgIHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3BsYXllcicsIHtcbiAgICAgICAgaGVpZ2h0OiAnMzYwJyxcbiAgICAgICAgd2lkdGg6ICc2NDAnLFxuICAgICAgICB2aWRlb0lkOiAnOEEydF90QWpNejgnLFxuICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICdvblJlYWR5Jzogb25QbGF5ZXJSZWFkeSxcbiAgICAgICAgICAgICdvblN0YXRlQ2hhbmdlJzogb25QbGF5ZXJTdGF0ZUNoYW5nZVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbi8vIDQuIFRoZSBBUEkgd2lsbCBjYWxsIHRoaXMgZnVuY3Rpb24gd2hlbiB0aGUgdmlkZW8gcGxheWVyIGlzIHJlYWR5LlxuZnVuY3Rpb24gb25QbGF5ZXJSZWFkeShldmVudCkge1xuICAgIGV2ZW50LnRhcmdldC5wbGF5VmlkZW8oKTtcbn1cblxuLy8gNS4gVGhlIEFQSSBjYWxscyB0aGlzIGZ1bmN0aW9uIHdoZW4gdGhlIHBsYXllcidzIHN0YXRlIGNoYW5nZXMuXG4vLyAgICBUaGUgZnVuY3Rpb24gaW5kaWNhdGVzIHRoYXQgd2hlbiBwbGF5aW5nIGEgdmlkZW8gKHN0YXRlPTEpLFxuLy8gICAgdGhlIHBsYXllciBzaG91bGQgcGxheSBmb3Igc2l4IHNlY29uZHMgYW5kIHRoZW4gc3RvcC5cbnZhciBkb25lID0gZmFsc2U7XG5cbmZ1bmN0aW9uIG9uUGxheWVyU3RhdGVDaGFuZ2UoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQuZGF0YSA9PSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HICYmICFkb25lKSB7XG4gICAgICAgIHNldFRpbWVvdXQoc3RvcFZpZGVvLCA2MDAwMCk7XG4gICAgICAgIGRvbmUgPSB0cnVlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RvcFZpZGVvKCkge1xuICAgIHBsYXllci5zdG9wVmlkZW8oKTtcbn0iLCIvLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgbmFtZVNwYWNlID0ge307XG5uYW1lU3BhY2UuJGdldHZhbCA9ICcnO1xubmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTtcbm5hbWVTcGFjZS5wbGF5TGlzdCA9IFtdO1xubmFtZVNwYWNlLmpkYXRhID0gW107XG4vLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBTVEFSVCAvLy8vLy8vLy8vLy9cbi8vZnVuY3Rpb25hbGl0eTEgOiBuYXZpZ2F0aW9uIGNvbnRyb2xcbnZhciBuYXYgPSBmdW5jdGlvbigpIHtcbiAgICAvL2dldCBlYWNoIGJ0biBpbiBuYXYgd2l0aCBkb20gZGVsZWdhdGlvbiB3aXRoIGpxdWVyeSBhbmQgZXZlbnQgcHJvcGFnYXRpb25cbiAgICAkKFwiLm5hdl9wYXJlbnRcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vYnViYmxpbmcgcHJldmVudFxuICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcbiAgICAgICAgLy8gdGFyZ2V0ID1cbiAgICAgICAgLy8gaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQgPT0gXCJsaS5cIilcbiAgICAgICAgY29uc29sZS5sb2codGFyZ2V0KTtcbiAgICB9KTtcbn07XG5cblxuLyo8dWwgaWQ9XCJuYXZfcGFyZW50XCI+XG4gICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cInNlYXJjaF9idG5cIj48aSBjbGFzcz1cImxhIGxhLXNlYXJjaFwiPjwvaT48c3Bhbj5TZWFyY2g8L3NwYW4+PC9saT5cbiAgICAgICAgICAgICAgICAgPGxpIGNsYXNzPVwiYWxidW1fYnRuXCI+PGkgY2xhc3M9XCJsYSBsYS1tdXNpY1wiPjwvaT48c3Bhbj5NeSBBbGJ1bTwvc3Bhbj48L2xpPlxuICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9XCJwb3B1bGFyX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtaGVhcnQtb1wiPjwvaT48c3Bhbj5wb3B1bGFyPC9zcGFuPjwvbGk+XG4gICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cImFib3V0X2J0blwiPjxpIGNsYXNzPVwibGEgbGEtaW5mby1jaXJjbGVcIj48L2k+PHNwYW4+QWJvdXQ8c3Bhbj48L2xpPlxuICAgICAgICAgICAgIDwvdWw+Ki9cblxubmF2KCk7XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBFTkQgLy8vLy8vLy8vLy8vXG5cblxuXG5cblxuLy8vLy8vLy8vLy8vLyBTRUFSQ0ggQVBJIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy8vXG52YXIgZm5HZXRMaXN0ID0gZnVuY3Rpb24oc0dldFRva2VuKSB7XG4gICAgbmFtZVNwYWNlLiRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKG5hbWVTcGFjZS4kZ2V0dmFsID09IFwiXCIpIHtcbiAgICAgICAgYWxlcnQgPT0gKFwi6rKA7IOJ7Ja07J6F66Cl67CU656N64uI64ukLlwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9DbGVhbnNpbmcgRG9tLCBWaWRlb0lkXG4gICAgbmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTsgLy9nZXR2aWRlb0lkIGFycmF57LSI6riw7ZmUXG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLmVtcHR5KCk7IC8v6rKA7IOJIOqysOqzvCBWaWV37LSI6riw7ZmUXG4gICAgLy8gJChcIi5uYXZfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcblxuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIG5hbWVTcGFjZS5qZGF0YSA9IGpkYXRhOyAvL2pkYXRhLlxuICAgICAgICAgICAgc2VhcmNoUmVzdWx0VmlldygpO1xuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYWNlLmdldHZpZGVvSWQucHVzaChqZGF0YS5pdGVtc1tpXS5pZC52aWRlb0lkKTsgLy9uYW1lU3BhY2UuZ2V0dmlkZW9JZOyXkCDqsoDsg4nrkJwgdmlkZW9JRCDrsLDsl7TroZwg7LaU6rCAXG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lU3BhY2UuZ2V0dmlkZW9JZFswXSk7XG4gICAgICAgICAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFswXSArIFwiJz9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgICAgICAgICAgICAgIHBsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBFTkQgLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLy8vLy8vLy8vLy8gU0VBUkNIIFJFU1VMVCBWSUVXIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIHNlYXJjaFJlc3VsdFZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VhcmNoUmVzdWx0TGlzdCA9ICcnO1xuICAgIHZhciBnZXRTZWFyY2hMaXN0RE9NID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNlYXJjaExpc3QnKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVTcGFjZS5qZGF0YS5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZ2V0VGVtcGxhdGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VhcmNoVmlkZW8nKTsgLy90ZW1wbGF0ZSBxdWVyeXNlbGVjdFxuICAgICAgICB2YXIgZ2V0SHRtbFRlbXBsYXRlID0gZ2V0VGVtcGxhdGUuaW5uZXJIVE1MOyAvL2dldCBodG1sIGluIHRlbXBsYXRlXG4gICAgICAgIHZhciBhZGFwdFRlbXBsYXRlID0gZ2V0SHRtbFRlbXBsYXRlLnJlcGxhY2UoXCJ7dmlkZW9JbWFnZX1cIiwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5kZWZhdWx0LnVybClcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRpdGxlKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9WaWV3c31cIiwgXCJUQkRcIilcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie2lkfVwiLCBpKTtcblxuICAgICAgICBzZWFyY2hSZXN1bHRMaXN0ID0gc2VhcmNoUmVzdWx0TGlzdCArIGFkYXB0VGVtcGxhdGU7XG4gICAgICAgIGNvbnNvbGUubG9nKCk7XG4gICAgfVxuICAgIGdldFNlYXJjaExpc3RET00uaW5uZXJIVE1MID0gc2VhcmNoUmVzdWx0TGlzdDtcbn07XG4vLyAkKFwiLnNlYXJjaExpc3RcIikuYXBwZW5kKFwiPGxpIGNsYXNzPSdib3gnIGlkPSdcIiArIGkgKyBcIic+PGltZyBzcmM9J1wiICsgamRhdGEuaXRlbXNbaV0uc25pcHBldC50aHVtYm5haWxzLmhpZ2gudXJsICsgXCInIHdpZHRoID0gMjBweD5cIiArIHRoaXMuc25pcHBldC50aXRsZSArIFwiPGJ1dHRvbiBpZD0nXCIgKyBpICsgXCIndHlwZT0nYnV0dG9uJyBvbmNsaWNrPSdhZGRQbGF5TGlzdCgpJz5hZGQ8L2J1dHRvbj48L2xpPlwiKTsgLy9saXN067O07Jes7KO86riwXG4vLy8vLy8vLy8vLy8gU0VBUkNIIFJFU1VMVCBWSUVXIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLyBQTEFZIFNFTEVDVCBWSURFTyBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vXG52YXIgcGxheVZpZGVvU2VsZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgY29uc29sZS5sb2codGFnSWQpO1xuICAgICAgICBjb25zb2xlLmxvZyhuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0pO1xuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuICAgICAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmFwcGVuZChcIjxpZnJhbWUgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3JjPSdodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC9cIiArIG5hbWVTcGFjZS5nZXR2aWRlb0lkW3RhZ0lkXSArIFwiJz9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgIH0pO1xufTtcbi8vLy8vLy8vIFBMQVkgU0VMRUNUIFZJREVPIEVORCAvLy8vLy8vLy8vLy8vLy8vXG5cbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gU1RBUlQgLy8vLy8vLy8vLy8vLy8vLy9cbnZhciBhZGRQbGF5TGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdCBsaVwiKS5vbihcImNsaWNrXCIsIFwiYnV0dG9uXCIsIGZ1bmN0aW9uKCkgeyAvLyDqsoDsg4nrkJwgbGlzdCBjbGlja+2WiOydhOqyveyasC5cbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICBuYW1lU3BhY2UucGxheUxpc3QucHVzaChuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0pO1xuICAgICAgICBjb25zb2xlLmxvZyhuYW1lU3BhY2UucGxheUxpc3QpO1xuICAgIH0pO1xufTtcbi8vREVWTU9ERS8vLy8vLy8vLy8vIEFERCBQTEFZIExJU1QgVE8gQUxCVU0gRU5EIC8vLy8vLy8vLy8vLy8vLy8vIl19
;