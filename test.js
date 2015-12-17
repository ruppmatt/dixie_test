/**
 * Created by ruppmatt on 12/16/15.
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



function utf8bytes_encode(str16){
    var bytes = []
    str8 = utf16to8(str16);
    for (var char of str8){
        bytes.push(char.charCodeAt(0));
    }
    return bytes;
}

function utf8bytes_decode(bytes8){
    var chars = [];
    for (var byte of bytes8){
        chars.push(String.fromCharCode(byte));
    }
    return utf8to16(chars.join(''));
}


function display(text)
{   var para = document.createElement("p");
    var child = document.createTextNode(text);
    para.appendChild(child);
    document.body.appendChild(para);
}


var db;
var dom_fs_ready = false;
var worker = new Worker('test_cc.js');


onmessage = function(msg){
    display('Received message from worker: ' + msg);
    if (msg == 'wkr_fs_ready'){
        tryReadFile('/tmp/ipsum.txt');
    }
}

/*
    Setup the database '/tmp' with indexable timestamp,
    contents, and mode properties.
    The key, the file path, is hidden (not stored as
    a property indexable or otherwise).
 */
function setupStore() {
    db = new Dexie('/tmp');
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
function tryFileReadWrite(path, contents) {
    db.FILE_DATA.add(
        {
            timestamp: Date.now(),  //We may need to do more work with this property
            contents: utf8bytes_encode(contents),
            mode: 33206
        },
        path
    ).then(function () {
        display('Able to add file ' + path);
        db.FILE_DATA.get(path).then(function(doc){
            var utf16 = utf8bytes_decode(doc.contents);
            display('Read from file ' + path + ' the contents: ' + utf16);
            worker.send("dom_fs_ready");
        }).catch(function(e){
            display ('Unable to read from file ' + path)
        })
    }).catch(function () {
        display('Unable to add file ' + path);
    });
}

function tryReadFile(path){
    db.FILE_DATA.get(path).then(function(doc)){
        var utf16 = utf8bytes_decode(doc.contents);
        display('Read from file: ' + path + ' the contents ' + utf16);
    }).catch(function(e)){
        display('Unable to read file ' + path);
    });
}

/*
  Clear the database '/tmp' and start over
  with no page cache
 */
function tryAgain(){
    if (db){
        db.delete();
    }
    location.reload(true);
}


setupStore();
tryReadWriteFile('/tmp/fox.txt', 'The quick brown fox jumped over the lazy dog.');
