/*
    This code gets prepended to the start of the emscripten
    generated file 'test_cc.js' by the --prefix-js flag
    during linking.  See the makefile.
 */



// MESSAGE UTILITIES -----------------------------------------------------------------------------
//    The variables and utilities in this block are used for worker thread messaging.


var msg_queue = [];  // Our message queue

// The function that gets called when this thread receives a message
// from its parent.
onmessage = function (msg) {
    msg_queue.push(msg.data);
}

// The function that gets called from C++ to return
// our message queue for processing.  Note that we
// are writing a string to memory; we're relying on
// the C++ side to clean up after ourselves.
// (The JSON array message queue is being written to
// the string).
function doGetMessages() {
    var msgs = JSON.stringify(msg_queue);
    var buffer = _malloc(msgs.length + 1);
    writeStringToMemory(msgs, buffer);
    msg_queue = [];
    return buffer;
}

// This function is called from the C++ side when we
// want to send a message (in the form of a string
// that is deserialized into a json object) to the
// worker thread.
function doPostMessage(msg_str) {
    var json_msg = JSON.parse(msg_str);
    self.postMessage(json_msg);
}


// FILE HANDLING -----------------------------------------------------------------------------
//      The variables and functions in this block are used to handle the asynchronous
//      nature of file synchronizing in emscripten's IDBFS.


// FS_STATUS contains the state of the filesystem
//    0  The file system is ready for reading and writing
//    1  The file system is synchronizing
//   -1  The file system encountered an error during syncing and should not be used
var FS_STATUS = 0;


// This function is called from the C++ side to perform the file syncing.
// The populate variable controls whether data from the IndexedDB database
// populates our file system.  (True =
//
// The FS.syncfs function is internal to emscripten.  The second parameter
// is a callback function.   Because this operation is asynchronous, we need
// to let the C++ side of the code know when the filesystem is ready.
//
// An FS_STAT < 1 indicates that we are done with trying to sync; FS_STAT > 1 indicates
// we're still busy.
function doSyncFS(populate) {
    FS_STATUS = 1;  //Mark that we are syncing
    FS.syncfs(populate, function (err) {
        //This block gets triggered when synchronizing is complete
        if (err) {
            FS_STATUS = -1;  // On error, FS is not available
        }
        else {
            FS_STATUS = 0;   // Syncing successful, the FS is available
        }
    })
}


// Utility function to check if there was a syncing error
function fsError(){
    return FS_STATUS < 0;
}

// Utility function to check if the FS is busy syncing
function fsBusy(){
    return FS_STATUS > 0;
}

// Utility function to check if the filesystem is ready for reading and writing
function fsReady(){
    return FS_STATUS === 0;
}
