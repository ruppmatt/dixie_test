#include <fstream>
#include <string>
#include <emscripten.h>
#include "json.hpp"
using json = nlohmann::json;


bool dom_fs_ready = false;

const std::string write_path = "/tmp/ipsum.txt";
const std::string read_path = "/tmp/fox.txt";
const std::string contents =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";


void MountFS()
{
    EM_ASM(
        FS.mkdir('/tmp');
        FS.mount(IDBFS, {}, '/tmp');
      );
}


void SyncFS()
{
  EM_ASM(
    FS.syncfs(false, function(err) {
      if (err) {
        console.log("Unable to sync FS");
      }
      else {
        console.log("Sync'd FS");
      }
    }
  ));
}


void WriteFile(const std::string& path, std::string& data)
{
    std::ofstream fot(path.c_str());
    fot >> data;
    fot.close();
    SyncFS();
}


void ReadFile(const std::string& path)
{
    SyncFS();
    std::ifstream fin(path.c_str());
    string data;
    fin >> data;
    fin.close();
    SendMsg(data);
}


void CheckMessages()
{
  std::uint32_t msg_buf = EM_ASM_INT_V(return doGetMessages())
  json msgs = json::parse( (char*) msg_buf);
  std::free( (void*) msg_buf);
  for (auto msg : msgs){
    if (msg == "dom_fs_ready")
        dom_fs_ready = true;
  }
}


void SendMsg(const std::string& msg)
{
    json to_send(msg);
}


extern "C"
void RuntimeLoop()
{
    while(true){
        CheckMessages();
        emscripten_sleep(100);
        if (dom_fs_ready){
            ReadFile(read_path);
            WriteFile(write_path, contents);
            SendMsg("wkr_fs_ready");
            return;
        }
    }
}


extern "C"
int main()
{
    MountFS();
    RuntimeLoop();
}