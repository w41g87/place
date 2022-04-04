// ==UserScript==
// @name         Template for NL/NCD and their allies
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the canvas!
// @author       oralekin, LittleEndu, ekgame, w41g87
// @match        https://hot-potato.reddit.com/embed*
// @icon         https://www.nato.int/nato_static_fl2014/assets/layout/favicon.ico
// @grant        none
// ==/UserScript==

// If the new template is not updating, try clearing the browser cache!

// Hello, I don't know what I am doing so spaghetti code here. Also runs very slowly.

var warning = true; // PRESS SPACE TO TURN OFF WARNING!
var showWhite = false; // PRESS F TO FOCUS!

var mainCanvasColorData;
var whiteColorData = undefined;
var templateColorData = undefined;
var heatMap = undefined;
var overlayColorData;

var warningContext;
var overlayContext;

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
                            } else {
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
