#include <fstream>
#include <string>
#include <emscripten.h>
#include <iomanip>
#include <sstream>
#include "json.hpp"
using json = nlohmann::json;


/*
    Our global variables to make our lives easier but not
    necessarily smarter.
*/
bool dom_fs_ready = false;  // Has the DOM told us it is OK to use the file system?

const std::string root_path = "/test";  //Path to write our data to
const std::string read_path = root_path + "/fox.txt";  //Our read example
const std::string write_path = root_path + "/ipsum.txt"; //Our write example
const std::string contents =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";  //Our write example's contents
std::ostringstream status_buf;  //A buffer to store status messages that we send back to the DOM




/*
    The c++-facing side of the message receiving utility.
    In this case, we receive a message in the form of a string
    pointer.  Once we're done converting the pointer's string
    into a JSON object, we must delete it ourselves.
*/
void CheckMessages()
{
  std::uint32_t msg_buf = EM_ASM_INT_V(return doGetMessages(););
  json msgs = json::parse( (char*) msg_buf);
  std::free( (void*) msg_buf);
  for (auto msg : msgs){
    if (msg["type"] == "status" and msg["msg"] == "dom_fs_ready")
        dom_fs_ready = true;
  }
}


/*
    The c++-facing side of the send message utility
    to send messages back to the worker's parent.

    As we are restricted in what can be sent,
    the message is sent as a string.
*/
void SendMsg(const std::string& msg)
{
    EM_ASM_ARGS(
        {
            doPostMessage(Pointer_stringify($0));
        },
        msg.c_str()
    );
}


/*
    A function to send status messages to the DOM
    for display.

    Note that although SendStatus is used all over
    the place, it does not need to be marked for
    exporting.  This is because it is never on the
    stack when emscripten_sleep is called, and nothing
    on the JS-side of the code calls it.
*/
void SendStatus(){
    json msg;
    msg["type"] = "toDisplay";
    msg["msg"] = status_buf.str();
    SendMsg(msg.dump());
    status_buf.str("");
    status_buf.clear();
}


/*
    Make a directory called test and mount it using emscripten's
    IDBFS filesystem.
*/
void MountFS()
{
    EM_ASM(
        FS.mkdir('/test');
        FS.mount(IDBFS, {}, '/test');
      );
}


/*
    This just provides a c++-side wrapper for checking to
    see whether or not the filesystem is ready.
*/
bool FSBusy(){
    return static_cast<bool>(EM_ASM_INT_V(return fsBusy();));
}


/*
    Synchronize our file system.  Because this is an asynchronous
    operation, code within the prepend.js file handles waiting
    for the filesystem to become available.  The function that
    handles the sync on the JS side is doSyncFS.

    This function is marked for export because emscripten_sleep
    is called to wait for the filesystem to become ready after
    a sync operation.

    The results of this operation are logged to the status buffer
    for display.
*/
extern "C"
bool SyncFS(bool restore_from_db)
{
  EM_ASM_ARGS( {doSyncFS($0);}, static_cast<int>(restore_from_db) );
  while (FSBusy()){
    emscripten_sleep(100);
  }
  bool fs_ready = (EM_ASM_INT_V(return fsReady();));
  if (fs_ready){
    status_buf << "File system synchronized (populate="
              << std::boolalpha << restore_from_db << ")" << std::endl;
  } else {
    status_buf << "File system NOT synchronized (populate="
              << std::boolalpha << restore_from_db << ")" << std::endl;
  }
  return fs_ready;
}





/*
    Try to write a file and log our results to our status buffer for display in the dom.
*/
bool WriteFile(const std::string& path, const std::string& data)
{
    std::ofstream fot(path.c_str());
    if (!fot.is_open()){
        status_buf << "Unable to open file " + path + " for writing." << std::endl;
        return false;
    }
    fot << data;
    if (fot.good()){
         status_buf << "Worker thread wrote: " << data << " to file " << path << std::endl;
    }
    fot.close();
    return true;
}


/*
    Try to read a file and log results to our status buffer for displaying in the dom.
*/
bool ReadFile(const std::string& path)
{
    std::ifstream fin(path.c_str());
    if (!fin.is_open()){
            status_buf << "Unable to open file " + path + " for reading." << std::endl;
            return false;
        }
    std::ostringstream oss;
    oss << fin.rdbuf();
    fin.close();
    status_buf << "Worker thread read from " << path << " the contents: " << oss.str() << std::endl;
    return true;
}



/*
    Actually perform our tests of syncing, reading, and writing.

    This function is marked for exporting because the SyncFS function
    uses an asynchronous wait. All functions that call SyncFS (the one
    in this file) will be on the call stack when emscripten_sleep is called.
    Consequently, emscripten needs to see this method to save its state on
    the call stack for sleeping.
*/
extern "C"
bool doTests()
{
if (dom_fs_ready){
    if (!SyncFS(true))
        return false;
    SendStatus();
    if (!ReadFile(read_path))
    return false;
    SendStatus();
    if (!WriteFile(write_path, contents))
        return false;
    SendStatus();
    if (!ReadFile(write_path))
        return false;
    SendStatus();
    if (!SyncFS(false))
        return false;
    SendStatus();
    if (!SyncFS(false))
        return false;
    return true;
}



/*
    The runtime loop waits until the dom thread sends us a message
    to let us know that the file system is ready.

    This function is marked for external export for two reasons:
    (1) it calls emscripten_sleep
    (2) this function is somewhere in the callstack when one
        of its children is calls emscripten_sleep (e.g. any call to SyncFS)
*/
extern "C"
bool RuntimeLoop()
{
    while(!dom_fs_ready){
        CheckMessages();
        emscripten_sleep(100);
    }
    return DoTests();
}



extern "C"
int main(int argc, char* argv[])
{
    status_buf << "Worker: Inside main()" << std::endl;
    SendStatus();
    MountFS();
    bool success = RuntimeLoop();
    if (success){
        json fs_ready;
        fs_ready["type"] = "status";
        fs_ready["msg"] = "wkr_fs_ready";
        SendMsg(fs_ready.dump());
    }
    return !success;
}
