// ==UserScript==
// @name         原神玩家指示器plus
// @namespace    https://github.com/andywang425
// @version      0.2
// @description  自动标注B站评论区中的原神玩家，依据是评论者发布的动态/视频里是否有原神相关内容
// @author       andywang425
// @match        *://www.bilibili.com/video/*
// @icon         https://static.hdslb.com/images/favicon.ico
// @connect      api.bilibili.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @license      MIT
// @run-at       document-start
// ==/UserScript==


(function () {
    const css = `
    .genshin-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: calc(2 * 10px);
        transform-origin: center center;
        transform: scale(0.5);
        width: 55px;
        height: 24px;
        border-radius: 8px;
        color: var(--text_white);
        background-color: #4e00ff;
        cursor: default;
    }`;
    let options = {
        attributes: true,
        subtree: true
    }
    let targetSet = new Set();
    let uidSet = new Set();
    let commentObserver = new MutationObserver(async function (mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (targetSet.has(mutation.target)) continue;
            const userInfoElement = getUserInfoElement(mutation);
            if (!userInfoElement || (userInfoElement.main.length === 0 && userInfoElement.sub.length === 0)) continue;
            const userNameElement = getUserNameElement(userInfoElement);
            const uid = getUserId(userNameElement);
            await checkGenshin(userInfoElement, uid, mutation);
        }
    })

    const main = async () => {
        GM_addStyle(css);
        const comment = await getComment();
        commentObserver.observe(comment, options);
    }

    const getComment = async () => {
        return new Promise(resolve => {
            let o = new MutationObserver(function (mutationList, observe) {
                for (const m of mutationList) {
                    if (m.target.getAttribute('class') === 'comment') {
                        resolve(m.target);
                        o.disconnect();
                    }
                }
            })
            o.observe(document, options);
        })
    }

    const checkGenshin = async (userInfoElement, uid, mutation) => {
        for (const type in uid) {
            for (let i = 0; i < uid[type].length; i++) {
                const isGenshin = uidSet.has(uid) || await limitHasGenshin(uid[type][i]);
                if (isGenshin) {
                    targetSet.add(mutation.target);
                    uidSet.add(uid);
                    setGenshinIcon(userInfoElement[type][i]);
                }
            }
        }
    }

    const setGenshinIcon = (userInfoElement) => {
        if (userInfoElement.lastChild?.className === 'genshin-icon')
            return;
        const icon = document.createElement('div');
        icon.setAttribute('class', 'genshin-icon');
        icon.textContent = '原友';
        userInfoElement.append(icon);
    }

    const getUserInfoElement = (mutation) => {
        const className = mutation.target.getAttribute('class');
        if (['reply-item', 'sub-reply-item'].includes(className)) {
            return {
                main: [...mutation.target.querySelectorAll('.user-info')],
                sub: [...mutation.target.querySelectorAll('.sub-user-info')]
            }
        }
    }

    const getUserNameElement = (userInfoElement) => {
        return {
            main: userInfoElement.main.map(e => e.querySelector('.user-name')),
            sub: userInfoElement.sub.map(e => e.querySelector('.sub-user-name'))
        }
    }

    const getUserId = (userInfoElement) => {
        return {
            main: userInfoElement.main.map(e => e.getAttribute('data-user-id')),
            sub: userInfoElement.sub.map(e => e.getAttribute('data-user-id'))
        }
    }

    const _hasGenshin = (uid) => {
        return new Promise(async resolve => {
            const dynamic = await getDynamic(uid);
            const video = await getVideo(uid);
            if (dynamic.response.data.total > 0 || video.response.data.page.count > 0)
                resolve(true);
            else
                resolve(false);
        })
    }

    const limit = (func, delay) => {
        let prev = Date.now();
        let queue_length = 0;
        return function () {
            let context = this;
            let args = arguments;
            let now = Date.now();
            return new Promise(async resolve => {
                if (now - prev > delay) {
                    prev = now;
                    resolve(await func.apply(context, args));
                }
                else {
                    queue_length++;
                    setTimeout(async () => {
                        resolve(await func.apply(context, args));
                        prev = Date.now();
                        queue_length--;
                    }, delay * queue_length);
                }
            })
        }
    }

    const limitHasGenshin = limit(_hasGenshin, 500);

    const getDynamic = async (uid) => {
        return await GMR({
            method: 'GET',
            url: 'https://api.bilibili.com/x/space/dynamic/search',
            data: {
                keyword: '原神',
                pn: 1,
                ps: 30,
                mid: uid
            },
            headers: {
                'Referer': `https://space.bilibili.com/${uid}/search/dynamic?keyword=${encodeURIComponent('原神')}`
            },
            responseType: 'json'
        });
    }

    const getVideo = async (uid) => {
        return await GMR({
            method: 'GET',
            url: 'https://api.bilibili.com/x/space/arc/search',
            data: {
                mid: uid,
                ps: 30,
                tid: 0,
                pn: 1,
                keyword: '原神',
                order: 'pubdate',
                jsonp: 'jsonp'
            },
            headers: {
                'Referer': `https://space.bilibili.com/${uid}/search/dynamic?keyword=${encodeURIComponent('原神')}`
            },
            responseType: 'json'
        });
    }

    const mylog = (...args) => {
        console.log('[原神玩家指示器+]', ...args);
    }

    function GMR(config) {
        return new Promise(resolve => {
            if (typeof (config.data) === 'object' && !(config.data instanceof FormData) && !(config.data instanceof Blob)) {
                let params = new URLSearchParams(config.data).toString();
                config.url = config.url.concat('?', params);
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

    main();
})();