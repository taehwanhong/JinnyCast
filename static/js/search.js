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