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


