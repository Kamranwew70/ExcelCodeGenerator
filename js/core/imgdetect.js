
var imgDetect = (function () {

    "use strict";

    var _gen_uuid = function() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }


    var _show = function(result, img_url){
        // 非0都是出错
        var error_sample = `
            {
              "desc": "Failed",
              "ret": "1"  
            }
        `

        var error_sample_server = `
            {
              "desc": "500 Backend Server Error. Request Failed",
              "ret": "-1"
            }
        `


        var RESPONSE_TEXT = ""
        var ISSUE_TYPE = "Unknown"
        var ALL_WORD_STR = ""
        if(result.ret == 0) {
            var data = result.data
            if(data.type == "Tech Support Scam") {
                RESPONSE_TEXT +=
                    chrome.i18n.getMessage("introduction") + "<br>" +
                    chrome.i18n.getMessage("detect_result_tech_support_scam") + "<br>" +
                    chrome.i18n.getMessage("offer_assistance")
            } else {
                RESPONSE_TEXT +=
                    chrome.i18n.getMessage("introduction") + "<br>" +
                    chrome.i18n.getMessage("detect_result_normal_reply", [data.kb_title, data.kb_link]) + "<br>" +
                    chrome.i18n.getMessage("offer_assistance")
            }

            ISSUE_TYPE = data.type

            var total_words = new Array()
            for (var window_idx in data.wording) {
                var cur_words = data.wording[window_idx]
                console.log(cur_words)
                total_words.push(...cur_words)
            }
            ALL_WORD_STR = total_words.join("<br>")
        } else if(result.ret == -1) {
            RESPONSE_TEXT += result.desc
        } else if(result.ret == 1) {
            RESPONSE_TEXT += chrome.i18n.getMessage("detect_result_no_kb_or_error")
        }

        var RESPONSE_TEXT_plaintxt = RESPONSE_TEXT
        while(RESPONSE_TEXT_plaintxt.indexOf("<br>") >= 0 ) {
            RESPONSE_TEXT_plaintxt = RESPONSE_TEXT_plaintxt.replace("<br>", "\n")
        }
        console.log("!!!" + RESPONSE_TEXT_plaintxt)

        var POSITION_LEFT = ($('body').width() / 2 - 310)
        var heading_suggested_response = chrome.i18n.getMessage("heading_suggested_response")
        var heading_detection_result = chrome.i18n.getMessage("heading_detection_result")

        var closeBtnImgUrl = chrome.extension.getURL("static/img/close.png");
        var dragBtnImgUrl = chrome.extension.getURL("static/img/move.png");

        var SEM_LINK =  "";
        var SEM_TITLE = data.sem_title;

        if(SEM_TITLE != "" && SEM_TITLE != undefined) {
            SEM_LINK = "<a href='" + data.sem_link + "' target='blank'>" + SEM_TITLE + "</a>"
        }

        var ERROR_CODE = data.errorcode_list
        if (ERROR_CODE != "" && ERROR_CODE.length > 0) {
            ERROR_CODE = ERROR_CODE.join(" , ")
        } else {
            ERROR_CODE = "";
        }


        var dialogStr =
        `<div id="dialogWindow" style="z-index: 999990; position: fixed; left: 0px; top: 0px; right: 0px; bottom: 0px;">
                <div style="position: fixed;left:0;top:0;right: 0;bottom: 0;background: #000;opacity: 0.5;">
                </div>
                <div style="position: relative;top: 200px;left: ${POSITION_LEFT}px;border:1px solid #000;background:#fff;width:620px;padding:15px;border-radius:5px 5px;box-shadow:2px 2px 5px #000;">
                    <div style="margin-top:-7px;margin-left:5px;height: 20px;cursor:move"; id="header">
                        <img src="${closeBtnImgUrl}" id="dialogClzBtn" style="float: right;height:16px;width:16px;cursor:pointer"></img>
                    </div>
                    <div style="border:1px solid;border-radius:5px; padding:5px;max-height:300px;overflow:scroll">
                        <div style="margin: 0 0 10px 0;font-weight: bold;text-decoration:underline">
                            ${heading_suggested_response}
                        </div>
                        <div style="min-height:80px; padding:5px">
                        ${RESPONSE_TEXT}
                        </div>
                        <textarea style="position: absolute; left: -2000px; top: -2000px" id="respTxt">${RESPONSE_TEXT}</textarea>
                    </div>
                    <div style="margin-top:5px;margin-left:5px">
                            <span id="dialogMsg" style="float: right;color:#f00;display:none;">
                                Copy success!
                            </span>
                            <button id="dialogCopyBtn">Copy</button>
                            <button id="dialogFeedBackBtn">FeedBack</button>
                        </div>
                    <div style="border:1px solid;border-radius:5px;margin-top:10px; padding: 5px;max-height:220px;overflow:scroll">
                        <div style="font-weight: bold;text-decoration:underline">
                            ${heading_detection_result}
                        </div>
                        <div>
                            <div style="margin-top: 20px">
                                <strong>Issue Type:</strong> ${ISSUE_TYPE}
                            </div>
                            <div>
                                <strong>Error Code:</strong> ${ERROR_CODE}
                            </div>
                            <div>
                                <strong>SEM Info:</strong> ${SEM_LINK}
                            </div>
                            <div style="margin-top: 5px">
                                <strong>Words:</strong>
                                ${ALL_WORD_STR}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
        var el = $('#dialogWindow');
        if(!el[0]){
            el = $(dialogStr).appendTo('body');

            el.draggable({ handle: "#header" });

            el.find('#dialogCopyBtn').click(function(e){
                e.preventDefault();

                el.find('textarea').select();
                document.execCommand('Copy');

                el.find('#dialogMsg').show().delay(2000).hide('slow');

                var uuid = localStorage.getItem("uuid")
                if(uuid == null) {
                    uuid = _gen_uuid()
                    console.log("Generate UUID:" + uuid)
                    localStorage.setItem("uuid", uuid)
                }
                // TODO: 后面还需要加上延时的值. 就是图片识别花了多少时间
                chrome.runtime.sendMessage({
                    "type" : "usage_feedback",
                    "data" : {
                        "action" : "click_button",
                        "value"  : {
                            "button" : "copy",
                            "kb_link" : data.kb_link,
                            "kb_title" : data.kb_title,
                            "img_url" : img_url
                        },
                        "uid" :  uuid
                    }
                }, function(){
                })
            });

            //feedback
            var feedback_result_combo = chrome.i18n.getMessage("feedback_result_combo")
            var feedback_result_combo_corrent = chrome.i18n.getMessage("feedback_result_combo_corrent")
            var feedback_result_combo_incorrent = chrome.i18n.getMessage("feedback_result_combo_incorrent")
            var feedback_result_combo_failed = chrome.i18n.getMessage("feedback_result_combo_failed")
            var feedback_result_combo_other = chrome.i18n.getMessage("feedback_result_combo_other")
            var feedback_category_combo = chrome.i18n.getMessage("feedback_category_combo")
            var feedback_category_combo_install_erro = chrome.i18n.getMessage("feedback_category_combo_install_erro")
            var feedback_category_combo_tss = chrome.i18n.getMessage("feedback_category_combo_tss")
            var feedback_category_combo_fakewarning = chrome.i18n.getMessage("feedback_category_combo_fakewarning")
            var feedback_category_combo_fakesecurity = chrome.i18n.getMessage("feedback_category_combo_fakesecurity")
            var feedback_category_combo_oneclickspam = chrome.i18n.getMessage("feedback_category_combo_oneclickspam")
            var feedback_category_combo_other = chrome.i18n.getMessage("feedback_category_combo_other")
            var feedback_category_combo_unknown = chrome.i18n.getMessage("feedback_category_combo_unknown")
            var feedback_sendfeedback_btn_text = chrome.i18n.getMessage("feedback_sendfeedback_btn_text")

            var feedBackDialogStr =
            `<div id="feedBackDialogWindow" style="z-index: 999999; position: fixed; left: 0px; top: 0px; right: 0px; bottom: 0px;">
                    <div style="position: fixed;left:0;top:0;right: 0;bottom: 0;background: #000;opacity: 0.5;">
                    </div>
                    <div style="position: relative;top: 250px;left: ${POSITION_LEFT + 100}px;border:1px solid #000;background:#fff;width:400px;padding:15px;border-radius:5px 5px;box-shadow:2px 2px 5px #000;">
                        <div style="margin-top:-7px;margin-left:5px;height: 20px;cursor:move"; id="header">
                            <img src="${closeBtnImgUrl}" id="feedbackDialogClzBtn" style="float: right;height:16px;width:16px;cursor:pointer"></img>
                            <span style="float: left;height:16px;width:46px;font-size:20px">  Feedback  </span>
                        </div>
                        <div style="margin-top:10px;margin-left:5px;">
                                <label name="inputImageURL" value="Image URL: ${img_url}" style="width: 170px;word-wrap:break-word;word-break:keep-all;">Image URL: ${img_url}</label>
                        </div>
                        <div style="margin-top:10px;padding:5px;max-height:300px;">
                            <span style="width :100px;">${feedback_result_combo}:</span>
                            <span style="float:right; margin-right: 50px;">
                                <select id="feedback_result_combo">
                                <option value ="${feedback_result_combo_corrent}">${feedback_result_combo_corrent}</option>
                                <option value ="${feedback_result_combo_incorrent}">${feedback_result_combo_incorrent}</option>
                                <option value="${feedback_result_combo_failed}" selected="selected">${feedback_result_combo_failed}</option>
                                <option value="${feedback_result_combo_other}">${feedback_result_combo_other}</option>
                                </select>
                            </span>
                        </div>
                        <div style="margin-top:10px;padding:5px;max-height:300px;">
                            <span style="width :100px;">${feedback_category_combo}:</span>
                            <span style="float:right; margin-right: 50px;">
                                <select id="feedback_category_combo">
                                <option value ="${feedback_category_combo_install_erro}">${feedback_category_combo_install_erro}</option>
                                <option value ="${feedback_category_combo_tss}">${feedback_category_combo_tss}</option>
                                <option value="${feedback_category_combo_fakewarning}">${feedback_category_combo_fakewarning}</option>
                                <option value="${feedback_category_combo_fakesecurity}">${feedback_category_combo_fakesecurity}</option>
                                <option value ="${feedback_category_combo_oneclickspam}">${feedback_category_combo_oneclickspam}</option>
                                <option value="${feedback_category_combo_other}">${feedback_category_combo_other}</option>
                                <option value="${feedback_category_combo_unknown}">${feedback_category_combo_unknown}</option>
                                </select>
                            </span>
                        </div>
                        <div style="margin-top:10px;margin-left:5px;">Comment:
                                <textarea style="height :70px; width :378px; max-height :200px; overflow :scroll; resize: none;" id="feedback_comment"></textarea>
                        </div> 
                        <div style="text-align:center;margin-top:5px;margin-left:5px ">
                                <button id="feedbackSendBtn">${feedback_sendfeedback_btn_text}</button>
                                <span id="FeedbackDialogMsg" style="float: right;color:#f00;display:none;">
                                
                                </span>
                        </div>
                    </div>
                </div>
            `
            el.find('#dialogFeedBackBtn').click(function(e){
                e.preventDefault();
                var feedDial = $('#feedBackDialogWindow');
                if(!feedDial[0]){
                    feedDial = $(feedBackDialogStr).appendTo('body');
                    feedDial.draggable({ handle: "#header" });
                    feedDial.find('#feedbackSendBtn').click(function(e){
                        e.preventDefault();
                        var result = $('#feedback_result_combo').val()
                        var category = $('#feedback_category_combo').val()
                        var comment = $('#feedback_comment').val()

                        var uuid = localStorage.getItem("uuid")
                        if(uuid == null) {
                            uuid = _gen_uuid()
                            console.log("Generate UUID:" + uuid)
                            localStorage.setItem("uuid", uuid)
                        }
                        chrome.runtime.sendMessage({
                            "type" : MSG_TYPE.POST_FEEDBACK,
                            "data" : {
                                //"imgurl" : request.img_url,
                                "result": result,
                                "category": category,
                                "comment": comment,
                                "uid" :  uuid
                            }
                        }, function(response){
                        })
                    })
                    feedDial.find('#feedbackDialogClzBtn').click(function(e){
                        e.preventDefault();
                        feedDial.hide('slow');
                    });
                    feedDial.show('slow').find('textarea')
                }else{
                    $('#feedBackDialogWindow').show('slow').find('textarea')
                }
            });
            el.find('#dialogClzBtn').click(function(e){
                e.preventDefault();
                el.hide('slow');
            });
        }

        el.show('slow').find('textarea').val(RESPONSE_TEXT_plaintxt);
    };

    var _init = function () {
        // 在tab创建或者更新时候，监听事件，看看是否有参数传递过来
        chrome.runtime.onMessage.addListener(function (request, sender, callback) {
            if (request.type == MSG_TYPE.IMG_DETECT) {
                _show(request.result, request.img_url);

                var uuid = localStorage.getItem("uuid")
                if(uuid == null) {
                    uuid = _gen_uuid()
                    console.log("Generate UUID:" + uuid)
                    localStorage.setItem("uuid", uuid)
                }

                chrome.runtime.sendMessage({
                    "type" : "usage_feedback",
                    "data" : {
                        "action" : MSG_TYPE.IMG_DETECT,
                        "value"  : {
                            "img_url" : request.img_url,
                            "result": request.result.data
                        },
                        "uid" :  uuid
                    }
                }, function(){
                })


            } else if(request.type == MSG_TYPE.POST_FEEDBACK){
                var feedDial = $('#feedBackDialogWindow');
                if(request.result == "fail"){
                    feedDial.find('#FeedbackDialogMsg').html("Submit failed")
                    feedDial.find('#FeedbackDialogMsg').show().delay(2000).hide('slow');
                }else if(request.result == "done"){
                    feedDial.find('#FeedbackDialogMsg').html("Success!")
                    feedDial.find('#FeedbackDialogMsg').show().delay(2000).hide('slow');
                    feedDial.hide('slow');
                }
            }
        });

    };

    return {
        init: _init
    };
})();

imgDetect.init();
