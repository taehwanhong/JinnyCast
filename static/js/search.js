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