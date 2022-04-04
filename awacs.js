// ==UserScript==
// @name         Bot - awacs
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Bot for r place, based on CZ
// @author       NoahvdAa, GravelCZ, MartinNemi03, w41g87
// @match        https://www.reddit.com/r/place/*
// @match        https://new.reddit.com/r/place/*
// @match        https://reddit.com/r/place/*
// @icon         https://www.nato.int/nato_static_fl2014/assets/layout/favicon.ico
// @require https://greasyfork.org/scripts/421384-gm-fetch/code/GM_fetch.js?version=898562
// @grant    GM_xmlhttpRequest
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect place.pocket-sand.com
// @icon         https://www.nato.int/nato_static_fl2014/assets/layout/favicon.ico
// ==/UserScript==

// @match        https://www.reddit.com/r/place/*
// @match        https://new.reddit.com/r/place/*
// @match        https://reddit.com/r/place/*

// Obtain reddit access token
async function getAccessToken() {
    const usingOldReddit = window.location.href.includes('new.reddit.com');
    const url = usingOldReddit ? 'https://new.reddit.com/r/place/' : 'https://www.reddit.com/r/place/';
    //const url = "https://hot-potato.reddit.com/embed"
    const response = await fetch(url);
    const responseText = await response.text();
    
    const token = responseText.split('\"accessToken\":\"')[1].split('"')[0];
    console.log(token);
    sessionStorage.setItem('userToken', token);
    return token;
}

var accessToken = await getAccessToken();
