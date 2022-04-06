// ==UserScript==
// @name         Bot - bogey
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Bot for r place, based on CZ
// @author       NoahvdAa, GravelCZ, MartinNemi03, w41g87
// @match        https://hot-potato.reddit.com/*
// @icon         https://www.nato.int/nato_static_fl2014/assets/layout/favicon.ico
// @require https://greasyfork.org/scripts/421384-gm-fetch/code/GM_fetch.js?version=898562
// @grant    GM_xmlhttpRequest
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @icon         https://www.nato.int/nato_static_fl2014/assets/layout/favicon.ico
// ==/UserScript==

// Press F12 to open the developer menu, go to console.
// Space to toggle warning
// F to toggle focus
// A to toggle autofill

const accessToken = ""; // pls give socket
var bot = true;

class QueueElement {
    constructor(element, priority) {
        this.element = element;
        this.priority = priority;
    }
}
class PriorityQueue {
    constructor() {
        this.queueItems = [];
    }
    enqueueFunction(element, priority) {
        let queueElement = new QueueElement(element, priority);
        
        if (this.queueItems.length === 0) {
            this.queueItems.push(queueElement);
            return;
        } else {
            var lBound = 0;
            var uBound = this.queueItems.length;
            while (lBound != uBound) {
                var mid = Math.floor((lBound + uBound) / 2);
                if (queueElement.priority > this.queueItems[mid].priority) uBound = mid;
                else if (lBound == mid) lBound++;
                else lBound = mid;
            }
            this.queueItems.splice(lBound, 0, queueElement);
        }

    }
    dequeueFunction() {
        /* returns the removed element from priority queue. */
        if (this.isPriorityQueueEmpty()) {
            return "No elements present in Queue";
        }
        return this.queueItems.shift();
    }
    front() {
        /* returns the highest priority queue element without removing it. */
        if (this.isPriorityQueueEmpty()) {
            return "No elements present in Queue";
        }
        return this.queueItems[0];
    }
    rear() {
        /* returns the lowest priority queue element without removing it. */
        if (this.isPriorityQueueEmpty()) {
            return "No elements present in Queue";
        }
        return this.queueItems[this.queueItems.length - 1];
    }
    isPriorityQueueEmpty() {
        /* Checks the length of an queue */
        return this.queueItems.length === 0;
    }
    /* prints all the elements of the priority queue */
    printPriorityQueue() {
        let queueString = "";
        for (var i = 0; i < this.queueItems.length; i++)
            queueString += this.queueItems[i].element + " ";
        return queueString;
    }
    clearPriorityQueue() {
        this.queueItems = [];
    }
    length() {
        return this.queueItems.length;
    }
}

var warning = true; // PRESS SPACE TO TURN OFF WARNING!
var showWhite = false; // PRESS F TO FOCUS!

var diffP = new PriorityQueue();
var mainCanvasColorData;
var whiteColorData = undefined;
var templateColorData = undefined;
var heatMap = undefined;
var overlayColorData;

var warningContext;
var overlayContext;

// The dark side
const REDDIT_CANVAS_SIZE = 1000;
var canvasWidth;
var canvasHeight;
var order = undefined;
var socket;

const REVERSE_MAP = [
    109, 0, 26, 
    190, 0, 57,
    255, 69, 0, 
    255, 168, 0, 
    255, 214, 53, 
    255, 248, 184, 
    0, 163, 104, 
    0, 204, 120, 
    126, 237, 86, 
    0, 117, 111, 
    0, 158, 170, 
    0, 204, 192, 
    36, 80, 164, 
    54, 144, 234, 
    81, 233, 244, 
    73, 58, 193, 
    106, 92, 255, 
    148, 179, 255, 
    129, 30, 159, 
    180, 74, 192, 
    225, 171, 255, 
    222, 16, 127, 
    255, 56, 129, 
    255, 153, 170, 
    109, 72, 47, 
    156, 105, 38, 
    255, 180, 112, 
    0, 0, 0,
    81, 82, 82, 
    137, 141, 144, 
    212, 215, 217, 
    255, 255, 255
];


function getClosest(target) {
    var index = 0;
    var diff = -1;
    for (var i = 0; i < 32; i++) {
        var compare = Math.pow(templateColorData.data[target] - REVERSE_MAP[i * 3], 2) +
                    Math.pow(templateColorData.data[target + 1] - REVERSE_MAP[i * 3 + 1], 2) +
                    Math.pow(templateColorData.data[target + 2] - REVERSE_MAP[i * 3 + 2], 2);
        if (diff < 0) {
            diff = compare;
            index = i;
        }
        else if (diff > compare) {
            diff = compare;
            index = i;
        }
    }

    return index;
}


