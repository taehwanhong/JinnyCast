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
 