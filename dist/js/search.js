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
/// Search API
function fnGetList(sGetToken) {
    var $getval = $("#search_box").val();
    if ($getval == "") {
        alert == ("뭐임마");
        $("#search_box").focus();
        return;
    }


    // clear //
    $("#get_view").empty();
    $("#nav_view").empty();
    $("#player").empty();


    // query section //
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
            // console.log(jdata.items[0].id.videoId);
            firstID = jdata.items[0].id.videoId;
            console.log(firstID);
            onYouTubeIframeAPIReady();
            $(jdata.items).each(function(i) {
                // console.log(this.snippet.channelId);
                $("#get_view").append("<p class='box'><a href='https://youtu.be/'" + this.id.videoId + ">" + this.snippet.title + "</a></p>"); //list 보여주기
            }).promise().done(function() {
                    if (jdata.prevPageToken) {
                        $("#nav_view").append("<a href='javascript:fnGetList(\"" + jdata.prevPageToken + "\");'><이전페이지></a>");
                    }
                    if (jdata.nextPageToken) {
                        $("#nav_view").append("<a href='javascript:fnGetList(\"" + jdata.nextPageToken + "\");'><다음페이지></a>");
                    }
                }

            );
            return jdata;
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
}
},{}]},{},[1,2,3,4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvWW91dHViZXNlYXJjaC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXV0aC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvcGxheWVyLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOltudWxsLCJmdW5jdGlvbiBmbkdldExpc3Qoc0dldFRva2VuKSB7XG4gICAgdmFyICRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKCRnZXR2YWwgPT0gXCJcIikge1xuICAgICAgICBhbGVydCA9PSAoXCLrrZDsnoTrp4hcIik7XG4gICAgICAgICQoXCIjc2VhcmNoX2JveFwiKS5mb2N1cygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJChcIiNnZXRfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIjbmF2X3ZpZXdcIikuZW1wdHkoKTtcblxuICAgIHZhciBzVGFyZ2V0VXJsID0gXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9wYXJ0PXNuaXBwZXQmb3JkZXI9cmVsZXZhbmNlXCIgK1xuICAgICAgICBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KCRnZXR2YWwpICsgXCIma2V5PUFJemFTeURqQmZEV0ZnUWE2YmRlTGMxUEFNOEVvREFGQl9DR1lpZ1wiO1xuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGpkYXRhKTtcblxuICAgICAgICAgICAgJChqZGF0YS5pdGVtcykuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zbmlwcGV0LmNoYW5uZWxJZCk7XG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhIGhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIitqZGF0YS5wcmV2UGFnZVRva2VuK1wiXFxcIik7Jz487J207KCE7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqZGF0YS5uZXh0UGFnZVRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjbmF2X3ZpZXdcIikuYXBwZW5kKFwiPGEgaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiK2pkYXRhLm5leHRQYWdlVG9rZW4rXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59IiwiLy8vaWZyYW1lIHBsYXllclxuXG52YXIgZmlyc3RJRFxuICAgIC8vIDIuIFRoaXMgY29kZSBsb2FkcyB0aGUgSUZyYW1lIFBsYXllciBBUEkgY29kZSBhc3luY2hyb25vdXNseS5cbnZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbi8vIGNvbnNvbGUubG9nKGpkYXRhKTtcbnRhZy5zcmMgPSBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIjtcbnZhciBmaXJzdFNjcmlwdFRhZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbmZpcnN0U2NyaXB0VGFnLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRhZywgZmlyc3RTY3JpcHRUYWcpO1xuXG4vLyAzLiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgYW4gPGlmcmFtZT4gKGFuZCBZb3VUdWJlIHBsYXllcilcbi8vICAgIGFmdGVyIHRoZSBBUEkgY29kZSBkb3dubG9hZHMuXG52YXIgcGxheWVyO1xuXG5mdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcbiAgICBwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCdwbGF5ZXInLCB7XG4gICAgICAgIGhlaWdodDogJzM2MCcsXG4gICAgICAgIHdpZHRoOiAnNjQwJyxcbiAgICAgICAgdmlkZW9JZDogJzhBMnRfdEFqTXo4JyxcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAnb25SZWFkeSc6IG9uUGxheWVyUmVhZHksXG4gICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IG9uUGxheWVyU3RhdGVDaGFuZ2VcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vLyA0LiBUaGUgQVBJIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uIHdoZW4gdGhlIHZpZGVvIHBsYXllciBpcyByZWFkeS5cbmZ1bmN0aW9uIG9uUGxheWVyUmVhZHkoZXZlbnQpIHtcbiAgICBldmVudC50YXJnZXQucGxheVZpZGVvKCk7XG59XG5cbi8vIDUuIFRoZSBBUEkgY2FsbHMgdGhpcyBmdW5jdGlvbiB3aGVuIHRoZSBwbGF5ZXIncyBzdGF0ZSBjaGFuZ2VzLlxuLy8gICAgVGhlIGZ1bmN0aW9uIGluZGljYXRlcyB0aGF0IHdoZW4gcGxheWluZyBhIHZpZGVvIChzdGF0ZT0xKSxcbi8vICAgIHRoZSBwbGF5ZXIgc2hvdWxkIHBsYXkgZm9yIHNpeCBzZWNvbmRzIGFuZCB0aGVuIHN0b3AuXG52YXIgZG9uZSA9IGZhbHNlO1xuXG5mdW5jdGlvbiBvblBsYXllclN0YXRlQ2hhbmdlKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmRhdGEgPT0gWVQuUGxheWVyU3RhdGUuUExBWUlORyAmJiAhZG9uZSkge1xuICAgICAgICBzZXRUaW1lb3V0KHN0b3BWaWRlbywgNjAwMDApO1xuICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0b3BWaWRlbygpIHtcbiAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG59IiwiLy8vIFNlYXJjaCBBUElcbmZ1bmN0aW9uIGZuR2V0TGlzdChzR2V0VG9rZW4pIHtcbiAgICB2YXIgJGdldHZhbCA9ICQoXCIjc2VhcmNoX2JveFwiKS52YWwoKTtcbiAgICBpZiAoJGdldHZhbCA9PSBcIlwiKSB7XG4gICAgICAgIGFsZXJ0ID09IChcIuutkOyehOuniFwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIGNsZWFyIC8vXG4gICAgJChcIiNnZXRfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIjbmF2X3ZpZXdcIikuZW1wdHkoKTtcbiAgICAkKFwiI3BsYXllclwiKS5lbXB0eSgpO1xuXG5cbiAgICAvLyBxdWVyeSBzZWN0aW9uIC8vXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2VcIiArXG4gICAgICAgIFwiJnE9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoJGdldHZhbCkgKyBcIiZrZXk9QUl6YVN5RGpCZkRXRmdRYTZiZGVMYzFQQU04RW9EQUZCX0NHWWlnXCI7XG4gICAgaWYgKHNHZXRUb2tlbikge1xuICAgICAgICBzVGFyZ2V0VXJsICs9IFwiJnBhZ2VUb2tlbj1cIiArIHNHZXRUb2tlbjtcbiAgICB9XG5cbiAgICAkLmFqYXgoe1xuICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgdXJsOiBzVGFyZ2V0VXJsLFxuICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihqZGF0YSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coamRhdGEuaXRlbXNbMF0uaWQudmlkZW9JZCk7XG4gICAgICAgICAgICBmaXJzdElEID0gamRhdGEuaXRlbXNbMF0uaWQudmlkZW9JZDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGZpcnN0SUQpO1xuICAgICAgICAgICAgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkoKTtcbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuc25pcHBldC5jaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgICQoXCIjZ2V0X3ZpZXdcIikuYXBwZW5kKFwiPHAgY2xhc3M9J2JveCc+PGEgaHJlZj0naHR0cHM6Ly95b3V0dS5iZS8nXCIgKyB0aGlzLmlkLnZpZGVvSWQgKyBcIj5cIiArIHRoaXMuc25pcHBldC50aXRsZSArIFwiPC9hPjwvcD5cIik7IC8vbGlzdCDrs7Tsl6zso7zquLBcbiAgICAgICAgICAgIH0pLnByb21pc2UoKS5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoamRhdGEucHJldlBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChcIiNuYXZfdmlld1wiKS5hcHBlbmQoXCI8YSBocmVmPSdqYXZhc2NyaXB0OmZuR2V0TGlzdChcXFwiXCIgKyBqZGF0YS5wcmV2UGFnZVRva2VuICsgXCJcXFwiKTsnPjzsnbTsoITtjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChcIiNuYXZfdmlld1wiKS5hcHBlbmQoXCI8YSBocmVmPSdqYXZhc2NyaXB0OmZuR2V0TGlzdChcXFwiXCIgKyBqZGF0YS5uZXh0UGFnZVRva2VuICsgXCJcXFwiKTsnPjzri6TsnYztjpjsnbTsp4A+PC9hPlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBqZGF0YTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBhbGVydChcImVycm9yXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59Il19
;