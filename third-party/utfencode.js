/**
 * Created by ruppmatt on 1/18/16.
 */
/*
 Because emscripten's FS uses UTF-8 for encoding, we must translate
 between UTF-8 and UTF-16.  Further, because JS doesn't deal in bytes,
 we need to convert and backconvert from numbers to strings as well.

 The code below is borrowed to help with the conversion from UTF-8 to
 UTF-16.
 */



define(
    [],
    function() {

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
    }

    return {
        /*
         Convert a UTF-16 to an array of UTF-8 encoded bytes
         */
        utf8bytes_encode : function(str16)
        {
            var bytes = []
            str8 = utf16to8(str16);
            for (var char of str8) {
                bytes.push(char.charCodeAt(0));
            }
            return bytes;
        },

        /*
         Convert a UTF-8 byte array into a string encoded as UTF-16
         */
        utf8bytes_decode : function (bytes8){
            var chars = [];
            for (var byte of bytes8){
                chars.push(String.fromCharCode(byte));
            }
            return utf8to16(chars.join(''));
        }

    }
)
