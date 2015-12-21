/*
 The purpose of this javascript prepended code is to:
 (1) keep consistant state information about avida in order to...
 (2) handle "file system" access rights and
 (3) make sure that worker-spawners have appropriate state information, also
 (4) provide message passing features such as
 (5) queuing messages when Avida is actively running
 (6) passing messages directly when avida is in an inactive state, and finally
 (7) provide functionality for Avida to pass messages to worker-spawners

 All function calls into and out of Avida handling messages will
 be points to strings of JSON objects.
 */

var msg_queue = [];

onmessage = function (msg) {
    msg_queue.push(msg.data);
}

function doGetMessages() {
    var msgs = JSON.stringify(msg_queue);
    var buffer = _malloc(msgs.length + 1);
    writeStringToMemory(msgs, buffer);
    msg_queue = [];
    return buffer;
}


function doPostMessage(msg_str) {
    console.log(msg_str);
    var json_msg = JSON.parse(msg_str);
    self.postMessage(json_msg);
}

var FS_STATUS = 0;
function doSyncFS(populate) {
    FS_STATUS = 1;
    FS.syncfs(populate, function (err) {
        if (err) {
            FS_STATUS = -1;
        }
        else {
            FS_STATUS = 0;
        }
    })
}

function fsError(){
    return FS_STATUS < 0;
}

function fsBusy(){
    return FS_STATUS > 0;
}

function fsReady(){
    return FS_STATUS === 0;
}

