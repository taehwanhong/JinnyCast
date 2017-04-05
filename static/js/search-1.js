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
    console.log(sTargetURL);
    return sTargetURL;
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
       //this.preview();
       this.moreResult();
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
            this.searchKeyword = util.$("#search_box").value;
            sUrl = setTargetURL(this.searchKeyword);
            util.runAjax(sUrl, "load", main);
            return function(){
                
                videoSearchListController.setNextPageToken();

                this.moreResult();
            }
        });
    },
    moreResult: function(){
        // videoSearchListController.setNextPageToken();
        nextPageTok = videoSearchListController.getNextPageToken();
        this.searchKeyword = util.$("#search_box").value;
        sUrl = setTargetURL(this.searchKeyword, nextPageTok);
        
        $(".searchList").scroll(function () {
            if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
                util.runAjax(sUrl, "load", main);
            }
            return function(){
                
            };
        });   
    },
    // preview: function(){
    //     util.$(".searchList").addEventListener('click', function(evt) {
    //        target = evt.target;
    //        if (!element.classList.contains("videoName")){ target = target.parentNode; }
    //        console.log(target);
    //     });
    // }
    // <iframe width='100%' height='100%' src='https://www.youtube.com/embed/" + nameSpace.getvideoId[0] + "'?rel=0 & enablejsapi=1 frameborder=0 allowfullscreen></iframe>"
}

/* ======== Main ====== */
function main(){
    json = JSON.parse(this.responseText);
    youtubeAPISearchResult.init();
    videoSearchListController.init();
    // searchListView.moreResult();
}