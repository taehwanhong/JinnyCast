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