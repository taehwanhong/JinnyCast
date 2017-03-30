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
nameSpace.jdata = [];


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

                // $(".searchList").append("<li class='box' id='" + i + "'><img src='" + jdata.items[i].snippet.thumbnails.high.url + "' width = 20px>" + this.snippet.title + "<button id='" + i + "'type='button' onclick='addPlayList()'>add</button></li>"); //list보여주기
                nameSpace.getvideoId.push(jdata.items[i].id.videoId); //nameSpace.getvideoId에 검색된 videoID 배열로 추가
                // console.log(jdata.snippet.thumnail.default);
                console.log(jdata.items[i].snippet.thumbnails.high.url);
            }).promise().done(function() {
                //Before, Next Page disabled
                // if (jdata.prevPageToken) {
                //     $("#nav_view").append("<ahref='javascript:fnGetList(\"" + jdata.prevPageToken + "\");'><이전페이지></a>");
                // }
                // if (jdata.nextPageToken) {
                //     $("#nav_view").append("<ahref='javascript:fnGetList(\"" + jdata.nextPageToken + "\");'><다음페이지></a>");
                // }
                $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[0] + "?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
                playVideoSelect();
            });
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
}

var searchResultView = function() {
    var searchResultList = '';
    var getSearchListDOM = document.querySelector('.searchList');
    for (var i = 0; i < nameSpace.jdata.items.length; i++) {
        var getTemplate = document.querySelector('#searchVideo'); //template queryselect
        var getHtmlTemplate = getTemplate.innerHTML; //get html in template
        var adaptTemplate = getHtmlTemplate.replace("{videoImage}", nameSpace.jdata.items[i].snippet.thumbnails.high.url)
            .replace("{videoTitle}", nameSpace.jdata.items[i].snippet.title)
            .replace("{videoViews}", "TBD")
            .replace("{id}", i);

        searchResultList = searchResultList + adaptTemplate;
        console.log();
    }
    getSearchListDOM.innerHTML = searchResultList;
};
// $(".searchList").append("<li class='box' id='" + i + "'><img src='" + jdata.items[i].snippet.thumbnails.high.url + "' width = 20px>" + this.snippet.title + "<button id='" + i + "'type='button' onclick='addPlayList()'>add</button></li>"); //list보여주기




