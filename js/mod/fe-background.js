/**
 * FE-Helper后台运行程序
 * @author zhaoxianlie@baidu.com
 */

var BgPageInstance = (function () {

    var lastImgUrl = "__UNDEFINED__";

    // debug cache，主要记录每个tab的ajax debug 开关
    var ajaxDbgCache = {};

    //各种元素的就绪情况
    var _readyState = {
        css: false,
        js: false,
        html: true,
        allDone: false
    };


    //侦测就绪情况
    var _detectReadyState = function (callback) {
        if (_readyState.css && _readyState.js && _readyState.html) {
            _readyState.allDone = true;
        }
        if (_readyState.allDone && typeof callback == 'function') {
            callback();
        }
    };





    /**
     * 根据给定参数，运行对应的Helper
     */
    var _runHelper = function (config) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            var tab = tabs[0];
            // 如果是采用独立文件方式访问，直接打开该页面即可
            if (config.useFile == '1') {
                var content = config.msgType == MSG_TYPE.QR_CODE ? tab.url : '';
                _openFileAndRun(tab, config.msgType, content);
            } else {
                switch (config.msgType) {
                    //fcphelper检测
                    case MSG_TYPE.FCP_HELPER_DETECT:
                        _doFcpDetect(tab);
                        break;
                    //查看网页加载时间
                    case MSG_TYPE.SHOW_PAGE_LOAD_TIME:
                        _getPageWpoInfo();
                        break;
                    //代码压缩
                    case MSG_TYPE.CODE_COMPRESS:
                        _goCompressTool();
                        break;
                    //Ajax调试
                    case MSG_TYPE.AJAX_DEBUGGER:
                        _debuggerSwitchOn();
                        break;
                    default :
                        break;
                }
            }
        });
    };

    /**
     * 创建扩展专属的右键菜单
     */
    var _createContextMenu = function () {
        _removeContextMenu();
        baidu.contextMenuId = chrome.contextMenus.create({
            title: chrome.i18n.getMessage("right_click_menu_msg"),
            contexts: ['image'],
            onclick: function (info, tab) {
                _detectImage(info,tab);
            }
        });

    };

    /**
     * 移除扩展专属的右键菜单
     */
    var _removeContextMenu = function () {
        if (!baidu.contextMenuId) return;
        chrome.contextMenus.remove(baidu.contextMenuId);
        baidu.contextMenuId = null;
    };

    /**
     * 创建或移除扩展专属的右键菜单
     */
    var _createOrRemoveContextMenu = function () {
        _createContextMenu();
        // //管理右键菜单
        // if (baidu.feOption.getOptionItem('opt_item_contextMenus') !== 'false') {
        //     _createContextMenu();
        // } else {
        //     _removeContextMenu();
        // }
    };


    var _feedback = function(uid, action, value, remarks) {
        var manifestData = chrome.runtime.getManifest();
        var current_version = manifestData.version;
        var value2 = {}
        value2.img_url = value.img_url
        value2.result = JSON.stringify(value.result)
        value2.run_env = value.run_env
        $.ajax({
            url: "http://skyaid-data-collector.skyaid-api.trendmicro.org/data/user/event",
            type: "POST",
            data: JSON.stringify({
                "app_id": "screenshot_issue_detector",
                "app_name": "screenshot_issue_detector",
                "app_version": current_version,
                "user_id": uid,
                "event_action": action,
                "event_value": value2,
                "event_remarks": remarks
            }),
            dataType: "json",
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            processData: false
        }).done(function(msg) {
            return {"ret" : "done"}

        }).fail(function(jqXHR, textStatus) {
            return {"ret" : "failed"}
        });
    }

    var _detectImage = function(info,tab){

		console.log("info.srcUrl:" + info.srcUrl)
        lastImgUrl = ""
        lastImgUrl += info.srcUrl
        $.ajax({
			url: "http://image-issue-detector-shadow.skyaid-service.trendmicro.org/detectimg",
			type: "POST",
            data: {"url":lastImgUrl},
            dataType: "json",
            cache: false//,
            //contentType: 'application/json; charset=UTF-8',
            //processData: false
		}).done(function(msg) {
            //alert(msg)
		    // 把处理逻辑放到content script部分
            chrome.tabs.sendMessage(tab.id, {
                type: MSG_TYPE.IMG_DETECT,
                result: msg,
                "img_url" : info.srcUrl
            });

        }).fail(function(jqXHR, textStatus) {
            //alert("error")
            chrome.tabs.sendMessage(tab.id, {
                type: MSG_TYPE.IMG_DETECT,
                result: {
                  "desc": "500 Backend Server Error. Request Failed.",
                  "ret": "-1"
                }
            });
        });
    };


    function _postFeedback(result,category,comment,uid,remarks) {
        var retvalue = ""
        var manifestData = chrome.runtime.getManifest();
        var current_version = manifestData.version;
        action = 'feedback'
        event_value = {}
        event_value.result = result
        event_value.category = category
        event_value.comment = comment
        $.ajax({
            url: "http://skyaid-data-collector.skyaid-api.trendmicro.org/data/user/event",
            type: "POST",
            data: JSON.stringify({
                "app_id": "screenshot_issue_detector",
                "app_name": "screenshot_issue_detector",
                "app_version": current_version,
                "user_id": uid,
                "event_action": action,
                "event_value": event_value,
                "event_remarks": remarks
            }),
            dataType: "json",
            //contentType:"application/json,charset=utf-8"
            cache: false,
            contentType: 'application/json; charset=UTF-8',
            processData: false
        }).done(function(msg) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){  
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: MSG_TYPE.POST_FEEDBACK,
                    result:"done"
                });
            }); 
        }).fail(function(jqXHR, textStatus) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){  
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: MSG_TYPE.POST_FEEDBACK,
                    result:"fail"
                });
            }); 
        });
    };


    /**
     * 接收来自content_scripts发来的消息
     */
    var _addExtensionListener = function () {
        chrome.runtime.onMessage.addListener(function (request, sender, callback) {
            //处理Feedback
            if (request.type == MSG_TYPE.USAGE_FEEDBACK) {
                feedback_data = request.data
                feedback_data['value']['run_env'] = 'production'
                console.log("feedback data:")
                console.log(JSON.stringify(feedback_data, null, 2))
                _feedback(feedback_data['uid'], feedback_data['action'], feedback_data['value'])
            }else if(request.type == MSG_TYPE.POST_FEEDBACK) {
                post_data = request.data
                _postFeedback(post_data['result'], post_data['category'], post_data['comment'], post_data['uid'])              
            }
            return true;
        });
    };


    /**
     * 初始化
     */
    var _init = function () {
        _addExtensionListener();
        _createOrRemoveContextMenu();
    };

    return {
        init: _init,
        runHelper: _runHelper
    };
})();

//初始化
BgPageInstance.init();
