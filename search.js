var nameSpace = {

};

var firstID = '';
var $getval = '';
var getvideoId = [];


var fnGetList = function(sGetToken) {
    $getval = $("#search_box").val();
    if ($getval == "") {
        alert == ("검색어 입력바랍니다.");
        $("#search_box").focus();
        return;
    }

    //Dom setting
    $("#get_view").empty();
    $("#nav_view").empty();
    $("#player_view").empty();

    // query section //
    // 15개씩
    var sTargetUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=relevance&maxResults=15&type=video" + "&q=" + encodeURIComponent($getval) + "&key=AIzaSyDjBfDWFgQa6bdeLc1PAM8EoDAFB_CGYig";
    getvideoId = [];
    if (sGetToken) {
        sTargetUrl += "&pageToken=" + sGetToken;
    }

    $.ajax({
        type: "POST",
        url: sTargetUrl,
        dataType: "jsonp",
        success: function(jdata) {

            $(jdata.items).each(function(i) {
                $("#get_view").append("<p class='box'><a href=https://youtu.be/ " + this.id.videoId + ">" + this.snippet.title + "</a></p>"); //list 보여주기
                getvideoId.push(jdata.items[i].id.videoId);
                console.log(getvideoId);
            }).promise().done(function() {
                if (jdata.prevPageToken) {
                    $("#nav_view").append("<a href='javascript:fnGetList(\"" + jdata.prevPageToken + "\");'><이전페이지></a>");
                }

                if (jdata.nextPageToken) {
                    $("#nav_view").append("<a href='javascript:fnGetList(\"" + jdata.nextPageToken + "\");'><다음페이지></a>");
                }
                $("#player_view").append("<iframe src=https://www.youtube.com/embed/" + getvideoId[1] + "?rel=0&enablejsapi=1 frameborder=0 allowfullscreen></iframe>");
            });
        },
        error: function(xhr, textStatus) {
            console.log(xhr.responseText);
            alert("error");
            return;
        }
    });
}