var playVideoSelect = function() {
    $(".searchList").on("click", "li", function() { // 검색된 list click했을경우.
        var tagId = $(this).attr('id');
        console.log(tagId);
        console.log(nameSpace.getvideoId[tagId]);
        $(".videoPlayer").empty(); //player Dom초기화
        $(".videoPlayer").append("<iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[tagId] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvWW91dHViZXNlYXJjaC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvYXV0aC5qcyIsIi9Vc2Vycy9zdWppbi9EZXNrdG9wL0ppbm55Q2FzdC9zdGF0aWMvanMvcGxheWVyLmpzIiwiL1VzZXJzL3N1amluL0Rlc2t0b3AvSmlubnlDYXN0L3N0YXRpYy9qcy9zZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbbnVsbCwiZnVuY3Rpb24gZm5HZXRMaXN0KHNHZXRUb2tlbikge1xuICAgIHZhciAkZ2V0dmFsID0gJChcIiNzZWFyY2hfYm94XCIpLnZhbCgpO1xuICAgIGlmICgkZ2V0dmFsID09IFwiXCIpIHtcbiAgICAgICAgYWxlcnQgPT0gKFwi662Q7J6E66eIXCIpO1xuICAgICAgICAkKFwiI3NlYXJjaF9ib3hcIikuZm9jdXMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgICQoXCIjZ2V0X3ZpZXdcIikuZW1wdHkoKTtcbiAgICAkKFwiI25hdl92aWV3XCIpLmVtcHR5KCk7XG5cbiAgICB2YXIgc1RhcmdldFVybCA9IFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/cGFydD1zbmlwcGV0Jm9yZGVyPXJlbGV2YW5jZVwiICtcbiAgICAgICAgXCImcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCgkZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcbiAgICBpZiAoc0dldFRva2VuKSB7XG4gICAgICAgIHNUYXJnZXRVcmwgKz0gXCImcGFnZVRva2VuPVwiICsgc0dldFRva2VuO1xuICAgIH1cblxuICAgICQuYWpheCh7XG4gICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICB1cmw6IHNUYXJnZXRVcmwsXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGpkYXRhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhqZGF0YSk7XG5cbiAgICAgICAgICAgICQoamRhdGEuaXRlbXMpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc25pcHBldC5jaGFubmVsSWQpO1xuICAgICAgICAgICAgfSkucHJvbWlzZSgpLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGpkYXRhLnByZXZQYWdlVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgJChcIiNuYXZfdmlld1wiKS5hcHBlbmQoXCI8YSBocmVmPSdqYXZhc2NyaXB0OmZuR2V0TGlzdChcXFwiXCIramRhdGEucHJldlBhZ2VUb2tlbitcIlxcXCIpOyc+POydtOyghO2OmOydtOyngD48L2E+XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhIGhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIitqZGF0YS5uZXh0UGFnZVRva2VuK1wiXFxcIik7Jz4864uk7J2M7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufSIsIi8vL2lmcmFtZSBwbGF5ZXJcblxudmFyIGZpcnN0SURcbiAgICAvLyAyLiBUaGlzIGNvZGUgbG9hZHMgdGhlIElGcmFtZSBQbGF5ZXIgQVBJIGNvZGUgYXN5bmNocm9ub3VzbHkuXG52YXIgdGFnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4vLyBjb25zb2xlLmxvZyhqZGF0YSk7XG50YWcuc3JjID0gXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpXCI7XG52YXIgZmlyc3RTY3JpcHRUYWcgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF07XG5maXJzdFNjcmlwdFRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0YWcsIGZpcnN0U2NyaXB0VGFnKTtcblxuLy8gMy4gVGhpcyBmdW5jdGlvbiBjcmVhdGVzIGFuIDxpZnJhbWU+IChhbmQgWW91VHViZSBwbGF5ZXIpXG4vLyAgICBhZnRlciB0aGUgQVBJIGNvZGUgZG93bmxvYWRzLlxudmFyIHBsYXllcjtcblxuZnVuY3Rpb24gb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkoKSB7XG4gICAgcGxheWVyID0gbmV3IFlULlBsYXllcigncGxheWVyJywge1xuICAgICAgICBoZWlnaHQ6ICczNjAnLFxuICAgICAgICB3aWR0aDogJzY0MCcsXG4gICAgICAgIHZpZGVvSWQ6ICc4QTJ0X3RBak16OCcsXG4gICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgJ29uUmVhZHknOiBvblBsYXllclJlYWR5LFxuICAgICAgICAgICAgJ29uU3RhdGVDaGFuZ2UnOiBvblBsYXllclN0YXRlQ2hhbmdlXG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuLy8gNC4gVGhlIEFQSSB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiB3aGVuIHRoZSB2aWRlbyBwbGF5ZXIgaXMgcmVhZHkuXG5mdW5jdGlvbiBvblBsYXllclJlYWR5KGV2ZW50KSB7XG4gICAgZXZlbnQudGFyZ2V0LnBsYXlWaWRlbygpO1xufVxuXG4vLyA1LiBUaGUgQVBJIGNhbGxzIHRoaXMgZnVuY3Rpb24gd2hlbiB0aGUgcGxheWVyJ3Mgc3RhdGUgY2hhbmdlcy5cbi8vICAgIFRoZSBmdW5jdGlvbiBpbmRpY2F0ZXMgdGhhdCB3aGVuIHBsYXlpbmcgYSB2aWRlbyAoc3RhdGU9MSksXG4vLyAgICB0aGUgcGxheWVyIHNob3VsZCBwbGF5IGZvciBzaXggc2Vjb25kcyBhbmQgdGhlbiBzdG9wLlxudmFyIGRvbmUgPSBmYWxzZTtcblxuZnVuY3Rpb24gb25QbGF5ZXJTdGF0ZUNoYW5nZShldmVudCkge1xuICAgIGlmIChldmVudC5kYXRhID09IFlULlBsYXllclN0YXRlLlBMQVlJTkcgJiYgIWRvbmUpIHtcbiAgICAgICAgc2V0VGltZW91dChzdG9wVmlkZW8sIDYwMDAwKTtcbiAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdG9wVmlkZW8oKSB7XG4gICAgcGxheWVyLnN0b3BWaWRlbygpO1xufSIsInZhciBuYW1lU3BhY2UgPSB7fTtcbm5hbWVTcGFjZS4kZ2V0dmFsID0gJyc7XG5uYW1lU3BhY2UuZ2V0dmlkZW9JZCA9IFtdO1xubmFtZVNwYWNlLnBsYXlMaXN0ID0gW107XG5uYW1lU3BhY2UuamRhdGEgPSBbXTtcblxuXG52YXIgZm5HZXRMaXN0ID0gZnVuY3Rpb24oc0dldFRva2VuKSB7XG4gICAgbmFtZVNwYWNlLiRnZXR2YWwgPSAkKFwiI3NlYXJjaF9ib3hcIikudmFsKCk7XG4gICAgaWYgKG5hbWVTcGFjZS4kZ2V0dmFsID09IFwiXCIpIHtcbiAgICAgICAgYWxlcnQgPT0gKFwi6rKA7IOJ7Ja07J6F66Cl67CU656N64uI64ukLlwiKTtcbiAgICAgICAgJChcIiNzZWFyY2hfYm94XCIpLmZvY3VzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9DbGVhbnNpbmcgRG9tLCBWaWRlb0lkXG4gICAgbmFtZVNwYWNlLmdldHZpZGVvSWQgPSBbXTsgLy9nZXR2aWRlb0lkIGFycmF57LSI6riw7ZmUXG4gICAgJChcIi5zZWFyY2hMaXN0XCIpLmVtcHR5KCk7IC8v6rKA7IOJIOqysOqzvCBWaWV37LSI6riw7ZmUXG4gICAgLy8gJChcIi5uYXZfdmlld1wiKS5lbXB0eSgpO1xuICAgICQoXCIudmlkZW9QbGF5ZXJcIikuZW1wdHkoKTsgLy9wbGF5ZXIgRG9t7LSI6riw7ZmUXG5cbiAgICAvL3F1ZXJ5c2VjdGlvbi8vXG4gICAgLy8xNeqwnOyUqVxuXG4gICAgdmFyIHNUYXJnZXRVcmwgPSBcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP3BhcnQ9c25pcHBldCZvcmRlcj1yZWxldmFuY2UmbWF4UmVzdWx0cz0xNSZ0eXBlPXZpZGVvXCIgKyBcIiZxPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWVTcGFjZS4kZ2V0dmFsKSArIFwiJmtleT1BSXphU3lEakJmRFdGZ1FhNmJkZUxjMVBBTThFb0RBRkJfQ0dZaWdcIjtcblxuICAgIGlmIChzR2V0VG9rZW4pIHtcbiAgICAgICAgc1RhcmdldFVybCArPSBcIiZwYWdlVG9rZW49XCIgKyBzR2V0VG9rZW47XG4gICAgfVxuXG4gICAgJC5hamF4KHtcbiAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIHVybDogc1RhcmdldFVybCxcbiAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oamRhdGEpIHtcblxuICAgICAgICAgICAgbmFtZVNwYWNlLmpkYXRhID0gamRhdGE7IC8vamRhdGEuXG4gICAgICAgICAgICBzZWFyY2hSZXN1bHRWaWV3KCk7XG4gICAgICAgICAgICAkKGpkYXRhLml0ZW1zKS5lYWNoKGZ1bmN0aW9uKGkpIHtcblxuICAgICAgICAgICAgICAgIC8vICQoXCIuc2VhcmNoTGlzdFwiKS5hcHBlbmQoXCI8bGkgY2xhc3M9J2JveCcgaWQ9J1wiICsgaSArIFwiJz48aW1nIHNyYz0nXCIgKyBqZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuaGlnaC51cmwgKyBcIicgd2lkdGggPSAyMHB4PlwiICsgdGhpcy5zbmlwcGV0LnRpdGxlICsgXCI8YnV0dG9uIGlkPSdcIiArIGkgKyBcIid0eXBlPSdidXR0b24nIG9uY2xpY2s9J2FkZFBsYXlMaXN0KCknPmFkZDwvYnV0dG9uPjwvbGk+XCIpOyAvL2xpc3Trs7Tsl6zso7zquLBcbiAgICAgICAgICAgICAgICBuYW1lU3BhY2UuZ2V0dmlkZW9JZC5wdXNoKGpkYXRhLml0ZW1zW2ldLmlkLnZpZGVvSWQpOyAvL25hbWVTcGFjZS5nZXR2aWRlb0lk7JeQIOqygOyDieuQnCB2aWRlb0lEIOuwsOyXtOuhnCDstpTqsIBcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhqZGF0YS5zbmlwcGV0LnRodW1uYWlsLmRlZmF1bHQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGh1bWJuYWlscy5oaWdoLnVybCk7XG4gICAgICAgICAgICB9KS5wcm9taXNlKCkuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL0JlZm9yZSwgTmV4dCBQYWdlIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgLy8gaWYgKGpkYXRhLnByZXZQYWdlVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgJChcIiNuYXZfdmlld1wiKS5hcHBlbmQoXCI8YWhyZWY9J2phdmFzY3JpcHQ6Zm5HZXRMaXN0KFxcXCJcIiArIGpkYXRhLnByZXZQYWdlVG9rZW4gKyBcIlxcXCIpOyc+POydtOyghO2OmOydtOyngD48L2E+XCIpO1xuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAvLyBpZiAoamRhdGEubmV4dFBhZ2VUb2tlbikge1xuICAgICAgICAgICAgICAgIC8vICAgICAkKFwiI25hdl92aWV3XCIpLmFwcGVuZChcIjxhaHJlZj0namF2YXNjcmlwdDpmbkdldExpc3QoXFxcIlwiICsgamRhdGEubmV4dFBhZ2VUb2tlbiArIFwiXFxcIik7Jz4864uk7J2M7Y6Y7J207KeAPjwvYT5cIik7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgICQoXCIudmlkZW9QbGF5ZXJcIikuYXBwZW5kKFwiPGlmcmFtZSB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBzcmM9J2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL1wiICsgbmFtZVNwYWNlLmdldHZpZGVvSWRbMF0gKyBcIj9yZWw9MCAmIGVuYWJsZWpzYXBpPTEgZnJhbWVib3JkZXI9MCBhbGxvd2Z1bGxzY3JlZW4+PC9pZnJhbWU+XCIpO1xuICAgICAgICAgICAgICAgIHBsYXlWaWRlb1NlbGVjdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgYWxlcnQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG52YXIgc2VhcmNoUmVzdWx0VmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWFyY2hSZXN1bHRMaXN0ID0gJyc7XG4gICAgdmFyIGdldFNlYXJjaExpc3RET00gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2VhcmNoTGlzdCcpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBnZXRUZW1wbGF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWFyY2hWaWRlbycpOyAvL3RlbXBsYXRlIHF1ZXJ5c2VsZWN0XG4gICAgICAgIHZhciBnZXRIdG1sVGVtcGxhdGUgPSBnZXRUZW1wbGF0ZS5pbm5lckhUTUw7IC8vZ2V0IGh0bWwgaW4gdGVtcGxhdGVcbiAgICAgICAgdmFyIGFkYXB0VGVtcGxhdGUgPSBnZXRIdG1sVGVtcGxhdGUucmVwbGFjZShcInt2aWRlb0ltYWdlfVwiLCBuYW1lU3BhY2UuamRhdGEuaXRlbXNbaV0uc25pcHBldC50aHVtYm5haWxzLmhpZ2gudXJsKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7dmlkZW9UaXRsZX1cIiwgbmFtZVNwYWNlLmpkYXRhLml0ZW1zW2ldLnNuaXBwZXQudGl0bGUpXG4gICAgICAgICAgICAucmVwbGFjZShcInt2aWRlb1ZpZXdzfVwiLCBcIlRCRFwiKVxuICAgICAgICAgICAgLnJlcGxhY2UoXCJ7aWR9XCIsIGkpO1xuXG4gICAgICAgIHNlYXJjaFJlc3VsdExpc3QgPSBzZWFyY2hSZXN1bHRMaXN0ICsgYWRhcHRUZW1wbGF0ZTtcbiAgICAgICAgY29uc29sZS5sb2coKTtcbiAgICB9XG4gICAgZ2V0U2VhcmNoTGlzdERPTS5pbm5lckhUTUwgPSBzZWFyY2hSZXN1bHRMaXN0O1xufTtcbi8vICQoXCIuc2VhcmNoTGlzdFwiKS5hcHBlbmQoXCI8bGkgY2xhc3M9J2JveCcgaWQ9J1wiICsgaSArIFwiJz48aW1nIHNyYz0nXCIgKyBqZGF0YS5pdGVtc1tpXS5zbmlwcGV0LnRodW1ibmFpbHMuaGlnaC51cmwgKyBcIicgd2lkdGggPSAyMHB4PlwiICsgdGhpcy5zbmlwcGV0LnRpdGxlICsgXCI8YnV0dG9uIGlkPSdcIiArIGkgKyBcIid0eXBlPSdidXR0b24nIG9uY2xpY2s9J2FkZFBsYXlMaXN0KCknPmFkZDwvYnV0dG9uPjwvbGk+XCIpOyAvL2xpc3Trs7Tsl6zso7zquLBcblxuXG5cblxudmFyIHBsYXlWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICQoXCIuc2VhcmNoTGlzdFwiKS5vbihcImNsaWNrXCIsIFwibGlcIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHRhZ0lkKTtcbiAgICAgICAgY29uc29sZS5sb2cobmFtZVNwYWNlLmdldHZpZGVvSWRbdGFnSWRdKTtcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5lbXB0eSgpOyAvL3BsYXllciBEb23stIjquLDtmZRcbiAgICAgICAgJChcIi52aWRlb1BsYXllclwiKS5hcHBlbmQoXCI8aWZyYW1lIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIHNyYz0naHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvXCIgKyBuYW1lU3BhY2UuZ2V0dmlkZW9JZFt0YWdJZF0gKyBcIic/cmVsPTAgJiBlbmFibGVqc2FwaT0xIGZyYW1lYm9yZGVyPTAgYWxsb3dmdWxsc2NyZWVuPjwvaWZyYW1lPlwiKTtcbiAgICB9KTtcbn1cblxudmFyIGFkZFBsYXlMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgJChcIi5zZWFyY2hMaXN0IGxpXCIpLm9uKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7IC8vIOqygOyDieuQnCBsaXN0IGNsaWNr7ZaI7J2E6rK97JqwLlxuICAgICAgICB2YXIgdGFnSWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgIG5hbWVTcGFjZS5wbGF5TGlzdC5wdXNoKG5hbWVTcGFjZS5nZXR2aWRlb0lkW3RhZ0lkXSk7XG4gICAgICAgIGNvbnNvbGUubG9nKG5hbWVTcGFjZS5wbGF5TGlzdCk7XG4gICAgfSk7XG59Il19
;