/**
 * Created by ruppmatt on 1/5/16.
 */
/*
The "filesystem" we're going to create is going to assume that the
root directory is the equivalent of an emscripten mount point.  In
other words, the directory mounted is going to serve as the name
of our database.  The document store within the database well be,
as per emscripten, FILE_DATA.

*/
define(
    ['dojo/Deferred', 'third-party/UTFEncode', 'third-party/minimatch'],

    function(Deferred, UTFEncode, minimatch) {

        var mount_cache = {};

        var DB_VERSION = 21;

        var DATA_STORE = 'FILE_DATA';

        function db() {
            var db = window.indexedDB ||
                window.mozIndexedDB ||
                window.webkitIndexedDB ||
                window.msIndexedDB;
            var defer = new Deferred();
            if (db)
                defer.resolve(db);
            else
                defer.reject('IndexedDB not available');
            return defer.promise;
        }

        function newMount(path) {
            var mnt_defer = new Deferred();
            db().then(function(db) {
                var req;
                try {
                    req = db.open(path, DB_VERSION);
                } catch (err) {
                    mnt_defer.reject(err);
                }
                req.onupgradeneeded = function(e) {
                    var mnt = e.target.result;
                    var trans = e.target.transaction;
                    var store;
                    if (mnt.objectStoreNames.contains(DATA_STORE)) {
                        store = trans.objectStore(DATA_STORE);
                    } else {
                        store = mnt.createObjectStore(DATA_STORE);
                    }
                    if (!store.indexNames.contains('timestamp')) {
                        store.createIndex('timestamp', 'timestamp', {unique: false});
                    }
                };
                req.onsuccess = function() {
                    mount_cache[path] = req.result;
                    mnt_defer.resolve(req.result);
                };
                req.onerror = function(err) {
                    mnt_defer.reject(err);
                };
            });
            return mnt_defer.promise;
        }


        function getMount(path) {
            var mnt = mount_cache[path];
            if (mnt) {
                var mnt_defer = new Deferred();
                mnt_defer.resolve(mnt);
                return mnt_defer.promise;
            }
            return newMount(path);
        }

        function mount(path, reset) {
            return getMount(path);
        }


        function unmount(path) {
            if (path in mount_cache){
                mount_cache[path].close();
                delete mount_cache[path];
            }
        },


        return {

            write: function (path, utf16) {
                return getMount(path)
                    .then(function(mnt){

                    });
            }
            ,

            read: function (path) {
            }
            ,

            list: function (pattern) {
            }
            ,

            remove: function (path) {
            }
            ,

            unmountAll: function () {
                for (mnt in mount_cache){
                    mnt.close();
                }
            }
        }
    }
);