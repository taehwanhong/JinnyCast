;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
var nameSpace = {};
nameSpace.$getval = '';
nameSpace.getvideoId = [];
nameSpace.playList = [];


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

            $(jdata.items).each(function(i) {
                $(".searchList").append("<li class='box' id='" + i + "'>" + this.snippet.title + "<button id='" + i + "'type='button' onclick='addPlayList()'>add</button></li>"); //list보여주기
                nameSpace.getvideoId.push(jdata.items[i].id.videoId);
                // console.log(nameSpace.getvideoId);
            }).promise().done(function() {
                //Before, Next Page disabled
                // if (jdata.prevPageToken) {
                //     $("#nav_view").append("<ahref='javascript:fnGetList(\"" + jdata.prevPageToken + "\");'><이전페이지></a>");
                // }
                // if (jdata.nextPageToken) {
                //     $("#nav_view").append("<ahref='javascript:fnGetList(\"" + jdata.nextPageToken + "\");'><다음페이지></a>");
                // }
                $(".videoPlayer").append("<iframe src = https://www.youtube.com/embed/" + nameSpace.getvideoId[0] + "?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
                playVideoSelect();
            });
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
    // console.log(nameSpace.getvideoId);
}

var playVideoSelect = function() {
    $(".searchList").on("click", "li", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        // console.log(tagId);
        $(".videoPlayer").empty(); //player Dom초기화
        $(".videoPlayer").append("<iframe src = https://www.youtube.com/embed/" + nameSpace.getvideoId[tagId] + "?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
    });
}

