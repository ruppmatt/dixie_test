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
                display(msg.msg);
                tryEMSFileRead(root_path + '/ipsum.txt');
            }
        }
        else {
            display('Unknown message type.');
        }
    }
};



/*
    Setup the database '/test' with indexable timestamp,
    contents, and mode properties.
    The key, the file path, is hidden (not stored as
    a property indexable or otherwise).
 */
function setupStore() {
    db = new Dexie(root_path);
    db.version(1).stores({
        //The missing first argument means we're going to not bind the key to an indexable property
        //We can insert any additional properties into the documents at any time; but we can only
        //use the Dexie index features with the properties listed.  Note that we cannot use
        //the key (the file path) as it is *not* listed as an indexable property (and is not stored
        //as a document property at all.
        FILE_DATA: ',timestamp,contents,mode'
    });
    db.open();
}


/*
    Try to write a small text file to the database store.
    We must convert the contents to a UTF-8 byte array

    If we can write the file, try to read the file back.
    We must convert the byte array back to a UTF-16 string.

    This example uses promises.
 */
function tryFileWriteEMSRead(path, contents) {
    global_pending++;
    db.FILE_DATA.add(
        {
            timestamp: Date.now(),  //We may need to do more work with this property
            contents: utf8bytes_encode(contents),
            mode: 33206
        },
        path  //Since we're handling our keys ourselves, we need this second argument
    ).then(function () {
        display('Able to add file ' + path);
        global_pending--;
        global_pending++;
        db.FILE_DATA.get(path).then(function(doc){
            global_pending--;
            var utf16 = utf8bytes_decode(doc.contents);
            display('Read from file ' + path + ' the contents: ' + utf16);
        }).catch(function(e){
            global_pending--;
            display ('Unable to read from file ' + path)
        })
    }).catch(function () {
        global_pending--;
        display('Unable to add file ' + path);
    });
}


/*
    Try to read a file stored from an emscripten
    file write.  It's in a UTF8 byte array encoding,
    so it needs to be converted back to a UTF16 string
 */
function tryEMSFileRead(path){
    global_pending++;
    db.FILE_DATA.get(path).then(function(doc){
        var utf16 = utf8bytes_decode(doc.contents);
        display('Read from file: ' + path + ' the contents ' + utf16);
        global_pending--;
    }).catch(function(e){
        display('Unable to read file ' + path);
        global_pending--;
    });
}


/*
    Try to write a file to path with the data contents.
    The contents is received as a UTF-16 string and
    converted to a UTF-8 byte array before storage.
 */
function tryEMSWriteFile(path, contents){
    global_pending++;
    db.FILE_DATA.add(
        {
            timestamp: Date.now(),
            contents:utf8bytes_encode(contents),
            mode:33206
        },
        path
    ).then(function() {
        global_pending--;
        display('Able to add file ' + path);
    }).catch(function(e) {
        global_pending--;
        display('Unable to add file ' + path);
    })
}


/*
    A utility function to write a number of lorem ipsum
    files to the database.  This is used to demonstrate
    asynchronous writes and waiting behavior.
 */
function ipsumWriting(k){
    for (; k > 0; k--) {
        var npara = Math.floor((Math.random() * 50), + 1);
        var path = root_path + '/dom_ipsum_' + (10-k) + '.txt';
        var contents = HolderIpsum.paragraphs(npara, true).join('\n\n');
        tryEMSWriteFile(path, contents);
    }
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

// A count of pending objects; read and write operations increment and decrement
// this value when they start and end, respectively
var global_pending = 0;

var root_path = '/test';  // The virtual path we are writing into
var worker = new Worker('test_cc.js');  // Launch a worker using the code in test_cc.js (emscripten-generated)
worker.onmessage = processMessage;  // Send received messages from the worker through processMessage the function
setupStore();  // Setup our database and try to write and read from it...
tryEMSWriteFile(root_path + '/disco.txt', 'Amazingly few discotheques provide jukeboxes.');
ipsumWriting(10);
tryFileWriteEMSRead(root_path + '/fox.txt', 'The quick brown fox jumped over the lazy dog.');


// We need to be sure that we're done with all asynchronous operations before
// letting our worker thread know.  This setInterval object will periodically check
// to see if our operations are done.
var pendingTimer =  setInterval(checkPending, 10);
