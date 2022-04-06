// ==UserScript==
// @name         PlaceNL Bot Yet another edition
// @namespace    https://github.com/
// @version      24
// @description  Bot for r place, based on CZ
// @author       NoahvdAa, GravelCZ, MartinNemi03, ...
// @match        https://www.reddit.com/r/place/*
// @match        https://new.reddit.com/r/place/*
// @match        https://reddit.com/r/place/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @require	     https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @require https://greasyfork.org/scripts/421384-gm-fetch/code/GM_fetch.js?version=898562
// @grant    GM_xmlhttpRequest
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @connect place.pocket-sand.com
// @connect hot-potato.reddit.com
// ==/UserScript==

var order = undefined;
var accessToken;
var currentOrderCanvas = document.createElement('canvas');
var currentOrderCtx = currentOrderCanvas.getContext('2d');
var currentPlaceCanvas = document.createElement('canvas');

// Reload Site after 9 Minutes
setTimeout(() => { location = location }, 9 * 60 * 1000);

// Global constants
const DEFAULT_TOAST_DURATION_MS = 10000;

//  if we resize canvas, we may need to update at line 164 and line 262
const WIDTH = 2000;
const HEIGHT = 2000;
const REDDIT_CANVAS_SIZE = 1000;
const API_VERSION = '24';

const COLOR_MAPPINGS = {
    '#6D001A': 0,
    '#BE0039': 1,
    '#FF4500': 2,
    '#FFA800': 3,
    '#FFD635': 4,
    '#FFF8B8': 5,
    '#00A368': 6,
    '#00CC78': 7,
    '#7EED56': 8,
    '#00756F': 9,
    '#009EAA': 10,
    '#00CCC0': 11,
    '#2450A4': 12,
    '#3690EA': 13,
    '#51E9F4': 14,
    '#493AC1': 15,
    '#6A5CFF': 16,
    '#94B3FF': 17,
    '#811E9F': 18,
    '#B44AC0': 19,
    '#E4ABFF': 20,
    '#DE107F': 21,
    '#FF3881': 22,
    '#FF99AA': 23,
    '#6D482F': 24,
    '#9C6926': 25,
    '#FFB470': 26,
    '#000000': 27,
    '#515252': 28,
    '#898D90': 29,
    '#D4D7D9': 30,
    '#FFFFFF': 31
};

let getRealWork = rgbaOrder => {
    let order = [];
    for (var i = 0; i < 4000000; i++) {
        if (rgbaOrder[(i * 4) + 3] !== 0) {
            order.push(i);
        }
    }
    return order;
};

let getPendingWork = (work, rgbaOrder, rgbaCanvas) => {
    let pendingWork = [];
    for (const i of work) {
        if (rgbaOrderToHex(i, rgbaOrder) !== rgbaOrderToHex(i, rgbaCanvas) && COLOR_MAPPINGS[rgbaOrderToHex(i, rgbaCanvas)] !== undefined) {
            pendingWork.push(i);
        }
    }
    return pendingWork;
};