async function place (x, y, color) {
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

async function attemptPlace() {
    if (diffP.length() === 0) {
        setTimeout(attemptPlace, 10000); // try again in 10sec.
        return;
    } else if (accessToken == "") return;

    var pixelIndex;
    var diff
    do {
        pixelIndex = diffP.dequeueFunction();
        diff = Math.pow(templateColorData.data[pixelIndex.element] - mainCanvasColorData.data[pixelIndex.element], 2) +
                    Math.pow(templateColorData.data[pixelIndex.element + 1] - mainCanvasColorData.data[pixelIndex.element + 1], 2) +
                    Math.pow(templateColorData.data[pixelIndex.element + 2] - mainCanvasColorData.data[pixelIndex.element + 2], 2);
        if (heatMap) diff += Math.pow(heatMap.data[pixelIndex.element], 2) + Math.pow(heatMap.data[pixelIndex.element + 1], 2) + Math.pow(heatMap.data[pixelIndex.element + 2], 2);
    } while (diff !== pixelIndex.priority);

    const x = (pixelIndex.element / 4) % canvasWidth;
    const y = Math.floor(pixelIndex.element / 4 / canvasHeight);
    const color = getClosest(pixelIndex.element);
    const res = await place(x, y, color);

    // const x = 5;
    // const y = 5;
    // const res = await place(x, y, 2);
    const data = await res.json();
    try {
        if (data.errors) {
            const error = data.errors[0];
            const nextPixel = error.extensions.nextAvailablePixelTs + 3000;
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toast_duration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;
            console.log("Pixel placed too soon. The next pixel will be placed at " + nextPixelDate.toLocaleTimeString());
            setTimeout(attemptPlace, delay);
        } else {
            const nextPixel = data.data.act.data[0].data.nextAvailablePixelTimestamp + 3000;
            const nextPixelDate = new Date(nextPixel);
            const delay = nextPixelDate.getTime() - Date.now();
            const toast_duration = delay > 0 ? delay : DEFAULT_TOAST_DURATION_MS;
            console.log(`Pixel placed at ${x}, ${y}! The pixel is replaced by color index ${color}, with priority value of ${diff}. The next pixel will be placed at ${nextPixelDate.toLocaleTimeString()}.`);
            setTimeout(attemptPlace, delay);
        }
    } catch (e) {
        console.warn('Error parsing', e);
    }
}



console.log("commencement");
window.addEventListener('load', () => {
    const camera = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-camera");
    const canvas = camera.querySelector("mona-lisa-canvas");
    const overlayCanvas = document.createElement("canvas");
    const warningCanvas = document.createElement("canvas");
    
    console.log("canvas obtained");
    // get main canvas and do stuff
    const waitForMain = setInterval(() => {
        const mainCanvas = canvas.shadowRoot.querySelector('.container').querySelector("canvas");
        if (mainCanvas && mainCanvas.width != 300) {
            console.log("main obtained");

            clearInterval(waitForMain);
            const image = document.createElement("img");
            const hm = document.createElement("img");
    
            // Add the image as overlay
    
            var red = true;
            canvasWidth = mainCanvas.width;
            canvasHeight = mainCanvas.height;
    
            // set overlay properties
            overlayCanvas.width = mainCanvas.width * 3;
            overlayCanvas.height = mainCanvas.height * 3;
            overlayCanvas.style = `position: absolute; left: 0; top: 0; width: ${mainCanvas.width}px; height: ${mainCanvas.height}px; image-rendering: pixelated; z-index: 2`;
    
            // set warning propoerties
            warningCanvas.width = mainCanvas.width;
            warningCanvas.height = mainCanvas.height;
            warningCanvas.style = `position: absolute; left: 0; top: 0; width: ${mainCanvas.width}px; height: ${mainCanvas.height}px; image-rendering: pixelated; z-index: 1`;
            
            // get context
            canvas.shadowRoot.querySelector('.container').appendChild(warningCanvas);
            canvas.shadowRoot.querySelector('.container').appendChild(overlayCanvas);
            overlayContext = overlayCanvas.getContext('2d');
            warningContext = warningCanvas.getContext('2d');
            console.log("context obtained");
    
            // get image data
            // To not "taint" the image
            image.crossOrigin = "undefined";
            image.src = "https://raw.githubusercontent.com/w41g87/place/main/template.png";
            hm.crossOrigin = "undefined";
            hm.src = "https://raw.githubusercontent.com/w41g87/place/main/heatmap.jpg"
    
            hm.onload = async function() {
                console.log("heatmap loaded");
                warningContext.drawImage(this, 0, 0);
                heatMap = warningContext.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                warningContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            }
    
            image.onload = async function() {
                console.log("image loaded");
                overlayContext.drawImage(this, 0, 0);
                templateColorData = overlayContext.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                overlayContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                
                // convert to center pixel
                overlayColorData = overlayContext.createImageData(overlayCanvas.width, overlayCanvas.height);
                for (var i = 0; i < overlayCanvas.height; i++) {
                    for (var j = 0; j < overlayCanvas.width; j++) {
                        const k = i * overlayCanvas.width + j;
                        if ((i + j + 1) % 3 == 0) {
                            const di = (i - 1) / 3;
                            const dj = (j - 1) / 3;
    
                            // check if our canvas is bigger than the input image, it should be fine, but just in case
                            if (di >= image.height || dj > image.width) {
                                overlayColorData.data[4 * k + 3] = 0;
                                continue;
                            }
    
                            // proceed to do
                            const dk = di * mainCanvas.width + dj;
                            overlayColorData.data[4 * k] = templateColorData.data[4 * dk];
                            overlayColorData.data[4 * k + 1] = templateColorData.data[4 * dk + 1];
                            overlayColorData.data[4 * k + 2] = templateColorData.data[4 * dk + 2];
                            overlayColorData.data[4 * k + 3] = templateColorData.data[4 * dk + 3];;
                        } else {
                            // if the pixel is off center, then show its original color
                            overlayColorData.data[4 * k + 3] = 0;
                        }
                    }
                }
    
                // draw on overlay
                overlayContext.putImageData(overlayColorData, 0, 0);
    
                // draw white background
                whiteColorData = warningContext.createImageData(warningCanvas.width, warningCanvas.height);
                
                for (i = 0; i < whiteColorData.data.length; i+=4) {
                    if (templateColorData.data[i + 3] > 100) {
                        whiteColorData.data[i+3] = 0;
                    } else {
                        whiteColorData.data[i] = 255;
                        whiteColorData.data[i+1] = 255;
                        whiteColorData.data[i+2] = 255;
                        whiteColorData.data[i+3] = 255;
                    }
                }
            }
    
            var blinkInterval = setInterval (() => {
                if (templateColorData) {
                    diffP.clearPriorityQueue();
                    mainCanvasColorData = mainCanvas.getContext('2d').getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                    var warningColorData = warningContext.createImageData(warningCanvas.width, warningCanvas.height);
    
                    for (var i = 0; i < warningColorData.data.length; i+=4) {
                        if (whiteColorData.data[i + 3] < 10) {
                            //console.log("step 1");
                            var diff = Math.pow(templateColorData.data[i] - mainCanvasColorData.data[i], 2) +
                                        Math.pow(templateColorData.data[i + 1] - mainCanvasColorData.data[i + 1], 2) +
                                        Math.pow(templateColorData.data[i + 2] - mainCanvasColorData.data[i + 2], 2);
                            // Too much difference - flash warning
                            if (diff > 3000) {
                                warningColorData.data[i] = 255;
                                warningColorData.data[i + 1] = 128 - diff / 1536;
                                warningColorData.data[i + 2] = 128 - diff / 1536;
                                warningColorData.data[i + 3] = 128 + diff / 1536;
                                
                                if (heatMap) diff += Math.pow(heatMap.data[i], 2) + Math.pow(heatMap.data[i + 1], 2) + Math.pow(heatMap.data[i + 2], 2);
                                diffP.enqueueFunction(i, diff);
                            } else {
                                //console.log("same");
                                warningColorData.data[i + 3] = 0;
                            }
                        } else {
                            if (showWhite) {
                                warningColorData.data[i] = 255;
                                warningColorData.data[i + 1] = 255;
                                warningColorData.data[i + 2] = 255;
                                warningColorData.data[i + 3] = 255;
                            } else warningColorData.data[i + 3] = 0;
                        }
                    }
    
                    if (red && warning) {
                        // draw on warning layer
                        warningContext.putImageData(warningColorData, 0, 0);
                    } else {
                        if (showWhite) warningContext.putImageData(whiteColorData, 0, 0);
                        else warningContext.clearRect(0, 0, warningCanvas.width, warningCanvas.height);
                    }
                    red = !red;
                }
            }, 2000);
        }
    });

    // keyboard events
    document.body.onkeyup = ((e) => {
        if (e.key == " ") warning = !warning;
        else if (e.key == "f") showWhite = !showWhite;
        else if (e.key == "a") {
            bot = !bot;
            if (bot) {
                console.log("autofill ON!");
                attemptPlace();
            } else {
                console.log("autofill OFF!");
                clearTimeout( attemptPlace );
            }
        }
    });

    //Add a style to put a hole in the pixel preview (to see the current or desired color)
    const waitForPreview = setInterval(() => {
        const preview = camera.querySelector("mona-lisa-pixel-preview");
        if (preview) {
            clearInterval(waitForPreview);
            const style = document.createElement('style')
            style.innerHTML = '.pixel { clip-path: polygon(-20% -20%, -20% 120%, 37% 120%, 37% 37%, 62% 37%, 62% 62%, 37% 62%, 37% 120%, 120% 120%, 120% -20%); }'
            preview.shadowRoot.appendChild(style);
        }
    }, 100);
}, false);

attemptPlace();