// ==UserScript==
// @name         智慧树直播课助手
// @namespace    https://github.com/andywang425
// @version      0.3.1
// @description  自动签到，投票
// @author       andywang425
// @match        *://hike-living.zhihuishu.com/*
// @connect      zhihuishu.com
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABw0lEQVQokY1SPW8TQRB9d74v5zAXYzg5QVhIhCb8BX4S4hdASkCiokUUNCkpoKGhhW0iQbDcge5spPgiEtu77J59vt0dilhCiYngVaN572lGMw9ElOc5Y0wIQZdACMEYy/OciJwsy9rtdpIk+Bc459Pp1C2K4n/UAJIkKYoCf93k1ZfX+4dP1/tSSrfVap0f/JHqqarGYzlRlf08OkfGceyeVZYwr0FE+PawOn67HafXm72DTD1+B2sNbAnYM+XKwEv97D1GxYkN75LjRI2w6W8YYDddqtl3DB9QOf5jGM4Gcz39MMDodK4bHcdpaDLGatdxWuGyVkNUb/Tslzrsrwz7X5/8lLx3A7quUAnHlL7re66/0JgoaGuBe1ZOfjzaWxkC98pGEN7eRLd7y7t53wTbZa3KWnZi6nWCINqEf8dpXnXjEACI6FQea2NOhF5qIjuva/Xy4PmLT3uLeinnZHSlq7E1Wh4dEZEH4FqcAuiszht5Hnbau7UpQ88PPQABGl0A8dYWAEcIcfEVQKUXRBT5zQt9pZQ7GAzWUxB60boaQL/fd9M05Zyvc+vgnKdpCiLKsowxJqW8LN5SSsZYlmVE9BsXolKUnSzdUQAAAABJRU5ErkJggg==
// @license      MIT
// @run-at       document-start
// @require      https://greasyfork.org/scripts/450907-ajax-hook-userscript/code/Ajax-hook-userscript.js?version=1090926
// @require      https://greasyfork.org/scripts/453803-hotkeys-js/code/hotkeys-js.js?version=1109849
// @updateURL    https://github.com/andywang425/UserScripts/raw/master/Zhihuishu-LiveClassHelper/Zhihuishu-LiveClassHelper.user.js
// @downloadURL  https://github.com/andywang425/UserScripts/raw/master/Zhihuishu-LiveClassHelper/Zhihuishu-LiveClassHelper.user.js
// @supportURL   https://github.com/andywang425/UserScripts/issues
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    // 已尝试过签到的checkId列表
    let checkIdList = [];
    // 已尝试过投票的voteId列表
    // let voteIdList = [];
    // key: voteId, value: groupId
    // let voteId2groupId = {};
    // 用户信息
    const user_info = JSON.parse(getCookieItem('CASLOGC'));
    mylog('CASLOGC', user_info);
    // Ajax-hook
    ah.proxy({
        onRequest: (config, handler) => {
            if (config.url.includes('//ctapp.zhihuishu.com/app-commonserv-classroomtools/commonChat/vote/chatVoteDetail')) {
                handler.next(config);
                let data = new URLSearchParams(config.body);
                const voteId = data.get('voteId');
                const groupId = data.get('groupId');
                voteId2groupId[voteId] = groupId;
            } else {
                //mylog('other request', config);
                handler.next(config);
            }
        },
        onResponse: async (response, handler) => {
            if (response.config.url.includes('//ctapp.zhihuishu.com/app-commonserv-classroomtools/commonChat/sign/chatCheckInfo')) {
                handler.next(response);
                mylog('chatCheckInfo', response);
                const res = JSON.parse(response.response);
                const checkStatus = res.rt.checkStatus;
                const checkId = res.rt.checkId;
                const checkType = res.rt.checkType;
                const checkGesture = res.rt.checkGesture ?? '';
                const latitude = res.rt.latitude ?? '';
                const longitude = res.rt.longitude ?? '';
                mylog('checkStatus', checkStatus);
                if (checkStatus === 3) {
                    if (checkIdList.includes(checkId)) {
                        mylog('已尝试过签到，不签到', checkId);
                        return;
                    }
                    mylog('WAIT FOR CHECK', checkId);
                    await sleep(randomIn(1000, 3000));
                    const req_data = `checkId=${checkId}&checkType=${checkType}&longitude=${longitude}&latitude=${latitude}&checkGesture=${checkGesture}&uuid=${user_info.uuid}&uid=${user_info.userId}&dateFormate=${dateFormate()}`;
                    mylog('CHECK DATA', req_data);
                    let res = await GMR({
                        method: 'POST',
                        url: 'https://ctapp.zhihuishu.com/app-commonserv-classroomtools/commonChat/sign/chatStudentCheck',
                        headers: {
                            'Referer': 'https://hike-living.zhihuishu.com/',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        data: req_data,
                        timeout: 10e3,
                        responseType: 'json',
                        onload: function (res) {
                            mylog(`${checkId}签到请求结束`, res)
                            checkIdList.push(checkId);
                        }
                    });
                    mylog("已完成签到，点击返回按钮", res.response);
                    clickReturnBtn();
                }
            } else {
                //mylog('other response', response);
            }
            handler.next(response);
        }
    });
    // 绑定快捷键，复读弹幕
    hotkeys('alt+shift+r', repeatLatestChat);
    /**
     * 复读最后一条弹幕
     */
    function repeatLatestChat() {
        let chatList = document.querySelectorAll('.chat-text');
        if (chatList.length === 0) return;
        let latestChat = chatList[chatList.length - 1];
        mylog('即将复读的内容', latestChat.innerHTML);
        input(document.querySelector('textarea.uni-textarea-textarea'), latestChat.innerHTML)
        document.querySelector('uni-button.send-btn').click();
    }
    /**
     * 模拟输入
     * @param {Element} dom 可以是textarea等
     * @param {String} value 输入内容
     */
    function input(dom, value) {
        var evt = new InputEvent('input', {
            inputType: 'insertText',
            dataTransfer: null,
            isComposing: false
        });
        dom.value = value;
        dom.dispatchEvent(evt);
    }
    /**
     * 获取当前时间戳（精确到秒，最后三位为0）
     * @returns {string}
     */
    function dateFormate() {
        return String(Date.now()).slice(0, 10).concat('000');
    }
    /**
     * 点击返回按钮
     */
    function clickReturnBtn() {
        document.querySelector('.right-top')?.click();
    }
    /**
     * 输出日志
     * @param  {...any} args 
     */
    function mylog(...args) {
        console.log('[ZCHELPER]', ...args);
    }
    /**
     * 获取Cookie值
     * @param {string} t Cookie名称 
     * @returns {string}
     */
    function getCookieItem(t) {
        return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(t).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || '';
    }
    /**
     * 发起 GM_xmlhttpRequest 请求
     * @param {*} config 
     * @returns {Promise}
     */
    function GMR(config) {
        return new Promise(resolve => {
            if (typeof (config.data) === 'object' && !(config.data instanceof FormData) && !(config.data instanceof Blob)) {
                let data = new URLSearchParams(config.data).toString();
                if (config.method === 'GET') {
                    config.url.concat('?', data);
                } else {
                    config.data = data;
                }
            }
            config._ontimeout = config.ontimeout ?? function () { };
            config._onerror = config.onerror ?? function () { };
            config._onload = config.onload ?? function () { };
            config.ontimeout = function (e) {
                config._ontimeout(e);
                config.onerror(e)
            };
            config.onerror = function (e) {
                config._onerror(e);
                mylog('XHR出错', config, e);
                resolve(undefined);
            };
            config.onload = function (res) {
                config._onload(res);
                resolve(res);
            }
            GM_xmlhttpRequest(config);
        })
    }
    /**
     * 获取范围内随机整数（包含最大最小值）
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @returns {number} 
     */
    function randomIn(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1))
    }
    /**
     * 延时（异步）
     * @param {number} time 毫秒
     * @returns {Promise}
     */
    function sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }
})();