(async function () {
    GM_addStyle(GM_getResourceText('TOASTIFY_CSS'));
    currentOrderCanvas.width = WIDTH;
    currentOrderCanvas.height = HEIGHT;
    currentOrderCanvas.style.display = 'none';
    currentOrderCanvas = document.body.appendChild(currentOrderCanvas);
    currentPlaceCanvas.width = WIDTH;
    currentPlaceCanvas.height = HEIGHT;
    currentPlaceCanvas.style.display = 'none';
    currentPlaceCanvas = document.body.appendChild(currentPlaceCanvas);

    Toastify({
        text: 'Getting an access token...',
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();
    accessToken = await getAccessToken();
    Toastify({
        text: 'Access token received!',
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();

    connectSocket();
    attemptPlace();

    setInterval(() => {
        if (socket) socket.send(JSON.stringify({type: 'ping'}));
    }, 5000);
    setInterval(async () => {
        accessToken = await getAccessToken();
    }, 30 * 60 * 1000)
})();

    socket.onclose = function (e) {
        Toastify({
            text: `Disconnected from server: ${e.reason}`,
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        console.error(e);
        console.error('Socket Closed: ', e.reason);
        socket.close();
        setTimeout(connectSocket, 2000);
    };
}

async function attemptPlace() {
    if (order === undefined) {
        setTimeout(attemptPlace, 2000); // try again in 2sec.
        return;
    }
    var ctx;
    try {
        ctx = await getCanvasFromUrl(await getCurrentImageUrl('0'), currentPlaceCanvas, 0, 0, false);
        ctx = await getCanvasFromUrl(await getCurrentImageUrl('1'), currentPlaceCanvas, 1000, 0, false)
        ctx = await getCanvasFromUrl(await getCurrentImageUrl('2'), currentPlaceCanvas, 0, 1000, false)
        ctx = await getCanvasFromUrl(await getCurrentImageUrl('3'), currentPlaceCanvas, 1000, 1000, false)
    } catch (e) {
        console.warn('Error loading map: ', e);
        Toastify({
            text: 'Error loading map, Trying again in 10 seconds',
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        setTimeout(attemptPlace, 10000);
        return;
    }

    const rgbaOrder = currentOrderCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
    const rgbaCanvas = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
    const work = getPendingWork(order, rgbaOrder, rgbaCanvas);

    if (work.length === 0) {
        Toastify({
            text: `All pixels are at the right place! Trying again in 30 sec...`,
            duration: 30000
        }).showToast();
        setTimeout(attemptPlace, 30000); // try again in 30sec.
        return;
    }

    const percentComplete = 100 - Math.ceil(work.length * 100 / order.length);
    const workRemaining = work.length;
    const idx = Math.floor(Math.random() * work.length);
    const i = work[idx];
    const x = i % WIDTH;
    const y = Math.floor(i / WIDTH);
    const hex = rgbaOrderToHex(i, rgbaOrder);

    Toastify({
        text: `Trying to place pixels on ${x}, ${y}... (${percentComplete}% complete, ${workRemaining} left)`,
        duration: DEFAULT_TOAST_DURATION_MS
    }).showToast();

    const res = await place(x, y, COLOR_MAPPINGS[hex]);
    const data = await res.json();
    try {
        if (data.errors) {
            const error = data.errors[0];
            const nextPixel = error.extensions.nextAvailablePixelTs + 3000;
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toast_duration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;
            Toastify({
                text: `Pixel placed too soon. The next pixel will be placed at ${nextPixelDate.toLocaleTimeString()}.`,
                duration: toast_duration
            }).showToast();
            setTimeout(attemptPlace, delay);
        } else {
            const nextPixel = data.data.act.data[0].data.nextAvailablePixelTimestamp + 3000;
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toast_duration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;
            Toastify({
                text: `Pixel placed at ${x}, ${y}! The next pixel will be placed at ${nextPixelDate.toLocaleTimeString()}.`,
                duration: toast_duration
            }).showToast();
            console.log(`Pixel placed at ${x}, ${y}! The next pixel will be placed at ${nextPixelDate.toLocaleTimeString()}.`);
            setTimeout(attemptPlace, delay);
        }
    } catch (e) {
        console.warn('Error parsing', e);
        Toastify({
            text: `Error parsing: ${e}.`,
            duration: DEFAULT_TOAST_DURATION_MS
        }).showToast();
        setTimeout(attemptPlace, 10000);
    }
}

function place(x, y, color) {
    socket.send(JSON.stringify({type: 'placepixel', x, y, color}));
    return fetch('https://gql-realtime-2.reddit.com/query', {
        method: 'POST',
        body: JSON.stringify({
            'operationName': 'setPixel',
            'variables': {
                'input': {
                    'actionName': 'r/replace:set_pixel',
                    'PixelMessageData': {
                        'coordinate': {
                            'x': x % REDDIT_CANVAS_SIZE,
                            'y': y % REDDIT_CANVAS_SIZE
                        },
                        'colorIndex': color,
                        'canvasIndex': ((x >= REDDIT_CANVAS_SIZE ? 1 : 0) + (y >= REDDIT_CANVAS_SIZE ? 2 : 0))
                    }
                }
            },
            'query': 'mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
        }),
        headers: {
            'origin': 'https://hot-potato.reddit.com',
            'referer': 'https://hot-potato.reddit.com/',
            'apollographql-client-name': 'mona-lisa',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
}

async function getAccessToken() {
    const usingOldReddit = window.location.href.includes('new.reddit.com');
    const url = usingOldReddit ? 'https://new.reddit.com/r/place/' : 'https://www.reddit.com/r/place/';
    const response = await fetch(url);
    const responseText = await response.text();
    return responseText.split('\"accessToken\":\"')[1].split('"')[0];
}

async function getCurrentImageUrl(id = '0') {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://gql-realtime-2.reddit.com/query', 'graphql-ws', {
            headers : {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:98.0) Gecko/20100101 Firefox/98.0",
                "Origin": "https://hot-potato.reddit.com"
            } 
        });

        ws.onopen = () => {
            ws.send(JSON.stringify({
                'type': 'connection_init',
                'payload': {
                    'Authorization': `Bearer ${accessToken}`
                }
            }));
            ws.send(JSON.stringify({
                'id': '1',
                'type': 'start',
                'payload': {
                    'variables': {
                        'input': {
                            'channel': {
                                'teamOwner': 'AFD2022',
                                'category': 'CANVAS',
                                'tag': id
                            }
                        }
                    },
                    'extensions': {},
                    'operationName': 'replace',
                    'query': 'subscription replace($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on FullFrameMessageData {\n          __typename\n          name\n          timestamp\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}'
                }
            }));
        };

        ws.onmessage = (message) => {
            const {data} = message;
            const parsed = JSON.parse(data);

            if (!parsed.payload || !parsed.payload.data || !parsed.payload.data.subscribe || !parsed.payload.data.subscribe.data) return;

            ws.close();
            resolve(parsed.payload.data.subscribe.data.name + `?noCache=${Date.now() * Math.random()}`);
        }

        ws.onerror = reject;
    });
}
async function getObjectURL(url) {
    const resp = await GM_fetch(url, {
        mode: "cors",
    });
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
}
function getCanvasFromUrl(url, canvas, x = 0, y = 0, clearCanvas = false) {
    return new Promise(async (resolve, reject) => {
        let loadImage = ctx => {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (clearCanvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, x, y);
                resolve(ctx);
            };
            img.onerror = () => {
                Toastify({
                    text: 'Fout bij ophalen map. Opnieuw proberen in 3 sec...',
                    duration: 3000
                }).showToast();
                setTimeout(() => loadImage(ctx), 3000);
            };
            getObjectURL(url).then(objectURL => img.src = objectURL);
        };
        loadImage(canvas.getContext('2d'));
    });
}
function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

let rgbaOrderToHex = (i, rgbaOrder) =>
    rgbToHex(rgbaOrder[i * 4], rgbaOrder[i * 4 + 1], rgbaOrder[i * 4 + 2]);