var addPlayList = function() {
    $(".searchList li").on("click", "button", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        nameSpace.playList.push(nameSpace.getvideoId[tagId]);
        console.log(nameSpace.playList);
    });
}
},{}]},{},[1,2,3,4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvWW91dHViZXNlYXJjaC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXV0aC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvcGxheWVyLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOltudWxsLCJmdW5jdGlvbiBmbkdldExpc3Qoc0dldFRva2VuKSB7XG4gICAgdmFyICRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKCRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLrrZDsnoTrp4hcIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJChcIiNnZXRfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIjbmF2X3ZpZXdcIikuZW1wdHkoKTtcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlXCIgK1xuICAgICAgICBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCRnZXR2YWwpICsgXCIma2V5PUFJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZ1wiO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGpkYXRhKTtcblxuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zbmlwcGV0LmNoYW5uZWxJZCk7XG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhIGhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIitqZGF0YS5wcmV2UGFnZVRva2VuK1wiXFxcIik7Jz487J207KCE7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGEgaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiK2pkYXRhLm5leHRQYWdlVG9rZW4rXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59IiwiLy8vaWZyYW1lIHBsYXllclxuXG52YXIgZmlyc3RJRFxuICAgIC8vIDIuIFRoaXMgY29kZSBsb2FkcyB0aGUgSUZyYW1lIFBsYXllciBBUEkgY29kZSBhc3luY2hyb25vdXNseS5cbnZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbi8vIGNvbnNvbGUubG9nKGpkYXRhKTtcbnRhZy5zcmMgPSBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIjtcbnZhciBmaXJzdFNjcmlwdFRhZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbmZpcnN0U2NyaXB0VGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRhZywgZmlyc3RTY3JpcHRUYWcpO1xuXG4vLyAzLiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgYW4gPGlmcmFtZT4gKGFuZCBZb3VUdWJlIHBsYXllcilcbi8vICAgIGFmdGVyIHRoZSBBUEkgY29kZSBkb3dubG9hZHMuXG52YXIgcGxheWVyO1xuXG5mdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcbiAgICBwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCdwbGF5ZXInLCB7XG4gICAgICAgIGhlaWdodDogJzM2MCcsXG4gICAgICAgIHdpZHRoOiAnNjQwJyxcbiAgICAgICAgdmlkZW9JZDogJzhBMnRfdEFqTXo4JyxcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAnb25SZWFkeSc6IG9uUGxheWVyUmVhZHksXG4gICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IG9uUGxheWVyU3RhdGVDaGFuZ2VcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vLyA0LiBUaGUgQVBJIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHdoZW4gdGhlIHZpZGVvIHBsYXllciBpcyByZWFkeS5cbmZ1bmN0aW9uIG9uUGxheWVyUmVhZHkoZXZlbnQpIHtcbiAgICBldmVudC50YXJnZXQucGxheVZpZGVvKCk7XG59XG5cbi8vIDUuIFRoZSBBUEkgY2FsbHMgdGhpcyBmdW5jdGlvbiB3aGVuIHRoZSBwbGF5ZXIncyBzdGF0ZSBjaGFuZ2VzLlxuLy8gICAgVGhlIGZ1bmN0aW9uIGluZGljYXRlcyB0aGF0IHdoZW4gcGxheWluZyBhIHZpZGVvIChzdGF0ZT0xKSxcbi8vICAgIHRoZSBwbGF5ZXIgc2hvdWxkIHBsYXkgZm9yIHNpeCBzZWNvbmRzIGFuZCB0aGVuIHN0b3AuXG52YXIgZG9uZSA9IGZhbHNlO1xuXG5mdW5jdGlvbiBvblBsYXllclN0YXRlQ2hhbmdlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyAmJiAhZG9uZSkge1xuICAgICAgICBzZXRUaW1lb3V0KHN0b3BWaWRlbywgNjAwMDApO1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0b3BWaWRlbygpIHtcbiAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG59IiwidmFyIG5hbWVTcGFjZSA9IHt9O1xubmFtZVNwYWNlLiRnZXR2YWwgPSAnJztcbm5hbWVTcGFjZS5nZXR2aWRlb0lkID0gW107XG5uYW1lU3BhY2UucGxheUxpc3QgPSBbXTtcblxuXG52YXIgZm5HZXRMaXN0ID0gZnVuY3Rpb24oc0dldFRva2VuKSB7XG4gICAgbmFtZVNwYWNlLiRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKG5hbWVTcGFjZS4kZ2V0dmFsID09IFwiXCIpIHtcbiAgICAgICAgYWxlcnQgPT0gKFwi6rKA7IOJ7Ja07J6F66Cl67CU656N64uI64ukLlwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9DbGVhbnNpbmcgRG9tLCBWaWRlb0lkXG4gICAgbmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTsgLy9nZXR2aWRlb0lkIGFycmF57LSI6riw7ZmUXG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLmVtcHR5KCk7IC8v6rKA7IOJIOqysOqzvCBWaWV37LSI6riw7ZmUXG4gICAgLy8gJChcIi5uYXZfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcblxuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcblxuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgJChcIi5zZWFyY2hMaXN0XCIpLmFwcGVuZChcIjxsaSBjbGFzcz0nYm94JyBpZD0nXCIgKyBpICsgXCInPlwiICsgdGhpcy5zbmlwcGV0LnRpdGxlICsgXCI8YnV0dG9uIGlkPSdcIiArIGkgKyBcIid0eXBlPSdidXR0b24nIG9uY2xpY2s9J2FkZFBsYXlMaXN0KCknPmFkZDwvYnV0dG9uPjwvbGk+XCIpOyAvL2xpc3Trs7Tsl6zso7zquLBcbiAgICAgICAgICAgICAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZC5wdXNoKGpkYXRhLml0ZW1zW2ldLmlkLnZpZGVvSWQpO1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5nZXR2aWRlb0lkKTtcbiAgICAgICAgICAgIH0pLnByb21pc2UoKS5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vQmVmb3JlLCBOZXh0IFBhZ2UgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICAvLyBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgIC8vICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiICsgamRhdGEucHJldlBhZ2VUb2tlbiArIFwiXFxcIik7Jz487J207KCE7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIC8vIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGFocmVmPSdqYXZhc2NyaXB0OmZuR2V0TGlzdChcXFwiXCIgKyBqZGF0YS5uZXh0UGFnZVRva2VuICsgXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHNyYyA9IGh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIj9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgICAgICAgICAgICAgIHBsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5nZXR2aWRlb0lkKTtcbn1cblxudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRhZ0lkKTtcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHNyYyA9IGh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdICsgXCI/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICB9KTtcbn1cblxudmFyIGFkZFBsYXlMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hMaXN0IGxpXCIpLm9uKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIG5hbWVTcGFjZS5wbGF5TGlzdC5wdXNoKG5hbWVTcGFjZS5nZXR2aWRlb0lkW3RhZ0lkXSk7XG4gICAgICAgIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5wbGF5TGlzdCk7XG4gICAgfSk7XG59Il19
;