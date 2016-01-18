/**
 * Created by ruppmatt on 12/16/15.
 */



/*
 Clear the database '/test' and start over
 with no page cache.  A button in index.html
 binds to this function for its onclick event.
 */
function tryAgain(){
    if (db){
        db.delete();
    }
    location.reload(true);
}


/*
    Because emscripten's FS uses UTF-8 for encoding, we must translate
    between UTF-8 and UTF-16.  Further, because JS doesn't deal in bytes,
    we need to convert and backconvert from numbers to strings as well.

    The code below is borrowed to help with the conversion from UTF-8 to
    UTF-16.
 */

// ---- Begin third-party code -----
/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
function utf16to8(str) {
    var out, i, len, c;

    out = "";
    len = str.length;
    for(i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if ((c >= 0x0001) && (c <= 0x007F)) {
            out += str.charAt(i);
        } else if (c > 0x07FF) {
            out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
            out += String.fromCharCode(0x80 | ((c >>  6) & 0x3F));
            out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
        } else {
            out += String.fromCharCode(0xC0 | ((c >>  6) & 0x1F));
            out += String.fromCharCode(0x80 | ((c >>  0) & 0x3F));
        }
    }
    return out;
}

function utf8to16(str) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = str.length;
    i = 0;
    while(i < len) {
        c = str.charCodeAt(i++);
        switch(c >> 4)
        {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += str.charAt(i-1);
            break;
            case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = str.charCodeAt(i++);
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = str.charCodeAt(i++);
                char3 = str.charCodeAt(i++);
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}
// ---- End third-party code -----



/*
    Convert a UTF-16 to an array of UTF-8 encoded bytes
 */
function utf8bytes_encode(str16){
    var bytes = []
    str8 = utf16to8(str16);
    for (var char of str8){
        bytes.push(char.charCodeAt(0));
    }
    return bytes;
}



/*
    Convert a UTF-8 byte array into a string encoded as UTF-16
 */
function utf8bytes_decode(bytes8){
    var chars = [];
    for (var byte of bytes8){
        chars.push(String.fromCharCode(byte));
    }
    return utf8to16(chars.join(''));
}


/*
    A function to add our status to the DOM.
 */
function display(text)
{   var para = document.createElement("p");
    var child = document.createTextNode(text);
    para.appendChild(child);
    document.body.appendChild(para);
}




/*
    The function that gets triggered when we get a message
    from our worker thread.
 */
function processMessage(incoming_msg){
    var msg = incoming_msg.data;
    if (msg.type == undefined) {
        console.log('Unknown message: ', msg);
    } else{
        if (msg.type === 'toDisplay'){
            display(msg.msg);
        } else if (msg.type === 'status') {
            if (msg.msg === 'wkr_fs_ready') {
                display('Worker states: ' + msg.msg);
                //setupStore();
                tryEMSFileRead(root_path + '/ipsum.txt');
            }
            else {
                display('Unknown status message: ' + msg.msg);
            }
        }
        else {
            display('Unknown message type.');
        }
    }
};


/*
    This will setup our test environment.  I'm encapsulating
    it in a function to see whether or not I can get the
    web worker fully loaded (and waiting) before the tests
    are performed.
 */
function doTest() {
    display('Setting up tests on the dom-side...')
    setupStore();  // Setup our database and try to write and read from it...
    tryEMSWriteFile(root_path + '/disco.txt', 'Amazingly few discotheques provide jukeboxes.');
    ipsumWriting(10);
    tryEMSFileRead(root_path + '/disco.txt');
    tryFileWriteEMSRead(root_path + '/fox.txt', 'The quick brown fox jumped over the lazy dog.');
    pendingTimer =  setInterval(checkPending, 10);
}


/*
    This function is used by the a setInterval timer
    to wait until all pending events are done before
    letting the worker thread know that the file system
    is available.
 */
function checkPending(){
    display('' + global_pending + ' pending events.');
    if (global_pending == 0){
        worker.postMessage({type:'status', msg:'dom_fs_ready'});
        display('Telling worker FS is ready.');
        clearInterval(pendingTimer);
    }
}


// Our database (global for ease not wisdom)
var db;

// We need to be sure that we're done with all asynchronous operations before
// letting our worker thread know.  This setInterval object will periodically check
// to see if our operations are done.
var pendingTimer;

// A count of pending objects; read and write operations increment and decrement
// this value when they start and end, respectively
var global_pending = 0;

var root_path = '/test';  // The virtual path we are writing into
var worker = new Worker('test_cc.js');  // Launch a worker using the code in test_cc.js (emscripten-generated)
worker.onmessage = processMessage;  // Send received messages from the worker through processMessage the function

var testTimer = setTimeout(doTest, 1500);  // We're going to wait 1 second to get our worker ready before we do our tests


