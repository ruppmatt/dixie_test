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
                fs.read(root_path + '/ipsum.txt')
                    .then(function (r) {
                            display('Read /test/ipsum.txt as ' + r);
                        }
                        , function (err) {
                            display('Could not read /test/ipsum.txt');
                        });
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
    fs.mount('/test').then(function() {
            display('Successfully mounted directory.');
            fs.write(root_path + '/disco.txt', 'Amazingly few discotheques provide jukeboxes.')
                .then(function (result) {
                        display('Wrote disco.txt')
                    },
                    function (err) {
                        display('Cannot write disco.txt')
                    });
            fs.read(root_path + '/disco.txt')
                .then(function (result) {
                        display('Read disco.txt' + result)
                    },
                    function (err) {
                        display('Cannot read disco.txt')
                    });
            fs.write(root_path + '/fox.txt', 'The quick brown fox jumped over the lazy dog.')
                .then(function (result) {
                        display('Wrote disco.txt')
                    },
                    function (err) {
                        display('Cannot write fox.txt')
                    });
        }, function(err) {display('Something unhandled happened.  Mounting perhaps?');}
    );
}



var root_path = '/test';  // The virtual path we are writing into
var worker = new Worker('test_cc.js');  // Launch a worker using the code in test_cc.js (emscripten-generated)
worker.onmessage = processMessage;  // Send received messages from the worker through processMessage the function

var testTimer = setTimeout(doTest, 1500);  // We're going to wait 1 second to get our worker ready before we do our tests


