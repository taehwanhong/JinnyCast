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
let hPX = {
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
    searchListView.callAjax();
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
    const baseURL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&'
    const setting = {
        order: 'relevance',
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

/* ======== Main ====== */
function main(){
    json = JSON.parse(this.responseText);
    youtubeAPISearchResult.init();
    videoSearchListController.init();
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
       this.event();
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
    callAjax: function(){
        util.$(".goSearch").addEventListener('click', function(event) {
            util.$(".searchList").innerHTML = "";
            this.searchKeyword = encodeURIComponent(util.$("#search_box").value);
            sUrl = setTargetURL(this.searchKeyword);
            util.runAjax(sUrl, "load", main);
            return function(){
                videoSearchListController.setNextPageToken();
            };
        });
    },
    event: function(){
        nextPageTok = videoSearchListController.getNextPageToken();
        sUrl = setTargetURL(this.searchKeyword, nextPageTok);
        $(".searchList").scroll(function () {
            if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
                this.searchKeyword = encodeURIComponent(util.$("#search_box").value);
                util.runAjax(sUrl, "load", main);
            }
            return function(){
                videoSearchListController.setNextPageToken();
            };
        });   
    }
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXVkaW9QbGF5ZXIuanMiLCIvVXNlcnMvc3VqaW4vRGVza3RvcC9KaW5ueUNhc3Qvc3RhdGljL2pzL3NlYXJjaC0xLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIlxuXG4oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXVkaW9QbGF5ZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgLy8gUGxheWVyIHZhcnMhXG4gIHZhclxuICBkb2NUaXRsZSA9IGRvY3VtZW50LnRpdGxlLFxuICBwbGF5ZXIgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcCcpLFxuICBwbGF5ZXJDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudXNlclBsYXlsaXN0JyksXG4gIHBsYXlCdG4sXG4gIHBsYXlTdmcsXG4gIHBsYXlTdmdQYXRoLFxuICBwcmV2QnRuLFxuICBuZXh0QnRuLFxuICBwbEJ0bixcbiAgcmVwZWF0QnRuLFxuICB2b2x1bWVCdG4sXG4gIHByb2dyZXNzQmFyLFxuICBwcmVsb2FkQmFyLFxuICBjdXJUaW1lLFxuICBkdXJUaW1lLFxuICB0cmFja1RpdGxlLFxuICBhdWRpbyxcbiAgaW5kZXggPSAwLFxuICBwbGF5TGlzdCxcbiAgdm9sdW1lQmFyLFxuICB3aGVlbFZvbHVtZVZhbHVlID0gMCxcbiAgdm9sdW1lTGVuZ3RoLFxuICByZXBlYXRpbmcgPSBmYWxzZSxcbiAgc2Vla2luZyA9IGZhbHNlLFxuICBzZWVraW5nVm9sID0gZmFsc2UsXG4gIHJpZ2h0Q2xpY2sgPSBmYWxzZSxcbiAgYXBBY3RpdmUgPSBmYWxzZSxcbiAgLy8gcGxheWxpc3QgdmFyc1xuICBwbCxcbiAgcGxVbCxcbiAgcGxMaSxcbiAgdHBsTGlzdCA9XG4gICAgICAgICAgICAnPGxpIGNsYXNzPVwicGwtbGlzdFwiIGRhdGEtdHJhY2s9XCJ7Y291bnR9XCI+JytcbiAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJwbC1saXN0X190cmFja1wiPicrXG4gICAgICAgICAgICAgICAgJyA8YnV0dG9uIGNsYXNzPVwicGwtbGlzdF9fcGxheSBpY29uX2J0blwiPjxpIGNsYXNzPVwibGEgbGEtaGVhZHBob25lc1wiPjwvaT48L2J1dHRvbj4nK1xuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fZXFcIj4nK1xuICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJlcVwiPicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXFfX2JhclwiPjwvZGl2PicrXG4gICAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgICAnPC9kaXY+JytcbiAgICAgICAgICAgICAgJzwvZGl2PicrXG4gICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicGwtbGlzdF9fdGl0bGVcIj57dGl0bGV9PC9kaXY+JytcbiAgICAgICAgICAgICAgJzxidXR0b24gY2xhc3M9XCJwbC1saXN0X19yZW1vdmUgaWNvbl9idG5cIj4nK1xuICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cImxhIGxhLW1pbnVzLWNpcmNsZVwiPjwvaT4nK1xuICAgICAgICAgICAgICAnPC9idXR0b24+JytcbiAgICAgICAgICAgICc8L2xpPicsXG4gIC8vIHNldHRpbmdzXG4gIHNldHRpbmdzID0ge1xuICAgIHZvbHVtZSAgICAgICAgOiAwLjEsXG4gICAgY2hhbmdlRG9jVGl0bGU6IHRydWUsXG4gICAgY29uZmlybUNsb3NlICA6IHRydWUsXG4gICAgYXV0b1BsYXkgICAgICA6IGZhbHNlLFxuICAgIGJ1ZmZlcmVkICAgICAgOiB0cnVlLFxuICAgIG5vdGlmaWNhdGlvbiAgOiB0cnVlLFxuICAgIHBsYXlMaXN0ICAgICAgOiBbXVxuICB9O1xuXG4gIGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuXG4gICAgaWYoISgnY2xhc3NMaXN0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYoYXBBY3RpdmUgfHwgcGxheWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gJ1BsYXllciBhbHJlYWR5IGluaXQnO1xuICAgIH1cblxuICAgIHNldHRpbmdzID0gZXh0ZW5kKHNldHRpbmdzLCBvcHRpb25zKTtcblxuICAgIC8vIGdldCBwbGF5ZXIgZWxlbWVudHNcbiAgICBwbGF5QnRuICAgICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS10b2dnbGUnKTtcbiAgICBwbGF5U3ZnICAgICAgICA9IHBsYXlCdG4ucXVlcnlTZWxlY3RvcignLmljb24tcGxheScpO1xuICAgIHBsYXlTdmdQYXRoICAgID0gcGxheVN2Zy5xdWVyeVNlbGVjdG9yKCdwYXRoJyk7XG4gICAgcHJldkJ0biAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLmFwX19jb250cm9scy0tcHJldicpO1xuICAgIG5leHRCdG4gICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLW5leHQnKTtcbiAgICByZXBlYXRCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcuYXBfX2NvbnRyb2xzLS1yZXBlYXQnKTtcbiAgICB2b2x1bWVCdG4gICAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcudm9sdW1lLWJ0bicpO1xuICAgIHBsQnRuICAgICAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5hcF9fY29udHJvbHMtLXBsYXlsaXN0Jyk7XG4gICAgY3VyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1jdXJyZW50Jyk7XG4gICAgZHVyVGltZSAgICAgICAgPSBwbGF5ZXIucXVlcnlTZWxlY3RvcignLnRyYWNrX190aW1lLS1kdXJhdGlvbicpO1xuICAgIHRyYWNrVGl0bGUgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy50cmFja19fdGl0bGUnKTtcbiAgICBwcm9ncmVzc0JhciAgICA9IHBsYXllci5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfX2JhcicpO1xuICAgIHByZWxvYWRCYXIgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19fcHJlbG9hZCcpO1xuICAgIHZvbHVtZUJhciAgICAgID0gcGxheWVyLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWVfX2JhcicpO1xuXG4gICAgcGxheUxpc3QgPSBzZXR0aW5ncy5wbGF5TGlzdDtcblxuICAgIHBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG5cbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlckJhciwgZmFsc2UpO1xuICAgIHByb2dyZXNzQmFyLmNsb3Nlc3QoJy5wcm9ncmVzcy1jb250YWluZXInKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZWVrLCBmYWxzZSk7XG5cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHNlZWtpbmdGYWxzZSwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyVm9sLCBmYWxzZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBzZXRWb2x1bWUpO1xuICAgIHZvbHVtZUJhci5jbG9zZXN0KCcudm9sdW1lJykuYWRkRXZlbnRMaXN0ZW5lcih3aGVlbCgpLCBzZXRWb2x1bWUsIGZhbHNlKTtcblxuICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGFwQWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBwbGF5bGlzdFxuICAgIHJlbmRlclBMKCk7XG4gICAgcGxCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgLy8gQ3JlYXRlIGF1ZGlvIG9iamVjdFxuICAgIGF1ZGlvID0gbmV3IEF1ZGlvKCk7XG4gICAgYXVkaW8udm9sdW1lID0gc2V0dGluZ3Mudm9sdW1lO1xuICAgIGF1ZGlvLnByZWxvYWQgPSAnYXV0byc7XG5cbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCB0aW1lVXBkYXRlLCBmYWxzZSk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBkb0VuZCwgZmFsc2UpO1xuXG4gICAgdm9sdW1lQmFyLnN0eWxlLmhlaWdodCA9IGF1ZGlvLnZvbHVtZSAqIDEwMCArICclJztcbiAgICB2b2x1bWVMZW5ndGggPSB2b2x1bWVCYXIuY3NzKCdoZWlnaHQnKTtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgYmVmb3JlVW5sb2FkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIGlmKHNldHRpbmdzLmF1dG9QbGF5KSB7XG4gICAgICBhdWRpby5wbGF5KCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgbm90aWZ5KHBsYXlMaXN0W2luZGV4XS50aXRsZSwge1xuICAgICAgICBpY29uOiBwbGF5TGlzdFtpbmRleF0uaWNvbixcbiAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlRG9jdW1lbnRUaXRsZSh0aXRsZSkge1xuICAgIGlmKHNldHRpbmdzLmNoYW5nZURvY1RpdGxlKSB7XG4gICAgICBpZih0aXRsZSkge1xuICAgICAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jVGl0bGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlVW5sb2FkKGV2dCkge1xuICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gJ011c2ljIHN0aWxsIHBsYXlpbmcnO1xuICAgICAgZXZ0LnJldHVyblZhbHVlID0gbWVzc2FnZTtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVycm9ySGFuZGxlcihldnQpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBtZWRpYUVycm9yID0ge1xuICAgICAgJzEnOiAnTUVESUFfRVJSX0FCT1JURUQnLFxuICAgICAgJzInOiAnTUVESUFfRVJSX05FVFdPUksnLFxuICAgICAgJzMnOiAnTUVESUFfRVJSX0RFQ09ERScsXG4gICAgICAnNCc6ICdNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQnXG4gICAgfTtcbiAgICBhdWRpby5wYXVzZSgpO1xuICAgIGN1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBkdXJUaW1lLmlubmVySFRNTCA9ICctLSc7XG4gICAgcHJvZ3Jlc3NCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHByZWxvYWRCYXIuc3R5bGUud2lkdGggPSAwO1xuICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgcGxMaVtpbmRleF0gJiYgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0hvdXN0b24gd2UgaGF2ZSBhIHByb2JsZW06ICcgKyBtZWRpYUVycm9yW2V2dC50YXJnZXQuZXJyb3IuY29kZV0pO1xuICB9XG5cbi8qKlxuICogVVBEQVRFIFBMXG4gKi9cbiAgZnVuY3Rpb24gdXBkYXRlUEwoYWRkTGlzdCkge1xuICAgIGlmKCFhcEFjdGl2ZSkge1xuICAgICAgcmV0dXJuICdQbGF5ZXIgaXMgbm90IHlldCBpbml0aWFsaXplZCc7XG4gICAgfVxuICAgIGlmKCFBcnJheS5pc0FycmF5KGFkZExpc3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGFkZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNvdW50ID0gcGxheUxpc3QubGVuZ3RoO1xuICAgIHZhciBodG1sICA9IFtdO1xuICAgIHBsYXlMaXN0LnB1c2guYXBwbHkocGxheUxpc3QsIGFkZExpc3QpO1xuICAgIGFkZExpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBodG1sLnB1c2goXG4gICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGNvdW50KyspLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgKTtcbiAgICB9KTtcbiAgICAvLyBJZiBleGlzdCBlbXB0eSBtZXNzYWdlXG4gICAgaWYocGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5yZW1vdmVDaGlsZCggcGwucXVlcnlTZWxlY3RvcignLnBsLWxpc3QtLWVtcHR5JykgKTtcbiAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgfVxuICAgIC8vIEFkZCBzb25nIGludG8gcGxheWxpc3RcbiAgICBwbFVsLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlRW5kJywgaHRtbC5qb2luKCcnKSk7XG4gICAgcGxMaSA9IHBsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG4gIH1cblxuLyoqXG4gKiAgUGxheUxpc3QgbWV0aG9kc1xuICovXG4gICAgZnVuY3Rpb24gcmVuZGVyUEwoKSB7XG4gICAgICB2YXIgaHRtbCA9IFtdO1xuXG4gICAgICBwbGF5TGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGkpIHtcbiAgICAgICAgaHRtbC5wdXNoKFxuICAgICAgICAgIHRwbExpc3QucmVwbGFjZSgne2NvdW50fScsIGkpLnJlcGxhY2UoJ3t0aXRsZX0nLCBpdGVtLnRpdGxlKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIHBsID0gY3JlYXRlKCdkaXYnLCB7XG4gICAgICAgICdjbGFzc05hbWUnOiAncGwtY29udGFpbmVyJyxcbiAgICAgICAgJ2lkJzogJ3BsJyxcbiAgICAgICAgJ2lubmVySFRNTCc6ICc8dWwgY2xhc3M9XCJwbC11bFwiPicgKyAoIWlzRW1wdHlMaXN0KCkgPyBodG1sLmpvaW4oJycpIDogJzxsaSBjbGFzcz1cInBsLWxpc3QtLWVtcHR5XCI+UGxheUxpc3QgaXMgZW1wdHk8L2xpPicpICsgJzwvdWw+J1xuICAgICAgfSk7XG5cbiAgICAgIHBsYXllckNvbnRhaW5lci5pbnNlcnRCZWZvcmUocGwsIHBsYXllckNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgIHBsVWwgPSBwbC5xdWVyeVNlbGVjdG9yKCcucGwtdWwnKTtcbiAgICAgIHBsTGkgPSBwbFVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyk7XG5cbiAgICAgIHBsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0SGFuZGxlcihldnQpIHtcbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICBpZihldnQudGFyZ2V0Lm1hdGNoZXMoJy5wbC1saXN0X190aXRsZScpKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gcGFyc2VJbnQoZXZ0LnRhcmdldC5jbG9zZXN0KCcucGwtbGlzdCcpLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycpLCAxMCk7XG4gICAgICAgIGlmKGluZGV4ICE9PSBjdXJyZW50KSB7XG4gICAgICAgICAgaW5kZXggPSBjdXJyZW50O1xuICAgICAgICAgIHBsYXkoY3VycmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcGxheVRvZ2dsZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgICBpZighIWV2dC50YXJnZXQuY2xvc2VzdCgnLnBsLWxpc3RfX3JlbW92ZScpKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50RWwgPSBldnQudGFyZ2V0LmNsb3Nlc3QoJy5wbC1saXN0Jyk7XG4gICAgICAgICAgICB2YXIgaXNEZWwgPSBwYXJzZUludChwYXJlbnRFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhY2snKSwgMTApO1xuXG4gICAgICAgICAgICBwbGF5TGlzdC5zcGxpY2UoaXNEZWwsIDEpO1xuICAgICAgICAgICAgcGFyZW50RWwuY2xvc2VzdCgnLnBsLXVsJykucmVtb3ZlQ2hpbGQocGFyZW50RWwpO1xuXG4gICAgICAgICAgICBwbExpID0gcGwucXVlcnlTZWxlY3RvckFsbCgnbGknKTtcblxuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKHBsTGksIGZ1bmN0aW9uKGVsLCBpKSB7XG4gICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFjaycsIGkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmKCFhdWRpby5wYXVzZWQpIHtcblxuICAgICAgICAgICAgICBpZihpc0RlbCA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBwbGF5KGluZGV4KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgaWYoaXNFbXB0eUxpc3QoKSkge1xuICAgICAgICAgICAgICAgIGNsZWFyQWxsKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYoaXNEZWwgPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBpZihpc0RlbCA+IHBsYXlMaXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggLT0gMTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGF1ZGlvLnNyYyA9IHBsYXlMaXN0W2luZGV4XS5maWxlO1xuICAgICAgICAgICAgICAgICAgdHJhY2tUaXRsZS5pbm5lckhUTUwgPSBwbGF5TGlzdFtpbmRleF0udGl0bGU7XG4gICAgICAgICAgICAgICAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihpc0RlbCA8IGluZGV4KSB7XG4gICAgICAgICAgICAgIGluZGV4LS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGxBY3RpdmUoKSB7XG4gICAgICBpZihhdWRpby5wYXVzZWQpIHtcbiAgICAgICAgcGxMaVtpbmRleF0uY2xhc3NMaXN0LnJlbW92ZSgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudCA9IGluZGV4O1xuICAgICAgZm9yKHZhciBpID0gMCwgbGVuID0gcGxMaS5sZW5ndGg7IGxlbiA+IGk7IGkrKykge1xuICAgICAgICBwbExpW2ldLmNsYXNzTGlzdC5yZW1vdmUoJ3BsLWxpc3QtLWN1cnJlbnQnKTtcbiAgICAgIH1cbiAgICAgIHBsTGlbY3VycmVudF0uY2xhc3NMaXN0LmFkZCgncGwtbGlzdC0tY3VycmVudCcpO1xuICAgIH1cblxuXG4vKipcbiAqIFBsYXllciBtZXRob2RzXG4gKi9cbiAgZnVuY3Rpb24gcGxheShjdXJyZW50SW5kZXgpIHtcblxuICAgIGlmKGlzRW1wdHlMaXN0KCkpIHtcbiAgICAgIHJldHVybiBjbGVhckFsbCgpO1xuICAgIH1cblxuICAgIGluZGV4ID0gKGN1cnJlbnRJbmRleCArIHBsYXlMaXN0Lmxlbmd0aCkgJSBwbGF5TGlzdC5sZW5ndGg7XG5cbiAgICBhdWRpby5zcmMgPSBwbGF5TGlzdFtpbmRleF0uZmlsZTtcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9IHBsYXlMaXN0W2luZGV4XS50aXRsZTtcblxuICAgIC8vIENoYW5nZSBkb2N1bWVudCB0aXRsZVxuICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgIC8vIEF1ZGlvIHBsYXlcbiAgICBhdWRpby5wbGF5KCk7XG5cbiAgICAvLyBTaG93IG5vdGlmaWNhdGlvblxuICAgIG5vdGlmeShwbGF5TGlzdFtpbmRleF0udGl0bGUsIHtcbiAgICAgIGljb246IHBsYXlMaXN0W2luZGV4XS5pY29uLFxuICAgICAgYm9keTogJ05vdyBwbGF5aW5nJyxcbiAgICAgIHRhZzogJ211c2ljLXBsYXllcidcbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBwbGF5IGJ1dHRvblxuICAgIHBsYXlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtcGxheWluZycpO1xuICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuXG4gICAgLy8gU2V0IGFjdGl2ZSBzb25nIHBsYXlsaXN0XG4gICAgcGxBY3RpdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgcGxheShpbmRleCAtIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICBwbGF5KGluZGV4ICsgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5TGlzdCgpIHtcbiAgICByZXR1cm4gcGxheUxpc3QubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJBbGwoKSB7XG4gICAgYXVkaW8ucGF1c2UoKTtcbiAgICBhdWRpby5zcmMgPSAnJztcbiAgICB0cmFja1RpdGxlLmlubmVySFRNTCA9ICdxdWV1ZSBpcyBlbXB0eSc7XG4gICAgY3VyVGltZS5pbm5lckhUTUwgPSAnLS0nO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gJy0tJztcbiAgICBwcm9ncmVzc0Jhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcHJlbG9hZEJhci5zdHlsZS53aWR0aCA9IDA7XG4gICAgcGxheUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wbGF5aW5nJyk7XG4gICAgcGxheVN2Z1BhdGguc2V0QXR0cmlidXRlKCdkJywgcGxheVN2Zy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheScpKTtcbiAgICBpZighcGxVbC5xdWVyeVNlbGVjdG9yKCcucGwtbGlzdC0tZW1wdHknKSkge1xuICAgICAgcGxVbC5pbm5lckhUTUwgPSAnPGxpIGNsYXNzPVwicGwtbGlzdC0tZW1wdHlcIj5QbGF5TGlzdCBpcyBlbXB0eTwvbGk+JztcbiAgICB9XG4gICAgY2hhbmdlRG9jdW1lbnRUaXRsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGxheVRvZ2dsZSgpIHtcbiAgICBpZihpc0VtcHR5TGlzdCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGF1ZGlvLnBhdXNlZCkge1xuXG4gICAgICBpZihhdWRpby5jdXJyZW50VGltZSA9PT0gMCkge1xuICAgICAgICBub3RpZnkocGxheUxpc3RbaW5kZXhdLnRpdGxlLCB7XG4gICAgICAgICAgaWNvbjogcGxheUxpc3RbaW5kZXhdLmljb24sXG4gICAgICAgICAgYm9keTogJ05vdyBwbGF5aW5nJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUocGxheUxpc3RbaW5kZXhdLnRpdGxlKTtcblxuICAgICAgYXVkaW8ucGxheSgpO1xuXG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5hZGQoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBhdXNlJykpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNoYW5nZURvY3VtZW50VGl0bGUoKTtcbiAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICAgIHBsYXlTdmdQYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBsYXlTdmcuZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXknKSk7XG4gICAgfVxuICAgIHBsQWN0aXZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB2b2x1bWVUb2dnbGUoKSB7XG4gICAgaWYoYXVkaW8ubXV0ZWQpIHtcbiAgICAgIGlmKHBhcnNlSW50KHZvbHVtZUxlbmd0aCwgMTApID09PSAwKSB7XG4gICAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSBzZXR0aW5ncy52b2x1bWUgKiAxMDAgKyAnJSc7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHNldHRpbmdzLnZvbHVtZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gdm9sdW1lTGVuZ3RoO1xuICAgICAgfVxuICAgICAgYXVkaW8ubXV0ZWQgPSBmYWxzZTtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBhdWRpby5tdXRlZCA9IHRydWU7XG4gICAgICB2b2x1bWVCYXIuc3R5bGUuaGVpZ2h0ID0gMDtcbiAgICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QuYWRkKCdoYXMtbXV0ZWQnKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXBlYXRUb2dnbGUoKSB7XG4gICAgaWYocmVwZWF0QnRuLmNsYXNzTGlzdC5jb250YWlucygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHJlcGVhdGluZyA9IGZhbHNlO1xuICAgICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJlcGVhdGluZyA9IHRydWU7XG4gICAgICByZXBlYXRCdG4uY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGxUb2dnbGUoKSB7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnRvZ2dsZSgnaXMtYWN0aXZlJyk7XG4gICAgLy9wbC5jbGFzc0xpc3QudG9nZ2xlKCdoLXNob3cnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVVcGRhdGUoKSB7XG4gICAgaWYoYXVkaW8ucmVhZHlTdGF0ZSA9PT0gMCB8fCBzZWVraW5nKSByZXR1cm47XG5cbiAgICB2YXIgYmFybGVuZ3RoID0gTWF0aC5yb3VuZChhdWRpby5jdXJyZW50VGltZSAqICgxMDAgLyBhdWRpby5kdXJhdGlvbikpO1xuICAgIHByb2dyZXNzQmFyLnN0eWxlLndpZHRoID0gYmFybGVuZ3RoICsgJyUnO1xuXG4gICAgdmFyXG4gICAgY3VyTWlucyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLyA2MCksXG4gICAgY3VyU2VjcyA9IE1hdGguZmxvb3IoYXVkaW8uY3VycmVudFRpbWUgLSBjdXJNaW5zICogNjApLFxuICAgIG1pbnMgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC8gNjApLFxuICAgIHNlY3MgPSBNYXRoLmZsb29yKGF1ZGlvLmR1cmF0aW9uIC0gbWlucyAqIDYwKTtcbiAgICAoY3VyU2VjcyA8IDEwKSAmJiAoY3VyU2VjcyA9ICcwJyArIGN1clNlY3MpO1xuICAgIChzZWNzIDwgMTApICYmIChzZWNzID0gJzAnICsgc2Vjcyk7XG5cbiAgICBjdXJUaW1lLmlubmVySFRNTCA9IGN1ck1pbnMgKyAnOicgKyBjdXJTZWNzO1xuICAgIGR1clRpbWUuaW5uZXJIVE1MID0gbWlucyArICc6JyArIHNlY3M7XG5cbiAgICBpZihzZXR0aW5ncy5idWZmZXJlZCkge1xuICAgICAgdmFyIGJ1ZmZlcmVkID0gYXVkaW8uYnVmZmVyZWQ7XG4gICAgICBpZihidWZmZXJlZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IE1hdGgucm91bmQoMTAwICogYnVmZmVyZWQuZW5kKDApIC8gYXVkaW8uZHVyYXRpb24pO1xuICAgICAgICBwcmVsb2FkQmFyLnN0eWxlLndpZHRoID0gbG9hZGVkICsgJyUnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUT0RPIHNodWZmbGVcbiAgICovXG4gIGZ1bmN0aW9uIHNodWZmbGUoKSB7XG4gICAgaWYoc2h1ZmZsZSkge1xuICAgICAgaW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBwbGF5TGlzdC5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRvRW5kKCkge1xuICAgIGlmKGluZGV4ID09PSBwbGF5TGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICBpZighcmVwZWF0aW5nKSB7XG4gICAgICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgICAgIHBsQWN0aXZlKCk7XG4gICAgICAgIHBsYXlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGxheWluZycpO1xuICAgICAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGxheSgwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwbGF5KGluZGV4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbW92ZUJhcihldnQsIGVsLCBkaXIpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgaWYoZGlyID09PSAnaG9yaXpvbnRhbCcpIHtcbiAgICAgIHZhbHVlID0gTWF0aC5yb3VuZCggKChldnQuY2xpZW50WCAtIGVsLm9mZnNldCgpLmxlZnQpICsgd2luZG93LnBhZ2VYT2Zmc2V0KSAgKiAxMDAgLyBlbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoKTtcbiAgICAgIGVsLnN0eWxlLndpZHRoID0gdmFsdWUgKyAnJSc7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYoZXZ0LnR5cGUgPT09IHdoZWVsKCkpIHtcbiAgICAgICAgdmFsdWUgPSBwYXJzZUludCh2b2x1bWVMZW5ndGgsIDEwKTtcbiAgICAgICAgdmFyIGRlbHRhID0gZXZ0LmRlbHRhWSB8fCBldnQuZGV0YWlsIHx8IC1ldnQud2hlZWxEZWx0YTtcbiAgICAgICAgdmFsdWUgPSAoZGVsdGEgPiAwKSA/IHZhbHVlIC0gMTAgOiB2YWx1ZSArIDEwO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAoZWwub2Zmc2V0KCkudG9wICsgZWwub2Zmc2V0SGVpZ2h0KSAtIHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgdmFsdWUgPSBNYXRoLnJvdW5kKChvZmZzZXQgLSBldnQuY2xpZW50WSkpO1xuICAgICAgfVxuICAgICAgaWYodmFsdWUgPiAxMDApIHZhbHVlID0gd2hlZWxWb2x1bWVWYWx1ZSA9IDEwMDtcbiAgICAgIGlmKHZhbHVlIDwgMCkgdmFsdWUgPSB3aGVlbFZvbHVtZVZhbHVlID0gMDtcbiAgICAgIHZvbHVtZUJhci5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICclJztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyQmFyKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nID0gdHJ1ZTtcbiAgICAhcmlnaHRDbGljayAmJiBwcm9ncmVzc0Jhci5jbGFzc0xpc3QuYWRkKCdwcm9ncmVzc19fYmFyLS1hY3RpdmUnKTtcbiAgICBzZWVrKGV2dCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVyVm9sKGV2dCkge1xuICAgIHJpZ2h0Q2xpY2sgPSAoZXZ0LndoaWNoID09PSAzKSA/IHRydWUgOiBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gdHJ1ZTtcbiAgICBzZXRWb2x1bWUoZXZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWsoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYoc2Vla2luZyAmJiByaWdodENsaWNrID09PSBmYWxzZSAmJiBhdWRpby5yZWFkeVN0YXRlICE9PSAwKSB7XG4gICAgICB3aW5kb3cudmFsdWUgPSBtb3ZlQmFyKGV2dCwgcHJvZ3Jlc3NCYXIsICdob3Jpem9udGFsJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2Vla2luZ0ZhbHNlKCkge1xuICAgIGlmKHNlZWtpbmcgJiYgcmlnaHRDbGljayA9PT0gZmFsc2UgJiYgYXVkaW8ucmVhZHlTdGF0ZSAhPT0gMCkge1xuICAgICAgYXVkaW8uY3VycmVudFRpbWUgPSBhdWRpby5kdXJhdGlvbiAqICh3aW5kb3cudmFsdWUgLyAxMDApO1xuICAgICAgcHJvZ3Jlc3NCYXIuY2xhc3NMaXN0LnJlbW92ZSgncHJvZ3Jlc3NfX2Jhci0tYWN0aXZlJyk7XG4gICAgfVxuICAgIHNlZWtpbmcgPSBmYWxzZTtcbiAgICBzZWVraW5nVm9sID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRWb2x1bWUoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdm9sdW1lTGVuZ3RoID0gdm9sdW1lQmFyLmNzcygnaGVpZ2h0Jyk7XG4gICAgaWYoc2Vla2luZ1ZvbCAmJiByaWdodENsaWNrID09PSBmYWxzZSB8fCBldnQudHlwZSA9PT0gd2hlZWwoKSkge1xuICAgICAgdmFyIHZhbHVlID0gbW92ZUJhcihldnQsIHZvbHVtZUJhci5wYXJlbnROb2RlLCAndmVydGljYWwnKSAvIDEwMDtcbiAgICAgIGlmKHZhbHVlIDw9IDApIHtcbiAgICAgICAgYXVkaW8udm9sdW1lID0gMDtcbiAgICAgICAgYXVkaW8ubXV0ZWQgPSB0cnVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LmFkZCgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYoYXVkaW8ubXV0ZWQpIGF1ZGlvLm11dGVkID0gZmFsc2U7XG4gICAgICAgIGF1ZGlvLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB2b2x1bWVCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW11dGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KHRpdGxlLCBhdHRyKSB7XG4gICAgaWYoIXNldHRpbmdzLm5vdGlmaWNhdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZih3aW5kb3cuTm90aWZpY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXR0ci50YWcgPSAnQVAgbXVzaWMgcGxheWVyJztcbiAgICB3aW5kb3cuTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKGZ1bmN0aW9uKGFjY2Vzcykge1xuICAgICAgaWYoYWNjZXNzID09PSAnZ3JhbnRlZCcpIHtcbiAgICAgICAgdmFyIG5vdGljZSA9IG5ldyBOb3RpZmljYXRpb24odGl0bGUuc3Vic3RyKDAsIDExMCksIGF0dHIpO1xuICAgICAgICBzZXRUaW1lb3V0KG5vdGljZS5jbG9zZS5iaW5kKG5vdGljZSksIDUwMDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbi8qIERlc3Ryb3kgbWV0aG9kLiBDbGVhciBBbGwgKi9cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBpZighYXBBY3RpdmUpIHJldHVybjtcblxuICAgIGlmKHNldHRpbmdzLmNvbmZpcm1DbG9zZSkge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGJlZm9yZVVubG9hZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIHBsYXlCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbGF5VG9nZ2xlLCBmYWxzZSk7XG4gICAgdm9sdW1lQnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdm9sdW1lVG9nZ2xlLCBmYWxzZSk7XG4gICAgcmVwZWF0QnRuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVwZWF0VG9nZ2xlLCBmYWxzZSk7XG4gICAgcGxCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwbFRvZ2dsZSwgZmFsc2UpO1xuXG4gICAgcHJvZ3Jlc3NCYXIuY2xvc2VzdCgnLnByb2dyZXNzLWNvbnRhaW5lcicpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJCYXIsIGZhbHNlKTtcbiAgICBwcm9ncmVzc0Jhci5jbG9zZXN0KCcucHJvZ3Jlc3MtY29udGFpbmVyJykucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgc2VlaywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc2Vla2luZ0ZhbHNlLCBmYWxzZSk7XG5cbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGhhbmRsZXJWb2wsIGZhbHNlKTtcbiAgICB2b2x1bWVCYXIuY2xvc2VzdCgnLnZvbHVtZScpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHNldFZvbHVtZSk7XG4gICAgdm9sdW1lQmFyLmNsb3Nlc3QoJy52b2x1bWUnKS5yZW1vdmVFdmVudExpc3RlbmVyKHdoZWVsKCksIHNldFZvbHVtZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzZWVraW5nRmFsc2UsIGZhbHNlKTtcblxuICAgIHByZXZCdG4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBwcmV2LCBmYWxzZSk7XG4gICAgbmV4dEJ0bi5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIG5leHQsIGZhbHNlKTtcblxuICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHRpbWVVcGRhdGUsIGZhbHNlKTtcbiAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGRvRW5kLCBmYWxzZSk7XG5cbiAgICAvLyBQbGF5bGlzdFxuICAgIHBsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdEhhbmRsZXIsIGZhbHNlKTtcbiAgICBwbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHBsKTtcblxuICAgIGF1ZGlvLnBhdXNlKCk7XG4gICAgYXBBY3RpdmUgPSBmYWxzZTtcbiAgICBpbmRleCA9IDA7XG5cbiAgICBwbGF5QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXBsYXlpbmcnKTtcbiAgICBwbGF5U3ZnUGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwbGF5U3ZnLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5JykpO1xuICAgIHZvbHVtZUJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbSBiICAgICAgICB1dGVkJyk7XG4gICAgcGxCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJyk7XG4gICAgcmVwZWF0QnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuXG4gICAgLy8gUmVtb3ZlIHBsYXllciBmcm9tIHRoZSBET00gaWYgbmVjZXNzYXJ5XG4gICAgLy8gcGxheWVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocGxheWVyKTtcbiAgfVxuXG5cbi8qKlxuICogIEhlbHBlcnNcbiAqL1xuICBmdW5jdGlvbiB3aGVlbCgpIHtcbiAgICB2YXIgd2hlZWw7XG4gICAgaWYgKCdvbndoZWVsJyBpbiBkb2N1bWVudCkge1xuICAgICAgd2hlZWwgPSAnd2hlZWwnO1xuICAgIH0gZWxzZSBpZiAoJ29ubW91c2V3aGVlbCcgaW4gZG9jdW1lbnQpIHtcbiAgICAgIHdoZWVsID0gJ21vdXNld2hlZWwnO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGVlbCA9ICdNb3pNb3VzZVBpeGVsU2Nyb2xsJztcbiAgICB9XG4gICAgcmV0dXJuIHdoZWVsO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgZm9yKHZhciBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmKGRlZmF1bHRzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlZmF1bHRzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZShlbCwgYXR0cikge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbCk7XG4gICAgaWYoYXR0cikge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYoZWxlbWVudFtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZWxlbWVudFtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICBFbGVtZW50LnByb3RvdHlwZS5vZmZzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgIHNjcm9sbExlZnQgPSB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQsXG4gICAgc2Nyb2xsVG9wID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9wOiBlbC50b3AgKyBzY3JvbGxUb3AsXG4gICAgICBsZWZ0OiBlbC5sZWZ0ICsgc2Nyb2xsTGVmdFxuICAgIH07XG4gIH07XG5cbiAgRWxlbWVudC5wcm90b3R5cGUuY3NzID0gZnVuY3Rpb24oYXR0cikge1xuICAgIGlmKHR5cGVvZiBhdHRyID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUodGhpcywgJycpW2F0dHJdO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiBhdHRyID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yKHZhciBuYW1lIGluIGF0dHIpIHtcbiAgICAgICAgaWYodGhpcy5zdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5zdHlsZVtuYW1lXSA9IGF0dHJbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gbWF0Y2hlcyBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgPSBFbGVtZW50UHJvdG90eXBlLm1hdGNoZXMgfHxcbiAgICAgIEVsZW1lbnRQcm90b3R5cGUubWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMsIG5vZGVzID0gKG5vZGUucGFyZW50Tm9kZSB8fCBub2RlLmRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSwgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlIChub2Rlc1srK2ldICYmIG5vZGVzW2ldICE9IG5vZGUpO1xuICAgICAgICAgIHJldHVybiAhIW5vZGVzW2ldO1xuICAgICAgfTtcbiAgfShFbGVtZW50LnByb3RvdHlwZSk7XG5cbiAgLy8gY2xvc2VzdCBwb2x5ZmlsbFxuICB3aW5kb3cuRWxlbWVudCAmJiBmdW5jdGlvbihFbGVtZW50UHJvdG90eXBlKSB7XG4gICAgICBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgPSBFbGVtZW50UHJvdG90eXBlLmNsb3Nlc3QgfHxcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdmFyIGVsID0gdGhpcztcbiAgICAgICAgICB3aGlsZSAoZWwubWF0Y2hlcyAmJiAhZWwubWF0Y2hlcyhzZWxlY3RvcikpIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICByZXR1cm4gZWwubWF0Y2hlcyA/IGVsIDogbnVsbDtcbiAgICAgIH07XG4gIH0oRWxlbWVudC5wcm90b3R5cGUpO1xuXG4vKipcbiAqICBQdWJsaWMgbWV0aG9kc1xuICovXG4gIHJldHVybiB7XG4gICAgaW5pdDogaW5pdCxcbiAgICB1cGRhdGU6IHVwZGF0ZVBMLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgfTtcblxufSkoKTtcblxud2luZG93LkFQID0gQXVkaW9QbGF5ZXI7XG5cbn0pKHdpbmRvdyk7XG5cbi8vIFRFU1Q6IGltYWdlIGZvciB3ZWIgbm90aWZpY2F0aW9uc1xudmFyIGljb25JbWFnZSA9ICdodHRwOi8vZnVua3lpbWcuY29tL2kvMjFwWDUucG5nJztcblxuQVAuaW5pdCh7XG4gIHBsYXlMaXN0OiBbXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnVGhlIEJlc3Qgb2YgQmFjaCcsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9EcmVhbWVyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0Rpc3RyaWN0IEZvdXInLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvRGlzdHJpY3QlMjBGb3VyLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ0NocmlzdG1hcyBSYXAnLCAnZmlsZSc6ICdodHRwOi8vaW5jb21wZXRlY2guY29tL211c2ljL3JveWFsdHktZnJlZS9tcDMtcm95YWx0eWZyZWUvQ2hyaXN0bWFzJTIwUmFwLm1wMyd9LFxuICAgIHsnaWNvbic6IGljb25JbWFnZSwgJ3RpdGxlJzogJ1JvY2tldCBQb3dlcicsICdmaWxlJzogJ2h0dHA6Ly9pbmNvbXBldGVjaC5jb20vbXVzaWMvcm95YWx0eS1mcmVlL21wMy1yb3lhbHR5ZnJlZS9Sb2NrZXQlMjBQb3dlci5tcDMnfVxuICBdXG59KTtcblxuLy8gVEVTVDogdXBkYXRlIHBsYXlsaXN0XG4vL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhZGRTb25ncycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuLy8gIGUucHJldmVudERlZmF1bHQoKTtcbiAgQVAudXBkYXRlKFtcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdEaXN0cmljdCBGb3VyJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0Rpc3RyaWN0JTIwRm91ci5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdDaHJpc3RtYXMgUmFwJywgJ2ZpbGUnOiAnaHR0cDovL2luY29tcGV0ZWNoLmNvbS9tdXNpYy9yb3lhbHR5LWZyZWUvbXAzLXJveWFsdHlmcmVlL0NocmlzdG1hcyUyMFJhcC5tcDMnfSxcbiAgICB7J2ljb24nOiBpY29uSW1hZ2UsICd0aXRsZSc6ICdSb2NrZXQgUG93ZXInLCAnZmlsZSc6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PUFwYlpmbDdoSWNnJ30sXG4gICAgeydpY29uJzogaWNvbkltYWdlLCAndGl0bGUnOiAnUm9ja2V0IFBvd2VyJywgJ2ZpbGUnOiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1BcGJaZmw3aEljZyd9XG4gIF0pO1xuLy99KVxuXG4iLCIvKiAyMDE3LiAwMy4gXG5cbiovXG5cblxuLyogPT09PT09PSBSZXNwb25zaXZlIFdlYiA9PT09PT09ICovXG5sZXQgaFBYID0ge1xuICAgIGhlYWRlcjogNTAsXG4gICAgYXVkaW9QbGF5ZXIgOiA4MCxcbiAgICBpbnB1dEJveCA6IDQ1XG59XG5cbmNvbnN0IHJlc2l6ZU1haW5IZWlnaHQgPSBmdW5jdGlvbigpe1xuICB1dGlsLiQoXCIjbWFpblwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyICsncHgnO1xuICB1dGlsLiQoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoUFguaGVhZGVyIC0gaFBYLmF1ZGlvUGxheWVyIC0gaFBYLmlucHV0Qm94ICsgJ3B4Jztcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsZnVuY3Rpb24oKXtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgc2VhcmNoTGlzdFZpZXcuY2FsbEFqYXgoKTtcbiAgICByZXNpemVNYWluSGVpZ2h0KCk7XG59KTtcblxuXG4vKiA9PT09PT09IFV0aWxpdHkgPT09PT09PSAqL1xudmFyIHV0aWwgPSB7XG4gICAgcnVuQWpheCA6IGZ1bmN0aW9uKHVybCwgbGlzdGVuZXIsIHJlcUZ1bmMpe1xuICAgICAgICBsZXQgb1JlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICBvUmVxLmFkZEV2ZW50TGlzdGVuZXIobGlzdGVuZXIsIHJlcUZ1bmMpO1xuICAgICAgICBvUmVxLm9wZW4oXCJHRVRcIiwgdXJsKTtcbiAgICAgICAgb1JlcS5zZW5kKCk7XG4gICAgfSxcbiAgICAkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfSxcbiAgICAkJDogZnVuY3Rpb24oc2VsZWN0b3Ipe1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgfSxcbiAgICAvLyBnZXRDaGlsZE9yZGVyOiBmdW5jdGlvbihlbENoaWxkKSB7XG4gICAgLy8gICAgIGNvbnN0IGVsUGFyZW50ID0gZWxDaGlsZC5wYXJlbnROb2RlO1xuICAgIC8vICAgICBsZXQgbkluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChlbFBhcmVudC5jaGlsZHJlbiwgZWxDaGlsZCk7XG4gICAgLy8gICAgIHJldHVybiBuSW5kZXg7XG4gICAgLy8gfSxcbiAgICBnZXRPYmpWYWxMaXN0OiBmdW5jdGlvbihrZXksIG9iail7XG4gICAgICAgIHJldHVybiBvYmoubWFwKGZ1bmN0aW9uIChlbCkgeyByZXR1cm4gZWxba2V5XTsgfSk7XG4gICAgfSxcbn1cbi8qIFlvdXR1YmUgQVBJIFNldHRpbmcgKi9cbmNvbnN0IHNldFRhcmdldFVSTCA9IGZ1bmN0aW9uKGtleXdvcmQsIHNHZXRUb2tlbil7XG4gICAgY29uc3QgYmFzZVVSTCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmJ1xuICAgIGNvbnN0IHNldHRpbmcgPSB7XG4gICAgICAgIG9yZGVyOiAncmVsZXZhbmNlJyxcbiAgICAgICAgbWF4UmVzdWx0czogMTUsXG4gICAgICAgIHR5cGU6ICd2aWRlbycsXG4gICAgICAgIHE6IGtleXdvcmQsXG4gICAgICAgIGtleTogJ0FJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZydcbiAgICB9XG4gICAgbGV0IHNUYXJnZXRVUkwgPSBPYmplY3Qua2V5cyhzZXR0aW5nKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGspICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2V0dGluZ1trXSk7XG4gICAgfSkuam9pbignJicpXG4gICAgXG4gICAgc1RhcmdldFVSTCA9IGJhc2VVUkwgKyBzVGFyZ2V0VVJMO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVSTCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuICAgIHJldHVybiBzVGFyZ2V0VVJMO1xufVxuXG4vKiA9PT09PT09PSBNYWluID09PT09PSAqL1xuZnVuY3Rpb24gbWFpbigpe1xuICAgIGpzb24gPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmluaXQoKTtcbiAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLmluaXQoKTtcbn1cblxuXG4vKiA9PT09PT09IE1vZGVsID09PT09PT0gKi9cbmNvbnN0IHlvdXR1YmVBUElTZWFyY2hSZXN1bHQgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hbGxWaWRlb3MgPSBqc29uOyAvL+yymOydjCDroZzrlKnrkKDrloQg66qo65OgIOuNsOydtO2EsOulvCDqsIDsoLjsmLXri4jri6QuXG4gICAgfSxcbiAgICBzZWxlY3RlZFZpZGVvOiBudWxsLCAvL+yEoO2Dne2VnCDqsJJcbiAgICBuZXh0UGFnZVRva2VuTnVtZXI6IG51bGwgLy/ri6TsnYwg7Y6Y7J207KeAIO2GoO2BsCDqsJI7XG59O1xuXG5jb25zdCB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlYXJjaExpc3RWaWV3LmluaXQoKTtcbiAgICB9LFxuICAgIGdldEFsbFZpZGVvczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQuYWxsVmlkZW9zLml0ZW1zO1xuICAgIH0sXG4gICAgZ2V0TmV4dFBhZ2VUb2tlbjogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHlvdXR1YmVBUElTZWFyY2hSZXN1bHQubmV4dFBhZ2VUb2tlbk51bWVyO1xuICAgIH0sXG4gICAgc2V0TmV4dFBhZ2VUb2tlbjogZnVuY3Rpb24oKXtcbiAgICAgICAgeW91dHViZUFQSVNlYXJjaFJlc3VsdC5uZXh0UGFnZVRva2VuTnVtZXIgPSB5b3V0dWJlQVBJU2VhcmNoUmVzdWx0LmFsbFZpZGVvcy5uZXh0UGFnZVRva2VuO1xuICAgIH0sXG4gICAgZ2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oKXtcblxuICAgIH0sXG4gICAgc2V0U2VsZWN0ZWRWaWRlbzogZnVuY3Rpb24oKXtcbiAgICAgICAgXG4gICAgfVxufVxuXG5jb25zdCBzZWFyY2hMaXN0VmlldyA9IHtcbiAgIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgdGhpcy5jb250ZW50ID0gdXRpbC4kKFwiLnNlYXJjaExpc3RcIik7XG4gICAgICAgdGhpcy50ZW1wbGF0ZSA9IHV0aWwuJChcIiNzZWFyY2hWaWRlb1wiKS5pbm5lckhUTUw7XG4gICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICB0aGlzLmV2ZW50KCk7XG4gICB9LFxuICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgIHZpZGVvcyA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0QWxsVmlkZW9zKCk7XG4gICAgICAgbGV0IHNIVE1MID0gJyc7XG4gICAgICAgZm9yIChsZXQgaT0wOyBpIDwgdmlkZW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgIGxldCB2aWRlb0ltYWdlVXJsID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmw7XG4gICAgICAgICAgIGxldCB2aWRlb1RpdGxlID0gIHZpZGVvc1tpXS5zbmlwcGV0LnRpdGxlO1xuICAgICAgICAgICBsZXQgcHVibGlzaGVkQXQgPSB2aWRlb3NbaV0uc25pcHBldC5wdWJsaXNoZWRBdDtcbiAgICAgICAgICAgbGV0IHZpZGVvSWQgPSB2aWRlb3NbaV0uaWQudmlkZW9JZFxuICAgICAgICAgICBzRG9tID0gdGhpcy50ZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIHZpZGVvSW1hZ2VVcmwpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVGl0bGV9XCIsIHZpZGVvVGl0bGUpXG4gICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIHB1Ymxpc2hlZEF0KVxuICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb0lkfVwiLCB2aWRlb0lkKTtcbiAgICAgICAgICAgIHNIVE1MID0gc0hUTUwgKyBzRG9tO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29udGVudC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIHNIVE1MKTtcbiAgICB9LFxuICAgIGNhbGxBamF4OiBmdW5jdGlvbigpe1xuICAgICAgICB1dGlsLiQoXCIuZ29TZWFyY2hcIikuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdXRpbC4kKFwiLnNlYXJjaExpc3RcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoS2V5d29yZCA9IGVuY29kZVVSSUNvbXBvbmVudCh1dGlsLiQoXCIjc2VhcmNoX2JveFwiKS52YWx1ZSk7XG4gICAgICAgICAgICBzVXJsID0gc2V0VGFyZ2V0VVJMKHRoaXMuc2VhcmNoS2V5d29yZCk7XG4gICAgICAgICAgICB1dGlsLnJ1bkFqYXgoc1VybCwgXCJsb2FkXCIsIG1haW4pO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdmlkZW9TZWFyY2hMaXN0Q29udHJvbGxlci5zZXROZXh0UGFnZVRva2VuKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50OiBmdW5jdGlvbigpe1xuICAgICAgICBuZXh0UGFnZVRvayA9IHZpZGVvU2VhcmNoTGlzdENvbnRyb2xsZXIuZ2V0TmV4dFBhZ2VUb2tlbigpO1xuICAgICAgICBzVXJsID0gc2V0VGFyZ2V0VVJMKHRoaXMuc2VhcmNoS2V5d29yZCwgbmV4dFBhZ2VUb2spO1xuICAgICAgICAkKFwiLnNlYXJjaExpc3RcIikuc2Nyb2xsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKCQodGhpcykuc2Nyb2xsVG9wKCkgKyAkKHRoaXMpLmlubmVySGVpZ2h0KCkgPj0gJCh0aGlzKVswXS5zY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlYXJjaEtleXdvcmQgPSBlbmNvZGVVUklDb21wb25lbnQodXRpbC4kKFwiI3NlYXJjaF9ib3hcIikudmFsdWUpO1xuICAgICAgICAgICAgICAgIHV0aWwucnVuQWpheChzVXJsLCBcImxvYWRcIiwgbWFpbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB2aWRlb1NlYXJjaExpc3RDb250cm9sbGVyLnNldE5leHRQYWdlVG9rZW4oKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pOyAgIFxuICAgIH1cbn1cbiIsIi8vLy8vLy8vLy8vLy8gTkFNRSBTUEFDRSBTVEFSVCAvLy8vLy8vLy8vLy8vLy9cbnZhciBuYW1lU3BhY2UgPSB7fTtcbm5hbWVTcGFjZS4kZ2V0dmFsID0gJyc7XG5uYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdO1xubmFtZVNwYWNlLnBsYXlMaXN0ID0gW107XG5uYW1lU3BhY2UuamRhdGEgPSBbXTtcbm5hbWVTcGFjZS5hbGJ1bVN0b3JhZ2UgPSBsb2NhbFN0b3JhZ2U7XG4vLy8vLy8vLy8vLy8vIE5BTUUgU1BBQ0UgRU5EIC8vLy8vLy8vLy8vLy8vL1xuXG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBTVEFSVCAvLy8vLy8vLy8vLy9cbi8vZnVuY3Rpb25hbGl0eTEgOiBuYXZpZ2F0aW9uIGNvbnRyb2xcbnZhciBuYXYgPSBmdW5jdGlvbigpIHtcbiAgICAvL2dldCBlYWNoIGJ0biBpbiBuYXYgd2l0aCBkb20gZGVsZWdhdGlvbiB3aXRoIGpxdWVyeSBhbmQgZXZlbnQgcHJvcGFnYXRpb25cbiAgICAkKFwiLm5hdl9wYXJlbnRcIikub24oXCJjbGlja1wiLCBcImxpXCIsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vYnViYmxpbmcgcHJldmVudFxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zb2xlLmxvZyhjbGFzc05hbWUpO1xuICAgICAgICBpZiAoY2xhc3NOYW1lID09IFwiYWxidW1fYnRuXCIpIHtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBcInBvcHVsYXJfYnRuXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUE9QVUxBUi4uLi4uP1wiKTtcbiAgICAgICAgICAgICQoXCIuc2VhcmNoTGlzdFwiKS5oaWRlKCk7IC8v6rKA7IOJIOqysOqzvCBDbGVhclxuICAgICAgICAgICAgJChcIi5hZGROZXdNZWRpYVwiKS5oaWRlKCk7IC8v6rKA7IOJIOywvSBDbGVhclxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTRUFSQ0ggQlROISEhIVwiKVxuICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLnNob3coKTsgLy/qsoDsg4kg6rKw6rO8IENsZWFyXG4gICAgICAgICAgICAkKFwiLmFkZE5ld01lZGlhXCIpLnNob3coKTsgLy/qsoDsg4kg7LC9IENsZWFyXG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4vL0RFVk1PREUvLy8vLy8vLy8vLyBOQVYgY29udHJvbCBFTkQgLy8vLy8vLy8vLy8vXG5cbm5hdigpOyAvL25hdiDsi6Ttlolcbi8vLy8vLy8vLy8vLy8gU0VBUkNIIEFQSSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGZuR2V0TGlzdCA9IGZ1bmN0aW9uKHNHZXRUb2tlbikge1xuICAgIG5hbWVTcGFjZS4kZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmIChuYW1lU3BhY2UuJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuqygOyDieyWtOyeheugpeuwlOuejeuLiOuLpC5cIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vQ2xlYW5zaW5nIERvbSwgVmlkZW9JZFxuICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107IC8vZ2V0dmlkZW9JZCBhcnJheey0iOq4sO2ZlFxuICAgIC8vICQoXCIuc2VhcmNoTGlzdFwiKS5lbXB0eSgpOyAvL+qygOyDiSDqsrDqs7wgVmlld+y0iOq4sO2ZlFxuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgICAgICBjb25zb2xlLmxvZyhzVGFyZ2V0VXJsKTtcbiAgICB9XG5cbiAgICAkLmFqYXgoe1xuICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgdXJsOiBzVGFyZ2V0VXJsLFxuICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqZGF0YSkge1xuICAgICAgICAgICAgbmFtZVNwYWNlLmpkYXRhID0gamRhdGE7IC8vamRhdGEuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlYXJjaFJlc3VsdFZpZXcoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFjZS5nZXR2aWRlb0lkLnB1c2goamRhdGEuaXRlbXNbaV0uaWQudmlkZW9JZCk7IC8vbmFtZVNwYWNlLmdldHZpZGVvSWTsl5Ag6rKA7IOJ65CcIHZpZGVvSUQg67Cw7Je066GcIOy2lOqwgFxuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbMF0pO1xuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICAgICAgICAgICAgICAvL3BsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgZ2V0TW9yZVNlYXJjaFJlc3VsdChqZGF0YS5uZXh0UGFnZVRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuLy8vLy8vLy8vLy8vLyBTRUFSQ0ggQVBJIEVORCAvLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8v7Iqk7YGs66GkIOuLpOyatOyLnCDtlajsiJgg7Iuk7ZaJ7ZWY6riwLlxudmFyIGdldE1vcmVTZWFyY2hSZXN1bHQgPSBmdW5jdGlvbihuZXh0UGFnZVRva2VuKXtcbiAgICAkKFwiLnNlYXJjaExpc3RcIikuc2Nyb2xsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoJCh0aGlzKS5zY3JvbGxUb3AoKSArICQodGhpcykuaW5uZXJIZWlnaHQoKSA+PSAkKHRoaXMpWzBdLnNjcm9sbEhlaWdodCkge1xuICAgICAgICAgICAgZm5HZXRMaXN0KG5leHRQYWdlVG9rZW4pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuXG5cbiAgICBcbi8vLy8vLy8vLy8vLyBTRUFSQ0ggUkVTVUxUIFZJRVcgU1RBUlQgLy8vLy8vLy8vLy8vLy8vXG52YXIgc2VhcmNoUmVzdWx0VmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWFyY2hSZXN1bHRMaXN0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lU3BhY2UuamRhdGEuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdldFRlbXBsYXRlID0gJCgnI3NlYXJjaFZpZGVvJylbMF07IC8vdGVtcGxhdGUgcXVlcnlzZWxlY3RcbiAgICAgICAgdmFyIGdldEh0bWxUZW1wbGF0ZSA9IGdldFRlbXBsYXRlLmlubmVySFRNTDsgLy9nZXQgaHRtbCBpbiB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRhcHRUZW1wbGF0ZSA9IGdldEh0bWxUZW1wbGF0ZS5yZXBsYWNlKFwie3ZpZGVvSW1hZ2V9XCIsIG5hbWVTcGFjZS5qZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuZGVmYXVsdC51cmwpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1RpdGxlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aXRsZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKFwie3ZpZGVvVmlld3N9XCIsIFwiVEJEXCIpXG4gICAgICAgICAgICAucmVwbGFjZShcIntpZH1cIiwgaSk7XG4gICAgICAgIHNlYXJjaFJlc3VsdExpc3QgPSBzZWFyY2hSZXN1bHRMaXN0ICsgYWRhcHRUZW1wbGF0ZTtcbiAgICB9XG4gICAgJCgnLnNlYXJjaExpc3QnKS5lbXB0eSgpLmFwcGVuZChzZWFyY2hSZXN1bHRMaXN0KTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFNFQVJDSCBSRVNVTFQgVklFVyBFTkQgLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gU1RBUlQgLy8vLy8vLy8vLy8vLy8vL1xudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG4gICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdICsgXCInP3JlbD0wICYgZW5hYmxlanNhcGk9MSBmcmFtZWJvcmRlcj0wIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIik7XG4gICAgfSk7XG59O1xuLy8vLy8vLy8gUExBWSBTRUxFQ1QgVklERU8gRU5EIC8vLy8vLy8vLy8vLy8vLy9cblxuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBTVEFSVCAvLy8vLy8vLy8vLy8vLy8vL1xudmFyIGFkZFBsYXlMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hWaWRlbyBsaSBidXR0b25cIikub24oXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHsgLy8g6rKA7IOJ65CcIGxpc3QgY2xpY2vtlojsnYTqsr3smrAuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUFBQVwiKTtcbiAgICAgICAgdmFyIHRhZ0lkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAvLyB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJCh0aGlzKSk7XG4gICAgfSk7XG59O1xuLy9ERVZNT0RFLy8vLy8vLy8vLy8gQUREIFBMQVkgTElTVCBUTyBBTEJVTSBFTkQgLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5cbi8vIC8vIExheW91dCDrs4Dqsr1cbi8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLGZ1bmN0aW9uKCl7XG4vLyAgIHJlc2l6ZU1haW5IZWlnaHQoKTtcbi8vIH0pO1xuXG4vLyByZXNpemVNYWluSGVpZ2h0KCk7XG4vLyBmdW5jdGlvbiByZXNpemVNYWluSGVpZ2h0KCl7XG4vLyAgIHZhciBoZWFkZXJIZWlnaHQgPSA1MDtcbi8vICAgdmFyIGF1ZGlvUGxheWVySGVpZ2h0ID0gODA7XG4vLyAgIHZhciBpbnB1dEJveEhlaWdodCA9IDQ1O1xuLy8gICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gaGVhZGVySGVpZ2h0IC0gYXVkaW9QbGF5ZXJIZWlnaHQgKydweCc7XG4vLyAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2VhcmNoTGlzdFwiKS5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkZXJIZWlnaHQgLSBhdWRpb1BsYXllckhlaWdodCAtIGlucHV0Qm94SGVpZ2h0ICsgJ3B4Jztcbi8vIH1cblxuXG5cbiJdfQ==
;