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
 
},{}],3:[function(require,module,exports){
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




},{}]},{},[1,2,3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL3NlYXJjaC0xLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEF1ZGlvUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gIC8vIFBsYXllciB2YXJzIVxuICB2YXJcbiAgZG9jVGl0bGUgPSBkb2N1bWVudC50aXRsZSxcbiAgcGxheWVyICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXAnKSxcbiAgcGxheWVyQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnVzZXJQbGF5bGlzdCcpLFxuICBwbGF5QnRuLFxuICBwbGF5U3ZnLFxuICBwbGF5U3ZnUGF0aCxcbiAgcHJldkJ0bixcbiAgbmV4dEJ0bixcbiAgcGxCdG4sXG4gIHJlcGVhdEJ0bixcbiAgdm9sdW1lQnRuLFxuICBwcm9ncmVzc0JhcixcbiAgcHJlbG9hZEJhcixcbiAgY3VyVGltZSxcbiAgZHVyVGltZSxcbiAgdHJhY2tUaXRsZSxcbiAgYXVkaW8sXG4gIGluZGV4ID0gMCxcbiAgcGxheUxpc3QsXG4gIHZvbHVtZUJhcixcbiAgd2hlZWxWb2x1bWVWYWx1ZSA9IDAsXG4gIHZvbHVtZUxlbmd0aCxcbiAgcmVwZWF0aW5nID0gZmFsc2UsXG4gIHNlZWtpbmcgPSBmYWxzZSxcbiAgc2Vla2luZ1ZvbCA9IGZhbHNlLFxuICByaWdodENsaWNrID0gZmFsc2UsXG4gIGFwQWN0aXZlID0gZmFsc2UsXG4gIC8vIHBsYXlsaXN0IHZhcnNcbiAgcGwsXG4gIHBsVWwsXG4gIHBsTGksXG4gIHRwbExpc3QgPVxuICAgICAgICAgICAgJzxsaSBjbGFzcz1cInBsLWxpc3RcIiBkYXRhLXRyYWNrPVwie2NvdW50fVwiPicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdHJhY2tcIj4nK1xuICAgICAgICAgICAgICAgICcgPGJ1dHRvbiBjbGFzcz1cInBsLWxpc3RfX3BsYXkgaWNvbl9idG5cIj48aSBjbGFzcz1cImxhIGxhLWhlYWRwaG9uZXNcIj48L2k+PC9idXR0b24+JytcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX2VxXCI+JytcbiAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImVxX19iYXJcIj48L2Rpdj4nK1xuICAgICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8L2Rpdj4nK1xuICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInBsLWxpc3RfX3RpdGxlXCI+e3RpdGxlfTwvZGl2PicrXG4gICAgICAgICAgICAgICc8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcmVtb3ZlIGljb25fYnRuXCI+JytcbiAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJsYSBsYS1taW51cy1jaXJjbGVcIj48L2k+JytcbiAgICAgICAgICAgICAgJzwvYnV0dG9uPicrXG4gICAgICAgICAgICAnPC9saT4nLFxuICAvLyBzZXR0aW5nc1xuICBzZXR0aW5ncyA9IHtcbiAgICB2b2x1bWUgICAgICAgIDogMC4xLFxuICAgIGNoYW5nZURvY1RpdGxlOiB0cnVlLFxuICAgIGNvbmZpcm1DbG9zZSAgOiB0cnVlLFxuICAgIGF1dG9QbGF5ICAgICAgOiBmYWxzZSxcbiAgICBidWZmZXJlZCAgICAgIDogdHJ1ZSxcbiAgICBub3RpZmljYXRpb24gIDogdHJ1ZSxcbiAgICBwbGF5TGlzdCAgICAgIDogW11cbiAgfTtcblxuICBmdW5jdGlvbiBpbml0KG9wdGlvbnMpIHtcblxuICAgIGlmKCEoJ2NsYXNzTGlzdCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKGFwQWN0aXZlIHx8IHBsYXllciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgYWxyZWFkeSBpbml0JztcbiAgICB9XG5cbiAgICBzZXR0aW5ncyA9IGV4dGVuZChzZXR0aW5ncywgb3B0aW9ucyk7XG5cbiAgICAvLyBnZXQgcGxheWVyIGVsZW1lbnRzXG4gICAgcGxheUJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tdG9nZ2xlJyk7XG4gICAgcGxheVN2ZyAgICAgICAgPSBwbGF5QnRuLnF1ZXJ5U2VsZWN0b3IoJy5pY29uLXBsYXknKTtcbiAgICBwbGF5U3ZnUGF0aCAgICA9IHBsYXlTdmcucXVlcnlTZWxlY3RvcigncGF0aCcpO1xuICAgIHByZXZCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXByZXYnKTtcbiAgICBuZXh0QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1uZXh0Jyk7XG4gICAgcmVwZWF0QnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcmVwZWF0Jyk7XG4gICAgdm9sdW1lQnRuICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnZvbHVtZS1idG4nKTtcbiAgICBwbEJ0biAgICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1wbGF5bGlzdCcpO1xuICAgIGN1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tY3VycmVudCcpO1xuICAgIGR1clRpbWUgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGltZS0tZHVyYXRpb24nKTtcbiAgICB0cmFja1RpdGxlICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudHJhY2tfX3RpdGxlJyk7XG4gICAgcHJvZ3Jlc3NCYXIgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX19iYXInKTtcbiAgICBwcmVsb2FkQmFyICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX3ByZWxvYWQnKTtcbiAgICB2b2x1bWVCYXIgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lX19iYXInKTtcblxuICAgIHBsYXlMaXN0ID0gc2V0dGluZ3MucGxheUxpc3Q7XG5cbiAgICBwbGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlclZvbCwgZmFsc2UpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2V0Vm9sdW1lKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLmFkZEV2ZW50TGlzdGVuZXIod2hlZWwoKSwgc2V0Vm9sdW1lLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhcEFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBDcmVhdGUgcGxheWxpc3RcbiAgICByZW5kZXJQTCgpO1xuICAgIHBsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIC8vIENyZWF0ZSBhdWRpbyBvYmplY3RcbiAgICBhdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICBhdWRpby5wcmVsb2FkID0gJ2F1dG8nO1xuXG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIsIGZhbHNlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgdGltZVVwZGF0ZSwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgZG9FbmQsIGZhbHNlKTtcblxuICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBhdWRpby52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICBpZihzZXR0aW5ncy5hdXRvUGxheSkge1xuICAgICAgYXVkaW8ucGxheSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZURvY3VtZW50VGl0bGUodGl0bGUpIHtcbiAgICBpZihzZXR0aW5ncy5jaGFuZ2VEb2NUaXRsZSkge1xuICAgICAgaWYodGl0bGUpIHtcbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IGRvY1RpdGxlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZVVubG9hZChldnQpIHtcbiAgICBpZighYXVkaW8ucGF1c2VkKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdNdXNpYyBzdGlsbCBwbGF5aW5nJztcbiAgICAgIGV2dC5yZXR1cm5WYWx1ZSA9IG1lc3NhZ2U7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlcnJvckhhbmRsZXIoZXZ0KSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbWVkaWFFcnJvciA9IHtcbiAgICAgICcxJzogJ01FRElBX0VSUl9BQk9SVEVEJyxcbiAgICAgICcyJzogJ01FRElBX0VSUl9ORVRXT1JLJyxcbiAgICAgICczJzogJ01FRElBX0VSUl9ERUNPREUnLFxuICAgICAgJzQnOiAnTUVESUFfRVJSX1NSQ19OT1RfU1VQUE9SVEVEJ1xuICAgIH07XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBjdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgZHVyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gMDtcbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHBsTGlbaW5kZXhdICYmIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdIb3VzdG9uIHdlIGhhdmUgYSBwcm9ibGVtOiAnICsgbWVkaWFFcnJvcltldnQudGFyZ2V0LmVycm9yLmNvZGVdKTtcbiAgfVxuXG4vKipcbiAqIFVQREFURSBQTFxuICovXG4gIGZ1bmN0aW9uIHVwZGF0ZVBMKGFkZExpc3QpIHtcbiAgICBpZighYXBBY3RpdmUpIHtcbiAgICAgIHJldHVybiAnUGxheWVyIGlzIG5vdCB5ZXQgaW5pdGlhbGl6ZWQnO1xuICAgIH1cbiAgICBpZighQXJyYXkuaXNBcnJheShhZGRMaXN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhZGRMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb3VudCA9IHBsYXlMaXN0Lmxlbmd0aDtcbiAgICB2YXIgaHRtbCAgPSBbXTtcbiAgICBwbGF5TGlzdC5wdXNoLmFwcGx5KHBsYXlMaXN0LCBhZGRMaXN0KTtcbiAgICBhZGRMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaHRtbC5wdXNoKFxuICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBjb3VudCsrKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICk7XG4gICAgfSk7XG4gICAgLy8gSWYgZXhpc3QgZW1wdHkgbWVzc2FnZVxuICAgIGlmKHBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwucmVtb3ZlQ2hpbGQoIHBsLnF1ZXJ5U2VsZWN0b3IoJy5wbC1saXN0LS1lbXB0eScpICk7XG4gICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgIH1cbiAgICAvLyBBZGQgc29uZyBpbnRvIHBsYXlsaXN0XG4gICAgcGxVbC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZUVuZCcsIGh0bWwuam9pbignJykpO1xuICAgIHBsTGkgPSBwbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuICB9XG5cbi8qKlxuICogIFBsYXlMaXN0IG1ldGhvZHNcbiAqL1xuICAgIGZ1bmN0aW9uIHJlbmRlclBMKCkge1xuICAgICAgdmFyIGh0bWwgPSBbXTtcblxuICAgICAgcGxheUxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpKSB7XG4gICAgICAgIGh0bWwucHVzaChcbiAgICAgICAgICB0cGxMaXN0LnJlcGxhY2UoJ3tjb3VudH0nLCBpKS5yZXBsYWNlKCd7dGl0bGV9JywgaXRlbS50aXRsZSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICBwbCA9IGNyZWF0ZSgnZGl2Jywge1xuICAgICAgICAnY2xhc3NOYW1lJzogJ3BsLWNvbnRhaW5lcicsXG4gICAgICAgICdpZCc6ICdwbCcsXG4gICAgICAgICdpbm5lckhUTUwnOiAnPHVsIGNsYXNzPVwicGwtdWxcIj4nICsgKCFpc0VtcHR5TGlzdCgpID8gaHRtbC5qb2luKCcnKSA6ICc8bGkgY2xhc3M9XCJwbC1saXN0LS1lbXB0eVwiPlBsYXlMaXN0IGlzIGVtcHR5PC9saT4nKSArICc8L3VsPidcbiAgICAgIH0pO1xuXG4gICAgICBwbGF5ZXJDb250YWluZXIuaW5zZXJ0QmVmb3JlKHBsLCBwbGF5ZXJDb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICBwbFVsID0gcGwucXVlcnlTZWxlY3RvcignLnBsLXVsJyk7XG4gICAgICBwbExpID0gcGxVbC5xdWVyeVNlbGVjdG9yQWxsKCdsaScpO1xuXG4gICAgICBwbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdEhhbmRsZXIoZXZ0KSB7XG4gICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgaWYoZXZ0LnRhcmdldC5tYXRjaGVzKCcucGwtbGlzdF9fdGl0bGUnKSkge1xuICAgICAgICB2YXIgY3VycmVudCA9IHBhcnNlSW50KGV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3QnKS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuICAgICAgICBpZihpbmRleCAhPT0gY3VycmVudCkge1xuICAgICAgICAgIGluZGV4ID0gY3VycmVudDtcbiAgICAgICAgICBwbGF5KGN1cnJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBsYXlUb2dnbGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYoISFldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0X19yZW1vdmUnKSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudEVsID0gZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpO1xuICAgICAgICAgICAgdmFyIGlzRGVsID0gcGFyc2VJbnQocGFyZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRyYWNrJyksIDEwKTtcblxuICAgICAgICAgICAgcGxheUxpc3Quc3BsaWNlKGlzRGVsLCAxKTtcbiAgICAgICAgICAgIHBhcmVudEVsLmNsb3Nlc3QoJy5wbC11bCcpLnJlbW92ZUNoaWxkKHBhcmVudEVsKTtcblxuICAgICAgICAgICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgICAgICAgIFtdLmZvckVhY2guY2FsbChwbExpLCBmdW5jdGlvbihlbCwgaSkge1xuICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snLCBpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighYXVkaW8ucGF1c2VkKSB7XG5cbiAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcGxheShpbmRleCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckFsbCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKGlzRGVsID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgaWYoaXNEZWwgPiBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4IC09IDE7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICAgICAgICAgICAgICAgIHRyYWNrVGl0bGUuaW5uZXJIVE1MID0gcGxheUxpc3RbaW5kZXhdLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoaXNEZWwgPCBpbmRleCkge1xuICAgICAgICAgICAgICBpbmRleC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsQWN0aXZlKCkge1xuICAgICAgaWYoYXVkaW8ucGF1c2VkKSB7XG4gICAgICAgIHBsTGlbaW5kZXhdLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnQgPSBpbmRleDtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHBsTGkubGVuZ3RoOyBsZW4gPiBpOyBpKyspIHtcbiAgICAgICAgcGxMaVtpXS5jbGFzc0xpc3QucmVtb3ZlKCdwbC1saXN0LS1jdXJyZW50Jyk7XG4gICAgICB9XG4gICAgICBwbExpW2N1cnJlbnRdLmNsYXNzTGlzdC5hZGQoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICB9XG5cblxuLyoqXG4gKiBQbGF5ZXIgbWV0aG9kc1xuICovXG4gIGZ1bmN0aW9uIHBsYXkoY3VycmVudEluZGV4KSB7XG5cbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm4gY2xlYXJBbGwoKTtcbiAgICB9XG5cbiAgICBpbmRleCA9IChjdXJyZW50SW5kZXggKyBwbGF5TGlzdC5sZW5ndGgpICUgcGxheUxpc3QubGVuZ3RoO1xuXG4gICAgYXVkaW8uc3JjID0gcGxheUxpc3RbaW5kZXhdLmZpbGU7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG5cbiAgICAvLyBDaGFuZ2UgZG9jdW1lbnQgdGl0bGVcbiAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAvLyBBdWRpbyBwbGF5XG4gICAgYXVkaW8ucGxheSgpO1xuXG4gICAgLy8gU2hvdyBub3RpZmljYXRpb25cbiAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgIGJvZHk6ICdOb3cgcGxheWluZycsXG4gICAgICB0YWc6ICdtdXNpYy1wbGF5ZXInXG4gICAgfSk7XG5cbiAgICAvLyBUb2dnbGUgcGxheSBidXR0b25cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcblxuICAgIC8vIFNldCBhY3RpdmUgc29uZyBwbGF5bGlzdFxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmV2KCkge1xuICAgIHBsYXkoaW5kZXggLSAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgcGxheShpbmRleCArIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eUxpc3QoKSB7XG4gICAgcmV0dXJuIHBsYXlMaXN0Lmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyQWxsKCkge1xuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXVkaW8uc3JjID0gJyc7XG4gICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSAncXVldWUgaXMgZW1wdHknO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgaWYoIXBsVWwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykpIHtcbiAgICAgIHBsVWwuaW5uZXJIVE1MID0gJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPic7XG4gICAgfVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXlUb2dnbGUoKSB7XG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihhdWRpby5wYXVzZWQpIHtcblxuICAgICAgaWYoYXVkaW8uY3VycmVudFRpbWUgPT09IDApIHtcbiAgICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgICAgIGJvZHk6ICdOb3cgcGxheWluZydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKHBsYXlMaXN0W2luZGV4XS50aXRsZSk7XG5cbiAgICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wYXVzZScpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjaGFuZ2VEb2N1bWVudFRpdGxlKCk7XG4gICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIH1cbiAgICBwbEFjdGl2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdm9sdW1lVG9nZ2xlKCkge1xuICAgIGlmKGF1ZGlvLm11dGVkKSB7XG4gICAgICBpZihwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKSA9PT0gMCkge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gc2V0dGluZ3Mudm9sdW1lICogMTAwICsgJyUnO1xuICAgICAgICBhdWRpby52b2x1bWUgPSBzZXR0aW5ncy52b2x1bWU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IHZvbHVtZUxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IDA7XG4gICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVwZWF0VG9nZ2xlKCkge1xuICAgIGlmKHJlcGVhdEJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICByZXBlYXRpbmcgPSBmYWxzZTtcbiAgICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXBlYXRpbmcgPSB0cnVlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBsVG9nZ2xlKCkge1xuICAgIHBsQnRuLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICAgIC8vcGwuY2xhc3NMaXN0LnRvZ2dsZSgnaC1zaG93Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0aW1lVXBkYXRlKCkge1xuICAgIGlmKGF1ZGlvLnJlYWR5U3RhdGUgPT09IDAgfHwgc2Vla2luZykgcmV0dXJuO1xuXG4gICAgdmFyIGJhcmxlbmd0aCA9IE1hdGgucm91bmQoYXVkaW8uY3VycmVudFRpbWUgKiAoMTAwIC8gYXVkaW8uZHVyYXRpb24pKTtcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IGJhcmxlbmd0aCArICclJztcblxuICAgIHZhclxuICAgIGN1ck1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC8gNjApLFxuICAgIGN1clNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmN1cnJlbnRUaW1lIC0gY3VyTWlucyAqIDYwKSxcbiAgICBtaW5zID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAvIDYwKSxcbiAgICBzZWNzID0gTWF0aC5mbG9vcihhdWRpby5kdXJhdGlvbiAtIG1pbnMgKiA2MCk7XG4gICAgKGN1clNlY3MgPCAxMCkgJiYgKGN1clNlY3MgPSAnMCcgKyBjdXJTZWNzKTtcbiAgICAoc2VjcyA8IDEwKSAmJiAoc2VjcyA9ICcwJyArIHNlY3MpO1xuXG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSBjdXJNaW5zICsgJzonICsgY3VyU2VjcztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9IG1pbnMgKyAnOicgKyBzZWNzO1xuXG4gICAgaWYoc2V0dGluZ3MuYnVmZmVyZWQpIHtcbiAgICAgIHZhciBidWZmZXJlZCA9IGF1ZGlvLmJ1ZmZlcmVkO1xuICAgICAgaWYoYnVmZmVyZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBNYXRoLnJvdW5kKDEwMCAqIGJ1ZmZlcmVkLmVuZCgwKSAvIGF1ZGlvLmR1cmF0aW9uKTtcbiAgICAgICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IGxvYWRlZCArICclJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVE9ETyBzaHVmZmxlXG4gICAqL1xuICBmdW5jdGlvbiBzaHVmZmxlKCkge1xuICAgIGlmKHNodWZmbGUpIHtcbiAgICAgIGluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogcGxheUxpc3QubGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkb0VuZCgpIHtcbiAgICBpZihpbmRleCA9PT0gcGxheUxpc3QubGVuZ3RoIC0gMSkge1xuICAgICAgaWYoIXJlcGVhdGluZykge1xuICAgICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgICBwbEFjdGl2ZSgpO1xuICAgICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBsYXkoMCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGxheShpbmRleCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVCYXIoZXZ0LCBlbCwgZGlyKSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmKGRpciA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgICB2YWx1ZSA9IE1hdGgucm91bmQoICgoZXZ0LmNsaWVudFggLSBlbC5vZmZzZXQoKS5sZWZ0KSArIHdpbmRvdy5wYWdlWE9mZnNldCkgICogMTAwIC8gZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aCk7XG4gICAgICBlbC5zdHlsZS53aWR0aCA9IHZhbHVlICsgJyUnO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmKGV2dC50eXBlID09PSB3aGVlbCgpKSB7XG4gICAgICAgIHZhbHVlID0gcGFyc2VJbnQodm9sdW1lTGVuZ3RoLCAxMCk7XG4gICAgICAgIHZhciBkZWx0YSA9IGV2dC5kZWx0YVkgfHwgZXZ0LmRldGFpbCB8fCAtZXZ0LndoZWVsRGVsdGE7XG4gICAgICAgIHZhbHVlID0gKGRlbHRhID4gMCkgPyB2YWx1ZSAtIDEwIDogdmFsdWUgKyAxMDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gKGVsLm9mZnNldCgpLnRvcCArIGVsLm9mZnNldEhlaWdodCkgLSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCgob2Zmc2V0IC0gZXZ0LmNsaWVudFkpKTtcbiAgICAgIH1cbiAgICAgIGlmKHZhbHVlID4gMTAwKSB2YWx1ZSA9IHdoZWVsVm9sdW1lVmFsdWUgPSAxMDA7XG4gICAgICBpZih2YWx1ZSA8IDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDA7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlckJhcihldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZyA9IHRydWU7XG4gICAgIXJpZ2h0Q2xpY2sgJiYgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgc2VlayhldnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlclZvbChldnQpIHtcbiAgICByaWdodENsaWNrID0gKGV2dC53aGljaCA9PT0gMykgPyB0cnVlIDogZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IHRydWU7XG4gICAgc2V0Vm9sdW1lKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWVrKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgd2luZG93LnZhbHVlID0gbW92ZUJhcihldnQsIHByb2dyZXNzQmFyLCAnaG9yaXpvbnRhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWtpbmdGYWxzZSgpIHtcbiAgICBpZihzZWVraW5nICYmIHJpZ2h0Q2xpY2sgPT09IGZhbHNlICYmIGF1ZGlvLnJlYWR5U3RhdGUgIT09IDApIHtcbiAgICAgIGF1ZGlvLmN1cnJlbnRUaW1lID0gYXVkaW8uZHVyYXRpb24gKiAod2luZG93LnZhbHVlIC8gMTAwKTtcbiAgICAgIHByb2dyZXNzQmFyLmNsYXNzTGlzdC5yZW1vdmUoJ3Byb2dyZXNzX19iYXItLWFjdGl2ZScpO1xuICAgIH1cbiAgICBzZWVraW5nID0gZmFsc2U7XG4gICAgc2Vla2luZ1ZvbCA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Vm9sdW1lKGV2dCkge1xuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZvbHVtZUxlbmd0aCA9IHZvbHVtZUJhci5jc3MoJ2hlaWdodCcpO1xuICAgIGlmKHNlZWtpbmdWb2wgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgfHwgZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IG1vdmVCYXIoZXZ0LCB2b2x1bWVCYXIucGFyZW50Tm9kZSwgJ3ZlcnRpY2FsJykgLyAxMDA7XG4gICAgICBpZih2YWx1ZSA8PSAwKSB7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IDA7XG4gICAgICAgIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5hZGQoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmKGF1ZGlvLm11dGVkKSBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgICBhdWRpby52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgdm9sdW1lQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tdXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeSh0aXRsZSwgYXR0cikge1xuICAgIGlmKCFzZXR0aW5ncy5ub3RpZmljYXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYod2luZG93Lk5vdGlmaWNhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF0dHIudGFnID0gJ0FQIG11c2ljIHBsYXllcic7XG4gICAgd2luZG93Lk5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbihhY2Nlc3MpIHtcbiAgICAgIGlmKGFjY2VzcyA9PT0gJ2dyYW50ZWQnKSB7XG4gICAgICAgIHZhciBub3RpY2UgPSBuZXcgTm90aWZpY2F0aW9uKHRpdGxlLnN1YnN0cigwLCAxMTApLCBhdHRyKTtcbiAgICAgICAgc2V0VGltZW91dChub3RpY2UuY2xvc2UuYmluZChub3RpY2UpLCA1MDAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4vKiBEZXN0cm95IG1ldGhvZC4gQ2xlYXIgQWxsICovXG4gIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgaWYoIWFwQWN0aXZlKSByZXR1cm47XG5cbiAgICBpZihzZXR0aW5ncy5jb25maXJtQ2xvc2UpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBiZWZvcmVVbmxvYWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBwbGF5QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxheVRvZ2dsZSwgZmFsc2UpO1xuICAgIHZvbHVtZUJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHZvbHVtZVRvZ2dsZSwgZmFsc2UpO1xuICAgIHJlcGVhdEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHJlcGVhdFRvZ2dsZSwgZmFsc2UpO1xuICAgIHBsQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcGxUb2dnbGUsIGZhbHNlKTtcblxuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyQmFyLCBmYWxzZSk7XG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNlZWssIGZhbHNlKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykucmVtb3ZlRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICBwcmV2QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcHJldiwgZmFsc2UpO1xuICAgIG5leHRCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuZXh0LCBmYWxzZSk7XG5cbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgLy8gUGxheWxpc3RcbiAgICBwbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGxpc3RIYW5kbGVyLCBmYWxzZSk7XG4gICAgcGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwbCk7XG5cbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGFwQWN0aXZlID0gZmFsc2U7XG4gICAgaW5kZXggPSAwO1xuXG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW0gYiAgICAgICAgdXRlZCcpO1xuICAgIHBsQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIHJlcGVhdEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKTtcblxuICAgIC8vIFJlbW92ZSBwbGF5ZXIgZnJvbSB0aGUgRE9NIGlmIG5lY2Vzc2FyeVxuICAgIC8vIHBsYXllci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsYXllcik7XG4gIH1cblxuXG4vKipcbiAqICBIZWxwZXJzXG4gKi9cbiAgZnVuY3Rpb24gd2hlZWwoKSB7XG4gICAgdmFyIHdoZWVsO1xuICAgIGlmICgnb253aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ3doZWVsJztcbiAgICB9IGVsc2UgaWYgKCdvbm1vdXNld2hlZWwnIGluIGRvY3VtZW50KSB7XG4gICAgICB3aGVlbCA9ICdtb3VzZXdoZWVsJztcbiAgICB9IGVsc2Uge1xuICAgICAgd2hlZWwgPSAnTW96TW91c2VQaXhlbFNjcm9sbCc7XG4gICAgfVxuICAgIHJldHVybiB3aGVlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIGZvcih2YXIgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICBpZihkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0cztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGUoZWwsIGF0dHIpIHtcbiAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWwpO1xuICAgIGlmKGF0dHIpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKGVsZW1lbnRbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGVsZW1lbnRbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgRWxlbWVudC5wcm90b3R5cGUub2Zmc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICBzY3JvbGxMZWZ0ID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LFxuICAgIHNjcm9sbFRvcCA9IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvcDogZWwudG9wICsgc2Nyb2xsVG9wLFxuICAgICAgbGVmdDogZWwubGVmdCArIHNjcm9sbExlZnRcbiAgICB9O1xuICB9O1xuXG4gIEVsZW1lbnQucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlKHRoaXMsICcnKVthdHRyXTtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgYXR0ciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvcih2YXIgbmFtZSBpbiBhdHRyKSB7XG4gICAgICAgIGlmKHRoaXMuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuc3R5bGVbbmFtZV0gPSBhdHRyW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIG1hdGNoZXMgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzID0gRWxlbWVudFByb3RvdHlwZS5tYXRjaGVzIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLCBub2RlcyA9IChub2RlLnBhcmVudE5vZGUgfHwgbm9kZS5kb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvciksIGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAobm9kZXNbKytpXSAmJiBub2Rlc1tpXSAhPSBub2RlKTtcbiAgICAgICAgICByZXR1cm4gISFub2Rlc1tpXTtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4gIC8vIGNsb3Nlc3QgcG9seWZpbGxcbiAgd2luZG93LkVsZW1lbnQgJiYgZnVuY3Rpb24oRWxlbWVudFByb3RvdHlwZSkge1xuICAgICAgRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0ID0gRWxlbWVudFByb3RvdHlwZS5jbG9zZXN0IHx8XG4gICAgICBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgIHZhciBlbCA9IHRoaXM7XG4gICAgICAgICAgd2hpbGUgKGVsLm1hdGNoZXMgJiYgIWVsLm1hdGNoZXMoc2VsZWN0b3IpKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgcmV0dXJuIGVsLm1hdGNoZXMgPyBlbCA6IG51bGw7XG4gICAgICB9O1xuICB9KEVsZW1lbnQucHJvdG90eXBlKTtcblxuLyoqXG4gKiAgUHVibGljIG1ldGhvZHNcbiAqL1xuICByZXR1cm4ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgdXBkYXRlOiB1cGRhdGVQTCxcbiAgICBkZXN0cm95OiBkZXN0cm95XG4gIH07XG5cbn0pKCk7XG5cbndpbmRvdy5BUCA9IEF1ZGlvUGxheWVyO1xuXG59KSh3aW5kb3cpO1xuXG4vLyBURVNUOiBpbWFnZSBmb3Igd2ViIG5vdGlmaWNhdGlvbnNcbnZhciBpY29uSW1hZ2UgPSAnaHR0cDovL2Z1bmt5aW1nLmNvbS9pLzIxcFg1LnBuZyc7XG5cbkFQLmluaXQoe1xuICBwbGF5TGlzdDogW1xuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1RoZSBCZXN0IG9mIEJhY2gnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRHJlYW1lci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvUm9ja2V0JTIwUG93ZXIubXAzJ31cbiAgXVxufSk7XG5cbi8vIFRFU1Q6IHVwZGF0ZSBwbGF5bGlzdFxuLy9kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWRkU29uZ3MnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbi8vICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIEFQLnVwZGF0ZShbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnRGlzdHJpY3QgRm91cicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EaXN0cmljdCUyMEZvdXIubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnQ2hyaXN0bWFzIFJhcCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9DaHJpc3RtYXMlMjBSYXAubXAzJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1BcGJaZmw3aEljZyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9QXBiWmZsN2hJY2cnfVxuICBdKTtcbi8vfSlcblxuIiwiLyogMjAxNy4gMDMuIFxuKi9cblxuXG4vKiA9PT09PT09IFJlc3BvbnNpdmUgV2ViID09PT09PT0gKi9cbmNvbnN0IGhQWCA9IHtcbiAgICBoZWFkZXI6IDUwLFxuICAgIGF1ZGlvUGxheWVyIDogODAsXG4gICAgaW5wdXRCb3ggOiA0NVxufVxuXG5jb25zdCByZXNpemVNYWluSGVpZ2h0ID0gZnVuY3Rpb24oKXtcbiAgdXRpbC4kKFwiI21haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaFBYLmhlYWRlciAtIGhQWC5hdWRpb1BsYXllciArJ3B4JztcbiAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaFBYLmhlYWRlciAtIGhQWC5hdWRpb1BsYXllciAtIGhQWC5pbnB1dEJveCArICdweCc7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7XG4gICAgcmVzaXplTWFpbkhlaWdodCgpO1xufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGZ1bmN0aW9uKCkge1xuICAgIHNlYXJjaExpc3RWaWV3LmNhbGxTZWFyY2hBUEkoKTtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuXG4vKiA9PT09PT09IFV0aWxpdHkgPT09PT09PSAqL1xudmFyIHV0aWwgPSB7XG4gICAgcnVuQWpheCA6IGZ1bmN0aW9uKHVybCwgbGlzdGVuZXIsIHJlcUZ1bmMpe1xuICAgICAgICBsZXQgb1JlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICBvUmVxLmFkZEV2ZW50TGlzdGVuZXIobGlzdGVuZXIsIHJlcUZ1bmMpO1xuICAgICAgICBvUmVxLm9wZW4oXCJHRVRcIiwgdXJsKTtcbiAgICAgICAgb1JlcS5zZW5kKCk7XG4gICAgfSxcbiAgICAkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfSxcbiAgICAkJDogZnVuY3Rpb24oc2VsZWN0b3Ipe1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgfVxufVxuXG4vKiA9PT09PT09IFlvdXR1YmUgQVBJIFNldHRpbmcgPT09PT09PSAqL1xuY29uc3Qgc2V0VGFyZ2V0VVJMID0gZnVuY3Rpb24oa2V5d29yZCwgc0dldFRva2VuKXtcbiAgICBcbiAgICBjb25zdCBiYXNlVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCYnO1xuICAgIHZhciBzZXR0aW5nID0ge1xuICAgICAgICBvcmRlcjogJ3ZpZXdDb3VudCcsXG4gICAgICAgIG1heFJlc3VsdHM6IDE1LFxuICAgICAgICB0eXBlOiAndmlkZW8nLFxuICAgICAgICBxOiBrZXl3b3JkLFxuICAgICAgICBrZXk6ICdBSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWcnXG4gICAgfVxuIFxuICAgIGxldCBzVGFyZ2V0VVJMID0gT2JqZWN0LmtleXMoc2V0dGluZykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNldHRpbmdba10pO1xuICAgIH0pLmpvaW4oJyYnKVxuICAgIFxuICAgIHNUYXJnZXRVUkwgPSBiYXNlVVJMICsgc1RhcmdldFVSTDtcbiAgICBcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVUkwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cbiAgICByZXR1cm4gc1RhcmdldFVSTDtcbn1cblxuXG4vKiA9PT09PT09IE1vZGVsID09PT09PT0gKi9cbmNvbnN0IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hbGxWaWRlb3MgPSBqc29uOyAvL+yymOydjCDroZzrlKnrkKDrloQg66qo65OgIOuNsOydtO2EsOulvCDqsIDsoLjsmLXri4jri6QuXG4gICAgfSxcbiAgICBzZWxlY3RlZFZpZGVvSUQ6IG51bGwsIC8v7ISg7YOd7ZWcIOqwklxuICAgIG5leHRQYWdlVG9rZW5OdW1lcjogbnVsbCAvL+uLpOydjCDtjpjsnbTsp4Ag7Yag7YGwIOqwkjtcbn07XG5cbmNvbnN0IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgc2VhcmNoTGlzdFZpZXcuaW5pdCgpO1xuICAgIH0sXG4gICAgZ2V0QWxsVmlkZW9zOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5hbGxWaWRlb3MuaXRlbXM7XG4gICAgfSxcbiAgICBnZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4geW91dHViZUFQSVNlYXJjaFJlc3VsdC5uZXh0UGFnZVRva2VuTnVtZXI7XG4gICAgfSxcbiAgICBzZXROZXh0UGFnZVRva2VuOiBmdW5jdGlvbigpe1xuICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0Lm5leHRQYWdlVG9rZW5OdW1lciA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuYWxsVmlkZW9zLm5leHRQYWdlVG9rZW47XG4gICAgfSxcbiAgICBnZXRTZWxlY3RlZFZpZGVvSUQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LnNlbGVjdGVkVmlkZW9JRFxuICAgIH0sXG4gICAgc2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oaWQpe1xuICAgICAgICBpZCA9IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuc2VsZWN0ZWRWaWRlb0lEXG4gICAgfVxufVxuXG5jb25zdCBzZWFyY2hMaXN0VmlldyA9IHtcbiAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgdGhpcy5jb250ZW50ID0gdXRpbC4kKFwiLnNlYXJjaExpc3RcIik7XG4gICAgICAgdGhpcy50ZW1wbGF0ZSA9IHV0aWwuJChcIiNzZWFyY2hWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICB0aGlzLnNob3dQcmV2aWV3KCk7XG4gICAgXG4gICB9LFxuICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgIHZpZGVvcyA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0QWxsVmlkZW9zKCk7XG4gICAgICAgbGV0IHNIVE1MID0gJyc7XG4gICAgICAgZm9yIChsZXQgaT0wOyBpIDwgdmlkZW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgIGxldCB2aWRlb0ltYWdlVXJsID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmw7XG4gICAgICAgICAgIGxldCB2aWRlb1RpdGxlID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRpdGxlO1xuICAgICAgICAgICBsZXQgcHVibGlzaGVkQXQgPSB2aWRlb3NbaV0uc25pcHBldC5wdWJsaXNoZWRBdDtcbiAgICAgICAgICAgbGV0IHZpZGVvSWQgPSB2aWRlb3NbaV0uaWQudmlkZW9JZFxuICAgICAgICAgICBzRG9tID0gdGhpcy50ZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIHZpZGVvSW1hZ2VVcmwpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIHZpZGVvVGl0bGUpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIHB1Ymxpc2hlZEF0KVxuICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb0lkfVwiLCB2aWRlb0lkKTtcbiAgICAgICAgICAgIHNIVE1MID0gc0hUTUwgKyBzRG9tO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29udGVudC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIHNIVE1MKTtcbiAgICB9LFxuICAgIFxuICAgIGNhbGxTZWFyY2hBUEk6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHV0aWwuJChcIi5nb1NlYXJjaFwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgdGhpcy5zZWFyY2hLZXl3b3JkID0gdXRpbC4kKFwiI3NlYXJjaF9ib3hcIikudmFsdWU7XG4gICAgICAgICAgICBzVXJsID0gc2V0VGFyZ2V0VVJMKHRoaXMuc2VhcmNoS2V5d29yZCk7XG4gICAgICAgICAgICB1dGlsLnJ1bkFqYXgoc1VybCwgXCJsb2FkXCIsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAganNvbiA9IEpTT04ucGFyc2UodGhpcy5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuc2V0TmV4dFBhZ2VUb2tlbigpO1xuICAgICAgICAgICAgICAgIHNlYXJjaExpc3RWaWV3Lm1vcmVSZXN1bHQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgbW9yZVJlc3VsdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5zZWFyY2hLZXl3b3JkID0gdXRpbC4kKFwiI3NlYXJjaF9ib3hcIikudmFsdWU7XG4gICAgICAgIHV0aWwuJChcIi5zZWFyY2hMaXN0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIizCoGZ1bmN0aW9uKCl7XG7CoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqBpZih0aGlzLnNjcm9sbEhlaWdodMKgLcKgdGhpcy5zY3JvbGxUb3DCoD09PcKgdGhpcy5jbGllbnRIZWlnaHQpwqB7XG4gICAgICAgICAgICAgICAgbmV4dFBhZ2VUb2sgPSB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmdldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgICAgICBzVXJsID0gc2V0VGFyZ2V0VVJMKHRoaXMuc2VhcmNoS2V5d29yZCwgbmV4dFBhZ2VUb2spO1xuwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgIHV0aWwucnVuQWpheChzVXJsLMKgXCJsb2FkXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAganNvbiA9IEpTT04ucGFyc2UodGhpcy5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuc2V0TmV4dFBhZ2VUb2tlbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuwqDCoMKgwqDCoMKgwqDCoMKgwqDCoMKgfVxuwqDCoMKgwqDCoMKgwqDCoH0pOyAgXG4gICAgfSxcbiAgICBzaG93UHJldmlldzogZnVuY3Rpb24oKXtcbiAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHRhcmdldCA9IGV2dC50YXJnZXQ7XG4gICAgICAgICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgPT09ICdJJyl7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgKGNvbnNvbGUubG9nKHRhcmdldCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lICE9PSBcIkJVVFRPTlwiKXsgXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gdXRpbC4kKFwiLnZpZGVvSW5mb1wiKTsgXG4gICAgICAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5kYXRhc2V0LmlkID0gJyc7XG4gICAgICAgICAgICAgICAgdXRpbC4kKFwiLnByZXZpZXdNb2RhbFwiKS5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZVwiKTtcbiAgICAgICAgICAgICAgICBzRG9tID0gdXRpbC4kKFwiI3ByZXZpZXdWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgc0hUTUwgPSBzRG9tLnJlcGxhY2UoXCJ7ZGF0YS1pZH1cIiwgdGFyZ2V0LmRhdGFzZXQuaWQpO1xuICAgICAgICAgICAgICAgIHV0aWwuJChcIi5wcmV2aWV3TW9kYWxcIikuaW5uZXJIVE1MID0gc0hUTUw7XG4gICAgICAgICAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuY2xhc3NMaXN0LmFkZChcIm1vZGFsLW9wZW5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlUHJldmlldygpO1xuICAgICAgICAgICAgICAgIH0pLmNhbGwoc2VhcmNoTGlzdFZpZXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2codGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIGVsZW0gPSAgZWxlbS5jbG9zZXN0KFwiLnZpZGVvSW5mb1wiKTsgIFxuICAgICAgICAgICAgLy8gKGNvbnNvbGUubG9nKGVsZW0pKTsgICAgICBcbiAgICAgICAgICAgIC8vIGlmICghZWxlbSkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9LFxuICAgIGhpZGVQcmV2aWV3OiBmdW5jdGlvbigpe1xuICAgICAgICB1dGlsLiQoXCIuY2xvc2VfYnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBsZXQgYnV0dG9uID0gIGV2dC50YXJnZXQuY2xvc2VzdChcImJ1dHRvblwiKTtcbiAgICAgICAgICAgIHV0aWwuJChcIi5wcmV2aWV3TW9kYWxcIikuY2xhc3NMaXN0LmFkZChcImhpZGVcIik7XG4gICAgICAgICAgICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5jbGFzc0xpc3QucmVtb3ZlKFwibW9kYWwtb3BlblwiKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcblxufVxuICIsIi8vLy8vLy8vLy8vLy8gTkFNRSBTUEFDRSBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBuYW1lU3BhY2UgPSB7fTtcbm5hbWVTcGFjZS4kZ2V0dmFsID0gJyc7XG5uYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdO1xubmFtZVNwYWNlLnBsYXlMaXN0ID0gW107XG5uYW1lU3BhY2UuamRhdGEgPSBbXTtcbm5hbWVTcGFjZS5hbGJ1bVN0b3JhZ2UgPSBsb2NhbFN0b3JhZ2U7XG4vLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBTVEFSVCAvLy8vLy8vLy8vLy9cbi8vZnVuY3Rpb25hbGl0eTEgOiBuYXZpZ2F0aW9uIGNvbnRyb2xcbnZhciBuYXYgPSBmdW5jdGlvbigpIHtcbiAgICAvL2dldCBlYWNoIGJ0biBpbiBuYXYgd2l0aCBkb20gZGVsZWdhdGlvbiB3aXRoIGpxdWVyeSBhbmQgZXZlbnQgcHJvcGFnYXRpb25cbiAgICAkKFwiLm5hdl9wYXJlbnRcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vYnViYmxpbmcgcHJldmVudFxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zb2xlLmxvZyhjbGFzc05hbWUpO1xuICAgICAgICBpZiAoY2xhc3NOYW1lID09IFwiYWxidW1fYnRuXCIpIHtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBcInBvcHVsYXJfYnRuXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUE9QVUxBUi4uLi4uP1wiKTtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTRUFSQ0ggQlROISEhIVwiKVxuICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLnNob3coKTsgLy/qsoDsg4kg6rKw6rO8IENsZWFyXG4gICAgICAgICAgICAkKFwiLmFkZE5ld01lZGlhXCIpLnNob3coKTsgLy/qsoDsg4kg7LC9IENsZWFyXG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBFTkQgLy8vLy8vLy8vLy8vXG5cbm5hdigpOyAvL25hdiDsi6Ttlolcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGZuR2V0TGlzdCA9IGZ1bmN0aW9uKHNHZXRUb2tlbikge1xuICAgIG5hbWVTcGFjZS4kZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmIChuYW1lU3BhY2UuJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuqygOyDieyWtOyeheugpeuwlOuejeuLiOuLpC5cIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vQ2xlYW5zaW5nIERvbSwgVmlkZW9JZFxuICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107IC8vZ2V0dmlkZW9JZCBhcnJheey0iOq4sO2ZlFxuICAgIC8vICQoXCIuc2VhcmNoTGlzdFwiKS5lbXB0eSgpOyAvL+qygOyDiSDqsrDqs7wgVmlld+y0iOq4sO2ZlFxuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgICAgICBjb25zb2xlLmxvZyhzVGFyZ2V0VXJsKTtcbiAgICB9XG5cbiAgICAkLmFqYXgoe1xuICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgdXJsOiBzVGFyZ2V0VXJsLFxuICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqZGF0YSkge1xuICAgICAgICAgICAgbmFtZVNwYWNlLmpkYXRhID0gamRhdGE7IC8vamRhdGEuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlYXJjaFJlc3VsdFZpZXcoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkLnB1c2goamRhdGEuaXRlbXNbaV0uaWQudmlkZW9JZCk7IC8vbmFtZVNwYWNlLmdldHZpZGVvSWTsl5Ag6rKA7IOJ65CcIHZpZGVvSUQg67Cw7Je066GcIOy2lOqwgFxuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbMF0pO1xuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICAgICAgICAgICAgICAvL3BsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgZ2V0TW9yZVNlYXJjaFJlc3VsdChqZGF0YS5uZXh0UGFnZVRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLy8vLy8vLy8vLy8vLyBTRUFSQ0ggQVBJIEVORCAvLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8v7Iqk7YGs66GkIOuLpOyatOyLnCDtlajsiJgg7Iuk7ZaJ7ZWY6riwLlxudmFyIGdldE1vcmVTZWFyY2hSZXN1bHQgPSBmdW5jdGlvbihuZXh0UGFnZVRva2VuKXtcbiAgICAkKFwiLnNlYXJjaExpc3RcIikuc2Nyb2xsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoJCh0aGlzKS5zY3JvbGxUb3AoKSArICQodGhpcykuaW5uZXJIZWlnaHQoKSA+PSAkKHRoaXMpWzBdLnNjcm9sbEhlaWdodCkge1xuICAgICAgICAgICAgZm5HZXRMaXN0KG5leHRQYWdlVG9rZW4pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuXG5cbiAgICBcbi8vLy8vLy8vLy8vLyBTRUFSQ0ggUkVTVUxUIFZJRVcgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgc2VhcmNoUmVzdWx0VmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWFyY2hSZXN1bHRMaXN0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lU3BhY2UuamRhdGEuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdldFRlbXBsYXRlID0gJCgnI3NlYXJjaFZpZGVvJylbMF07IC8vdGVtcGxhdGUgcXVlcnlzZWxlY3RcbiAgICAgICAgdmFyIGdldEh0bWxUZW1wbGF0ZSA9IGdldFRlbXBsYXRlLmlubmVySFRNTDsgLy9nZXQgaHRtbCBpbiB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRhcHRUZW1wbGF0ZSA9IGdldEh0bWxUZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmwpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1RpdGxlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aXRsZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAucmVwbGFjZShcIntpZH1cIiwgaSk7XG4gICAgICAgIHNlYXJjaFJlc3VsdExpc3QgPSBzZWFyY2hSZXN1bHRMaXN0ICsgYWRhcHRUZW1wbGF0ZTtcbiAgICB9XG4gICAgJCgnLnNlYXJjaExpc3QnKS5lbXB0eSgpLmFwcGVuZChzZWFyY2hSZXN1bHRMaXN0KTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gU1RBUlQgLy8vLy8vLy8vLy8vLy8vL1xudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdICsgXCInP3JlbD0wICYgZW5hYmxlanNhcGk9MSBmcmFtZWJvcmRlcj0wIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIik7XG4gICAgfSk7XG59O1xuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gRU5EIC8vLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGFkZFBsYXlMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hWaWRlbyBsaSBidXR0b25cIikub24oXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUFBQVwiKTtcbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAvLyB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJCh0aGlzKSk7XG4gICAgfSk7XG59O1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBFTkQgLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cbi8vIC8vIExheW91dCDrs4Dqsr1cbi8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7XG4vLyAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbi8vIH0pO1xuXG4vLyByZXNpemVNYWluSGVpZ2h0KCk7XG4vLyBmdW5jdGlvbiByZXNpemVNYWluSGVpZ2h0KCl7XG4vLyAgIHZhciBoZWFkZXJIZWlnaHQgPSA1MDtcbi8vICAgdmFyIGF1ZGlvUGxheWVySGVpZ2h0ID0gODA7XG4vLyAgIHZhciBpbnB1dEJveEhlaWdodCA9IDQ1O1xuLy8gICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgKydweCc7XG4vLyAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkZXJIZWlnaHQgLSBhdWRpb1BsYXllckhlaWdodCAtIGlucHV0Qm94SGVpZ2h0ICsgJ3B4Jztcbi8vIH1cblxuXG5cbiJdfQ==
;