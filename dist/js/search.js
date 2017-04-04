;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// window resize 


window.addEventListener('resize',function(){
  resizeMainHeight();
});

resizeMainHeight();
function resizeMainHeight(){
  var headerHeight = 50;
  var audioPlayerHeight = 80;
  document.getElementById("main").style.height = window.innerHeight - headerHeight - audioPlayerHeight +'px';
}





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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvWW91dHViZXNlYXJjaC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL2F1dGguanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL3BsYXllci5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvc2VhcmNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0d0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbbnVsbCwiLy8gd2luZG93IHJlc2l6ZSBcblxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJyxmdW5jdGlvbigpe1xuICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxucmVzaXplTWFpbkhlaWdodCgpO1xuZnVuY3Rpb24gcmVzaXplTWFpbkhlaWdodCgpe1xuICB2YXIgaGVhZGVySGVpZ2h0ID0gNTA7XG4gIHZhciBhdWRpb1BsYXllckhlaWdodCA9IDgwO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgKydweCc7XG59XG5cblxuXG5cblxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheWVyQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnVzZXJQbGF5bGlzdCcpLFxuICBwbGF5QnRuLFxuICBwbGF5U3ZnLFxuICBwbGF5U3ZnUGF0aCxcbiAgcHJldkJ0bixcbiAgbmV4dEJ0bixcbiAgcGxCdG4sXG4gIHJlcGVhdEJ0bixcbiAgdm9sdW1lQnRuLFxuICBwcm9ncmVzc0JhcixcbiAgcHJlbG9hZEJhcixcbiAgY3VyVGltZSxcbiAgZHVyVGltZSxcbiAgdHJhY2tUaXRsZSxcbiAgYXVkaW8sXG4gIGluZGV4ID0gMCxcbiAgcGxheUxpc3QsXG4gIHZvbHVtZUJhcixcbiAgd2hlZWxWb2x1bWVWYWx1ZSA9IDAsXG4gIHZvbHVtZUxlbmd0aCxcbiAgcmVwZWF0aW5nID0gZmFsc2UsXG4gIHNlZWtpbmcgPSBmYWxzZSxcbiAgc2Vla2luZ1ZvbCA9IGZhbHNlLFxuICByaWdodENsaWNrID0gZmFsc2UsXG4gIGFwQWN0aXZlID0gZmFsc2UsXG4gIC8vIHBsYXlsaXN0IHZhcnNcbiAgcGwsXG4gIHBsVWwsXG4gIHBsTGksXG4gIHRwbExpc3QgPVxuICAgICAgICAgICAgJzxsaSBjbGFzcz1cInBsLWxpc3RcIiBkYXRhLXRyYWNrPVwie2NvdW50fVwiPicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdHJhY2tcIj4nK1xuICAgICAgICAgICAgICAgICcgPGJ1dHRvbiBjbGFzcz1cInBsLWxpc3RfX3BsYXkgaWNvbl9idG5cIj48aSBjbGFzcz1cImxhIGxhLWhlYWRwaG9uZXNcIj48L2k+PC9idXR0b24+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2VxXCI+JytcbiAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RpdGxlXCI+e3RpdGxlfTwvZGl2PicrXG4gICAgICAgICAgICAgICc8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcmVtb3ZlIGljb25fYnRuXCI+JytcbiAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJsYSBsYS1taW51cy1jaXJjbGVcIj48L2k+JytcbiAgICAgICAgICAgICAgJzwvYnV0dG9uPicrXG4gICAgICAgICAgICAnPC9saT4nLFxuICAvLyBzZXR0aW5nc1xuICBzZXR0aW5ncyA9IHtcbiAgICB2b2x1bWUgICAgICAgIDogMC4xLFxuICAgIGNoYW5nZURvY1RpdGxlOiB0cnVlLFxuICAgIGNvbmZpcm1DbG9zZSAgOiB0cnVlLFxuICAgIGF1dG9QbGF5ICAgICAgOiBmYWxzZSxcbiAgICBidWZmZXJlZCAgICAgIDogdHJ1ZSxcbiAgICBub3RpZmljYXRpb24gIDogdHJ1ZSxcbiAgICBwbGF5TGlzdCAgICAgIDogW11cbiAgfTtcblxuICBmdW5jdGlvbiBpbml0KG9wdGlvbnMpIHtcblxuICAgIGlmKCEoJ2NsYXNzTGlzdCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKGFwQWN0aXZlIHx8IHBsYXllciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgYWxyZWFkeSBpbml0JztcbiAgICB9XG5cbiAgICBzZXR0aW5ncyA9IGV4dGVuZChzZXR0aW5ncywgb3B0aW9ucyk7XG5cbiAgICAvLyBnZXQgcGxheWVyIGVsZW1lbnRzXG4gICAgcGxheUJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tdG9nZ2xlJyk7XG4gICAgcGxheVN2ZyAgICAgICAgPSBwbGF5QnRuLnF1ZXJ5U2VsZWN0b3IoJy5pY29uLXBsYXknKTtcbiAgICBwbGF5U3ZnUGF0aCAgICA9IHBsYXlTdmcucXVlcnlTZWxlY3RvcigncGF0aCcpO1xuICAgIHByZXZCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXByZXYnKTtcbiAgICBuZXh0QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1uZXh0Jyk7XG4gICAgcmVwZWF0QnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcmVwZWF0Jyk7XG4gICAgdm9sdW1lQnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZS1idG4nKTtcbiAgICBwbEJ0biAgICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wbGF5bGlzdCcpO1xuICAgIGN1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tY3VycmVudCcpO1xuICAgIGR1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tZHVyYXRpb24nKTtcbiAgICB0cmFja1RpdGxlICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpdGxlJyk7XG4gICAgcHJvZ3Jlc3NCYXIgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19iYXInKTtcbiAgICBwcmVsb2FkQmFyICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX3ByZWxvYWQnKTtcbiAgICB2b2x1bWVCYXIgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lX19iYXInKTtcblxuICAgIHBsYXlMaXN0ID0gc2V0dGluZ3MucGxheUxpc3Q7XG5cbiAgICBwbGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhcEFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBDcmVhdGUgcGxheWxpc3RcbiAgICByZW5kZXJQTCgpO1xuICAgIHBsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIC8vIENyZWF0ZSBhdWRpbyBvYmplY3RcbiAgICBhdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICBhdWRpby5wcmVsb2FkID0gJ2F1dG8nO1xuXG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBhdWRpby52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICBpZihzZXR0aW5ncy5hdXRvUGxheSkge1xuICAgICAgYXVkaW8ucGxheSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZURvY3VtZW50VGl0bGUodGl0bGUpIHtcbiAgICBpZihzZXR0aW5ncy5jaGFuZ2VEb2NUaXRsZSkge1xuICAgICAgaWYodGl0bGUpIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY1RpdGxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZVVubG9hZChldnQpIHtcbiAgICBpZighYXVkaW8ucGF1c2VkKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdNdXNpYyBzdGlsbCBwbGF5aW5nJztcbiAgICAgIGV2dC5yZXR1cm5WYWx1ZSA9IG1lc3NhZ2U7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlcnJvckhhbmRsZXIoZXZ0KSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbWVkaWFFcnJvciA9IHtcbiAgICAgICcxJzogJ01FRElBX0VSUl9BQk9SVEVEJyxcbiAgICAgICcyJzogJ01FRElBX0VSUl9ORVRXT1JLJyxcbiAgICAgICczJzogJ01FRElBX0VSUl9ERUNPREUnLFxuICAgICAgJzQnOiAnTUVESUFfRVJSX1NSQ19OT1RfU1VQUE9SVEVEJ1xuICAgIH07XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHBsTGlbaW5kZXhdICYmIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdIb3VzdG9uIHdlIGhhdmUgYSBwcm9ibGVtOiAnICsgbWVkaWFFcnJvcltldnQudGFyZ2V0LmVycm9yLmNvZGVdKTtcbiAgfVxuXG4vKipcbiAqIFVQREFURSBQTFxuICovXG4gIGZ1bmN0aW9uIHVwZGF0ZVBMKGFkZExpc3QpIHtcbiAgICBpZighYXBBY3RpdmUpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGlzIG5vdCB5ZXQgaW5pdGlhbGl6ZWQnO1xuICAgIH1cbiAgICBpZighQXJyYXkuaXNBcnJheShhZGRMaXN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhZGRMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb3VudCA9IHBsYXlMaXN0Lmxlbmd0aDtcbiAgICB2YXIgaHRtbCAgPSBbXTtcbiAgICBwbGF5TGlzdC5wdXNoLmFwcGx5KHBsYXlMaXN0LCBhZGRMaXN0KTtcbiAgICBhZGRMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaHRtbC5wdXNoKFxuICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBjb3VudCsrKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgLy8gSWYgZXhpc3QgZW1wdHkgbWVzc2FnZVxuICAgIGlmKHBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwucmVtb3ZlQ2hpbGQoIHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpICk7XG4gICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgIH1cbiAgICAvLyBBZGQgc29uZyBpbnRvIHBsYXlsaXN0XG4gICAgcGxVbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZUVuZCcsIGh0bWwuam9pbignJykpO1xuICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuICB9XG5cbi8qKlxuICogIFBsYXlMaXN0IG1ldGhvZHNcbiAqL1xuICAgIGZ1bmN0aW9uIHJlbmRlclBMKCkge1xuICAgICAgdmFyIGh0bWwgPSBbXTtcblxuICAgICAgcGxheUxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpKSB7XG4gICAgICAgIGh0bWwucHVzaChcbiAgICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBpKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBwbCA9IGNyZWF0ZSgnZGl2Jywge1xuICAgICAgICAnY2xhc3NOYW1lJzogJ3BsLWNvbnRhaW5lcicsXG4gICAgICAgICdpZCc6ICdwbCcsXG4gICAgICAgICdpbm5lckhUTUwnOiAnPHVsIGNsYXNzPVwicGwtdWxcIj4nICsgKCFpc0VtcHR5TGlzdCgpID8gaHRtbC5qb2luKCcnKSA6ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nKSArICc8L3VsPidcbiAgICAgIH0pO1xuXG4gICAgICBwbGF5ZXJDb250YWluZXIuaW5zZXJ0QmVmb3JlKHBsLCBwbGF5ZXJDb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICBwbFVsID0gcGwucXVlcnlTZWxlY3RvcignLnBsLXVsJyk7XG4gICAgICBwbExpID0gcGxVbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICBwbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdEhhbmRsZXIoZXZ0KSB7XG4gICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgaWYoZXZ0LnRhcmdldC5tYXRjaGVzKCcucGwtbGlzdF9fdGl0bGUnKSkge1xuICAgICAgICB2YXIgY3VycmVudCA9IHBhcnNlSW50KGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuICAgICAgICBpZihpbmRleCAhPT0gY3VycmVudCkge1xuICAgICAgICAgIGluZGV4ID0gY3VycmVudDtcbiAgICAgICAgICBwbGF5KGN1cnJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYoISFldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0X19yZW1vdmUnKSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudEVsID0gZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpO1xuICAgICAgICAgICAgdmFyIGlzRGVsID0gcGFyc2VJbnQocGFyZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcblxuICAgICAgICAgICAgcGxheUxpc3Quc3BsaWNlKGlzRGVsLCAxKTtcbiAgICAgICAgICAgIHBhcmVudEVsLmNsb3Nlc3QoJy5wbC11bCcpLnJlbW92ZUNoaWxkKHBhcmVudEVsKTtcblxuICAgICAgICAgICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwbExpLCBmdW5jdGlvbihlbCwgaSkge1xuICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snLCBpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcGxheShpbmRleCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckFsbCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgaWYoaXNEZWwgPiBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4IC09IDE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgICAgICAgICAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoaXNEZWwgPCBpbmRleCkge1xuICAgICAgICAgICAgICBpbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsQWN0aXZlKCkge1xuICAgICAgaWYoYXVkaW8ucGF1c2VkKSB7XG4gICAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnQgPSBpbmRleDtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHBsTGkubGVuZ3RoOyBsZW4gPiBpOyBpKyspIHtcbiAgICAgICAgcGxMaVtpXS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICB9XG4gICAgICBwbExpW2N1cnJlbnRdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICB9XG5cblxuLyoqXG4gKiBQbGF5ZXIgbWV0aG9kc1xuICovXG4gIGZ1bmN0aW9uIHBsYXkoY3VycmVudEluZGV4KSB7XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gY2xlYXJBbGwoKTtcbiAgICB9XG5cbiAgICBpbmRleCA9IChjdXJyZW50SW5kZXggKyBwbGF5TGlzdC5sZW5ndGgpICUgcGxheUxpc3QubGVuZ3RoO1xuXG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICAvLyBDaGFuZ2UgZG9jdW1lbnQgdGl0bGVcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAvLyBBdWRpbyBwbGF5XG4gICAgYXVkaW8ucGxheSgpO1xuXG4gICAgLy8gU2hvdyBub3RpZmljYXRpb25cbiAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgIGJvZHk6ICdOb3cgcGxheWluZycsXG4gICAgICB0YWc6ICdtdXNpYy1wbGF5ZXInXG4gICAgfSk7XG5cbiAgICAvLyBUb2dnbGUgcGxheSBidXR0b25cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcblxuICAgIC8vIFNldCBhY3RpdmUgc29uZyBwbGF5bGlzdFxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmV2KCkge1xuICAgIHBsYXkoaW5kZXggLSAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgcGxheShpbmRleCArIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eUxpc3QoKSB7XG4gICAgcmV0dXJuIHBsYXlMaXN0Lmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyQWxsKCkge1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXVkaW8uc3JjID0gJyc7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSAncXVldWUgaXMgZW1wdHknO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgaWYoIXBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwuaW5uZXJIVE1MID0gJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPic7XG4gICAgfVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXlUb2dnbGUoKSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhdWRpby5wYXVzZWQpIHtcblxuICAgICAgaWYoYXVkaW8uY3VycmVudFRpbWUgPT09IDApIHtcbiAgICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIH1cbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdm9sdW1lVG9nZ2xlKCkge1xuICAgIGlmKGF1ZGlvLm11dGVkKSB7XG4gICAgICBpZihwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKSA9PT0gMCkge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gc2V0dGluZ3Mudm9sdW1lICogMTAwICsgJyUnO1xuICAgICAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZvbHVtZUxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVwZWF0VG9nZ2xlKCkge1xuICAgIGlmKHJlcGVhdEJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICByZXBlYXRpbmcgPSBmYWxzZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXBlYXRpbmcgPSB0cnVlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBsVG9nZ2xlKCkge1xuICAgIHBsQnRuLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICAgIC8vcGwuY2xhc3NMaXN0LnRvZ2dsZSgnaC1zaG93Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0aW1lVXBkYXRlKCkge1xuICAgIGlmKGF1ZGlvLnJlYWR5U3RhdGUgPT09IDAgfHwgc2Vla2luZykgcmV0dXJuO1xuXG4gICAgdmFyIGJhcmxlbmd0aCA9IE1hdGgucm91bmQoYXVkaW8uY3VycmVudFRpbWUgKiAoMTAwIC8gYXVkaW8uZHVyYXRpb24pKTtcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IGJhcmxlbmd0aCArICclJztcblxuICAgIHZhclxuICAgIGN1ck1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC8gNjApLFxuICAgIGN1clNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC0gY3VyTWlucyAqIDYwKSxcbiAgICBtaW5zID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAvIDYwKSxcbiAgICBzZWNzID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAtIG1pbnMgKiA2MCk7XG4gICAgKGN1clNlY3MgPCAxMCkgJiYgKGN1clNlY3MgPSAnMCcgKyBjdXJTZWNzKTtcbiAgICAoc2VjcyA8IDEwKSAmJiAoc2VjcyA9ICcwJyArIHNlY3MpO1xuXG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSBjdXJNaW5zICsgJzonICsgY3VyU2VjcztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9IG1pbnMgKyAnOicgKyBzZWNzO1xuXG4gICAgaWYoc2V0dGluZ3MuYnVmZmVyZWQpIHtcbiAgICAgIHZhciBidWZmZXJlZCA9IGF1ZGlvLmJ1ZmZlcmVkO1xuICAgICAgaWYoYnVmZmVyZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBNYXRoLnJvdW5kKDEwMCAqIGJ1ZmZlcmVkLmVuZCgwKSAvIGF1ZGlvLmR1cmF0aW9uKTtcbiAgICAgICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IGxvYWRlZCArICclJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVE9ETyBzaHVmZmxlXG4gICAqL1xuICBmdW5jdGlvbiBzaHVmZmxlKCkge1xuICAgIGlmKHNodWZmbGUpIHtcbiAgICAgIGluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogcGxheUxpc3QubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkb0VuZCgpIHtcbiAgICBpZihpbmRleCA9PT0gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIXJlcGVhdGluZykge1xuICAgICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgICBwbEFjdGl2ZSgpO1xuICAgICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBsYXkoMCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGxheShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVCYXIoZXZ0LCBlbCwgZGlyKSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmKGRpciA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgICB2YWx1ZSA9IE1hdGgucm91bmQoICgoZXZ0LmNsaWVudFggLSBlbC5vZmZzZXQoKS5sZWZ0KSArIHdpbmRvdy5wYWdlWE9mZnNldCkgICogMTAwIC8gZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCk7XG4gICAgICBlbC5zdHlsZS53aWR0aCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmKGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICAgIHZhbHVlID0gcGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCk7XG4gICAgICAgIHZhciBkZWx0YSA9IGV2dC5kZWx0YVkgfHwgZXZ0LmRldGFpbCB8fCAtZXZ0LndoZWVsRGVsdGE7XG4gICAgICAgIHZhbHVlID0gKGRlbHRhID4gMCkgPyB2YWx1ZSAtIDEwIDogdmFsdWUgKyAxMDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gKGVsLm9mZnNldCgpLnRvcCArIGVsLm9mZnNldEhlaWdodCkgLSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCgob2Zmc2V0IC0gZXZ0LmNsaWVudFkpKTtcbiAgICAgIH1cbiAgICAgIGlmKHZhbHVlID4gMTAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAxMDA7XG4gICAgICBpZih2YWx1ZSA8IDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDA7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlckJhcihldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZyA9IHRydWU7XG4gICAgIXJpZ2h0Q2xpY2sgJiYgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgc2VlayhldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlclZvbChldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IHRydWU7XG4gICAgc2V0Vm9sdW1lKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWVrKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgd2luZG93LnZhbHVlID0gbW92ZUJhcihldnQsIHByb2dyZXNzQmFyLCAnaG9yaXpvbnRhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWtpbmdGYWxzZSgpIHtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIGF1ZGlvLmN1cnJlbnRUaW1lID0gYXVkaW8uZHVyYXRpb24gKiAod2luZG93LnZhbHVlIC8gMTAwKTtcbiAgICAgIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5yZW1vdmUoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIH1cbiAgICBzZWVraW5nID0gZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Vm9sdW1lKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuICAgIGlmKHNlZWtpbmdWb2wgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgfHwgZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IG1vdmVCYXIoZXZ0LCB2b2x1bWVCYXIucGFyZW50Tm9kZSwgJ3ZlcnRpY2FsJykgLyAxMDA7XG4gICAgICBpZih2YWx1ZSA8PSAwKSB7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmKGF1ZGlvLm11dGVkKSBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgICBhdWRpby52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeSh0aXRsZSwgYXR0cikge1xuICAgIGlmKCFzZXR0aW5ncy5ub3RpZmljYXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYod2luZG93Lk5vdGlmaWNhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF0dHIudGFnID0gJ0FQIG11c2ljIHBsYXllcic7XG4gICAgd2luZG93Lk5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbihhY2Nlc3MpIHtcbiAgICAgIGlmKGFjY2VzcyA9PT0gJ2dyYW50ZWQnKSB7XG4gICAgICAgIHZhciBub3RpY2UgPSBuZXcgTm90aWZpY2F0aW9uKHRpdGxlLnN1YnN0cigwLCAxMTApLCBhdHRyKTtcbiAgICAgICAgc2V0VGltZW91dChub3RpY2UuY2xvc2UuYmluZChub3RpY2UpLCA1MDAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4vKiBEZXN0cm95IG1ldGhvZC4gQ2xlYXIgQWxsICovXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgaWYoIWFwQWN0aXZlKSByZXR1cm47XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBwbGF5QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuICAgIHBsQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgLy8gUGxheWxpc3RcbiAgICBwbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgcGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbCk7XG5cbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGFwQWN0aXZlID0gZmFsc2U7XG4gICAgaW5kZXggPSAwO1xuXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuXG4gICAgLy8gUmVtb3ZlIHBsYXllciBmcm9tIHRoZSBET00gaWYgbmVjZXNzYXJ5XG4gICAgLy8gcGxheWVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGxheWVyKTtcbiAgfVxuXG5cbi8qKlxuICogIEhlbHBlcnNcbiAqL1xuICBmdW5jdGlvbiB3aGVlbCgpIHtcbiAgICB2YXIgd2hlZWw7XG4gICAgaWYgKCdvbndoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnd2hlZWwnO1xuICAgIH0gZWxzZSBpZiAoJ29ubW91c2V3aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ21vdXNld2hlZWwnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGVlbCA9ICdNb3pNb3VzZVBpeGVsU2Nyb2xsJztcbiAgICB9XG4gICAgcmV0dXJuIHdoZWVsO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgZm9yKHZhciBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmKGRlZmF1bHRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZShlbCwgYXR0cikge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbCk7XG4gICAgaWYoYXR0cikge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYoZWxlbWVudFtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZWxlbWVudFtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICBFbGVtZW50LnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgIHNjcm9sbExlZnQgPSB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXG4gICAgc2Nyb2xsVG9wID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiBlbC50b3AgKyBzY3JvbGxUb3AsXG4gICAgICBsZWZ0OiBlbC5sZWZ0ICsgc2Nyb2xsTGVmdFxuICAgIH07XG4gIH07XG5cbiAgRWxlbWVudC5wcm90b3R5cGUuY3NzID0gZnVuY3Rpb24oYXR0cikge1xuICAgIGlmKHR5cGVvZiBhdHRyID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUodGhpcywgJycpW2F0dHJdO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiBhdHRyID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYodGhpcy5zdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5zdHlsZVtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gbWF0Y2hlcyBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgPSBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMsIG5vZGVzID0gKG5vZGUucGFyZW50Tm9kZSB8fCBub2RlLmRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSwgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlIChub2Rlc1srK2ldICYmIG5vZGVzW2ldICE9IG5vZGUpO1xuICAgICAgICAgIHJldHVybiAhIW5vZGVzW2ldO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbiAgLy8gY2xvc2VzdCBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgPSBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIGVsID0gdGhpcztcbiAgICAgICAgICB3aGlsZSAoZWwubWF0Y2hlcyAmJiAhZWwubWF0Y2hlcyhzZWxlY3RvcikpIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICByZXR1cm4gZWwubWF0Y2hlcyA/IGVsIDogbnVsbDtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4vKipcbiAqICBQdWJsaWMgbWV0aG9kc1xuICovXG4gIHJldHVybiB7XG4gICAgaW5pdDogaW5pdCxcbiAgICB1cGRhdGU6IHVwZGF0ZVBMLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcblxufSkoKTtcblxud2luZG93LkFQID0gQXVkaW9QbGF5ZXI7XG5cbn0pKHdpbmRvdyk7XG5cbi8vIFRFU1Q6IGltYWdlIGZvciB3ZWIgbm90aWZpY2F0aW9uc1xudmFyIGljb25JbWFnZSA9ICdodHRwOi8vZnVua3lpbWcuY29tL2kvMjFwWDUucG5nJztcblxuQVAuaW5pdCh7XG4gIHBsYXlMaXN0OiBbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRHJlYW1lcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EcmVhbWVyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9Sb2NrZXQlMjBQb3dlci5tcDMnfVxuICBdXG59KTtcblxuLy8gVEVTVDogdXBkYXRlIHBsYXlsaXN0XG4vL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRTb25ncycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuLy8gIGUucHJldmVudERlZmF1bHQoKTtcbiAgQVAudXBkYXRlKFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1BcGJaZmw3aEljZyd9XG4gIF0pO1xuLy99KVxuXG4iLCJmdW5jdGlvbiBmbkdldExpc3Qoc0dldFRva2VuKSB7XG4gICAgdmFyICRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKCRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLrrZDsnoTrp4hcIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJChcIiNnZXRfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIjbmF2X3ZpZXdcIikuZW1wdHkoKTtcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlXCIgK1xuICAgICAgICBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCRnZXR2YWwpICsgXCIma2V5PUFJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZ1wiO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGpkYXRhKTtcblxuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zbmlwcGV0LmNoYW5uZWxJZCk7XG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhIGhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIitqZGF0YS5wcmV2UGFnZVRva2VuK1wiXFxcIik7Jz487J207KCE7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGEgaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiK2pkYXRhLm5leHRQYWdlVG9rZW4rXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59IiwiLy8vaWZyYW1lIHBsYXllclxuXG52YXIgZmlyc3RJRFxuICAgIC8vIDIuIFRoaXMgY29kZSBsb2FkcyB0aGUgSUZyYW1lIFBsYXllciBBUEkgY29kZSBhc3luY2hyb25vdXNseS5cbnZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbi8vIGNvbnNvbGUubG9nKGpkYXRhKTtcbnRhZy5zcmMgPSBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIjtcbnZhciBmaXJzdFNjcmlwdFRhZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbmZpcnN0U2NyaXB0VGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRhZywgZmlyc3RTY3JpcHRUYWcpO1xuXG4vLyAzLiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgYW4gPGlmcmFtZT4gKGFuZCBZb3VUdWJlIHBsYXllcilcbi8vICAgIGFmdGVyIHRoZSBBUEkgY29kZSBkb3dubG9hZHMuXG52YXIgcGxheWVyO1xuXG5mdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcbiAgICBwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCdwbGF5ZXInLCB7XG4gICAgICAgIGhlaWdodDogJzM2MCcsXG4gICAgICAgIHdpZHRoOiAnNjQwJyxcbiAgICAgICAgdmlkZW9JZDogJzhBMnRfdEFqTXo4JyxcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAnb25SZWFkeSc6IG9uUGxheWVyUmVhZHksXG4gICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IG9uUGxheWVyU3RhdGVDaGFuZ2VcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vLyA0LiBUaGUgQVBJIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHdoZW4gdGhlIHZpZGVvIHBsYXllciBpcyByZWFkeS5cbmZ1bmN0aW9uIG9uUGxheWVyUmVhZHkoZXZlbnQpIHtcbiAgICBldmVudC50YXJnZXQucGxheVZpZGVvKCk7XG59XG5cbi8vIDUuIFRoZSBBUEkgY2FsbHMgdGhpcyBmdW5jdGlvbiB3aGVuIHRoZSBwbGF5ZXIncyBzdGF0ZSBjaGFuZ2VzLlxuLy8gICAgVGhlIGZ1bmN0aW9uIGluZGljYXRlcyB0aGF0IHdoZW4gcGxheWluZyBhIHZpZGVvIChzdGF0ZT0xKSxcbi8vICAgIHRoZSBwbGF5ZXIgc2hvdWxkIHBsYXkgZm9yIHNpeCBzZWNvbmRzIGFuZCB0aGVuIHN0b3AuXG52YXIgZG9uZSA9IGZhbHNlO1xuXG5mdW5jdGlvbiBvblBsYXllclN0YXRlQ2hhbmdlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyAmJiAhZG9uZSkge1xuICAgICAgICBzZXRUaW1lb3V0KHN0b3BWaWRlbywgNjAwMDApO1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0b3BWaWRlbygpIHtcbiAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG59IiwiLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIFNUQVJUIC8vLy8vLy8vLy8vLy8vL1xudmFyIG5hbWVTcGFjZSA9IHt9O1xubmFtZVNwYWNlLiRnZXR2YWwgPSAnJztcbm5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107XG5uYW1lU3BhY2UucGxheUxpc3QgPSBbXTtcbm5hbWVTcGFjZS5qZGF0YSA9IFtdO1xuLy8vLy8vLy8vLy8vLyBOQU1FIFNQQUNFIEVORCAvLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgU1RBUlQgLy8vLy8vLy8vLy8vXG4vL2Z1bmN0aW9uYWxpdHkxIDogbmF2aWdhdGlvbiBjb250cm9sXG52YXIgbmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9nZXQgZWFjaCBidG4gaW4gbmF2IHdpdGggZG9tIGRlbGVnYXRpb24gd2l0aCBqcXVlcnkgYW5kIGV2ZW50IHByb3BhZ2F0aW9uXG4gICAgJChcIi5uYXZfcGFyZW50XCIpLm9uKFwiY2xpY2tcIiwgXCJsaVwiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvL2J1YmJsaW5nIHByZXZlbnRcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XG4gICAgICAgIC8vIHRhcmdldCA9XG4gICAgICAgIC8vIGlmIChldmVudC5jdXJyZW50VGFyZ2V0ID09IFwibGkuXCIpXG4gICAgICAgIGNvbnNvbGUubG9nKHRhcmdldCk7XG4gICAgfSk7XG59O1xuXG5cbi8qPHVsIGlkPVwibmF2X3BhcmVudFwiPlxuICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9XCJzZWFyY2hfYnRuXCI+PGkgY2xhc3M9XCJsYSBsYS1zZWFyY2hcIj48L2k+PHNwYW4+U2VhcmNoPC9zcGFuPjwvbGk+XG4gICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cImFsYnVtX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtbXVzaWNcIj48L2k+PHNwYW4+TXkgQWxidW08L3NwYW4+PC9saT5cbiAgICAgICAgICAgICAgICAgPGxpIGNsYXNzPVwicG9wdWxhcl9idG5cIj48aSBjbGFzcz1cImxhIGxhLWhlYXJ0LW9cIj48L2k+PHNwYW4+cG9wdWxhcjwvc3Bhbj48L2xpPlxuICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9XCJhYm91dF9idG5cIj48aSBjbGFzcz1cImxhIGxhLWluZm8tY2lyY2xlXCI+PC9pPjxzcGFuPkFib3V0PHNwYW4+PC9saT5cbiAgICAgICAgICAgICA8L3VsPiovXG5cbm5hdigpO1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gTkFWIGNvbnRyb2wgRU5EIC8vLy8vLy8vLy8vL1xuXG5cblxuXG5cbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGZuR2V0TGlzdCA9IGZ1bmN0aW9uKHNHZXRUb2tlbikge1xuICAgIG5hbWVTcGFjZS4kZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmIChuYW1lU3BhY2UuJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuqygOyDieyWtOyeheugpeuwlOuejeuLiOuLpC5cIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vQ2xlYW5zaW5nIERvbSwgVmlkZW9JZFxuICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107IC8vZ2V0dmlkZW9JZCBhcnJheey0iOq4sO2ZlFxuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5lbXB0eSgpOyAvL+qygOyDiSDqsrDqs7wgVmlld+y0iOq4sO2ZlFxuICAgIC8vICQoXCIubmF2X3ZpZXdcIikuZW1wdHkoKTtcbiAgICAkKFwiLnZpZGVvUGxheWVyXCIpLmVtcHR5KCk7IC8vcGxheWVyIERvbey0iOq4sO2ZlFxuXG4gICAgLy9xdWVyeXNlY3Rpb24vL1xuICAgIC8vMTXqsJzslKlcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlJm1heFJlc3VsdHM9MTUmdHlwZT12aWRlb1wiICsgXCImcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChuYW1lU3BhY2UuJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG5cbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cblxuICAgICQuYWpheCh7XG4gICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICB1cmw6IHNUYXJnZXRVcmwsXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpkYXRhKSB7XG4gICAgICAgICAgICBuYW1lU3BhY2UuamRhdGEgPSBqZGF0YTsgLy9qZGF0YS5cbiAgICAgICAgICAgIHNlYXJjaFJlc3VsdFZpZXcoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkLnB1c2goamRhdGEuaXRlbXNbaV0uaWQudmlkZW9JZCk7IC8vbmFtZVNwYWNlLmdldHZpZGVvSWTsl5Ag6rKA7IOJ65CcIHZpZGVvSUQg67Cw7Je066GcIOy2lOqwgFxuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbMF0pO1xuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICAgICAgICAgICAgICBwbGF5VmlkZW9TZWxlY3QoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIGFsZXJ0KFwiZXJyb3JcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vIFNFQVJDSCBBUEkgRU5EIC8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBzZWFyY2hSZXN1bHRWaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlYXJjaFJlc3VsdExpc3QgPSAnJztcbiAgICB2YXIgZ2V0U2VhcmNoTGlzdERPTSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZWFyY2hMaXN0Jyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lU3BhY2UuamRhdGEuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdldFRlbXBsYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlYXJjaFZpZGVvJyk7IC8vdGVtcGxhdGUgcXVlcnlzZWxlY3RcbiAgICAgICAgdmFyIGdldEh0bWxUZW1wbGF0ZSA9IGdldFRlbXBsYXRlLmlubmVySFRNTDsgLy9nZXQgaHRtbCBpbiB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRhcHRUZW1wbGF0ZSA9IGdldEh0bWxUZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmwpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1RpdGxlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aXRsZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAucmVwbGFjZShcIntpZH1cIiwgaSk7XG5cbiAgICAgICAgc2VhcmNoUmVzdWx0TGlzdCA9IHNlYXJjaFJlc3VsdExpc3QgKyBhZGFwdFRlbXBsYXRlO1xuICAgICAgICBjb25zb2xlLmxvZygpO1xuICAgIH1cbiAgICBnZXRTZWFyY2hMaXN0RE9NLmlubmVySFRNTCA9IHNlYXJjaFJlc3VsdExpc3Q7XG59O1xuLy8gJChcIi5zZWFyY2hMaXN0XCIpLmFwcGVuZChcIjxsaSBjbGFzcz0nYm94JyBpZD0nXCIgKyBpICsgXCInPjxpbWcgc3JjPSdcIiArIGpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5oaWdoLnVybCArIFwiJyB3aWR0aCA9IDIwcHg+XCIgKyB0aGlzLnNuaXBwZXQudGl0bGUgKyBcIjxidXR0b24gaWQ9J1wiICsgaSArIFwiJ3R5cGU9J2J1dHRvbicgb25jbGljaz0nYWRkUGxheUxpc3QoKSc+YWRkPC9idXR0b24+PC9saT5cIik7IC8vbGlzdOuztOyXrOyjvOq4sFxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gU1RBUlQgLy8vLy8vLy8vLy8vLy8vL1xudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhZ0lkKTtcbiAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdKTtcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICB9KTtcbn07XG4vLy8vLy8vLyBQTEFZIFNFTEVDVCBWSURFTyBFTkQgLy8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIFNUQVJUIC8vLy8vLy8vLy8vLy8vLy8vXG52YXIgYWRkUGxheUxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICAkKFwiLnNlYXJjaExpc3QgbGlcIikub24oXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIHZhciB0YWdJZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgbmFtZVNwYWNlLnBsYXlMaXN0LnB1c2gobmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdKTtcbiAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLnBsYXlMaXN0KTtcbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBBREQgUExBWSBMSVNUIFRPIEFMQlVNIEVORCAvLy8vLy8vLy8vLy8vLy8vLyJdfQ==
;