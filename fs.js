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
    ['third-party/dojo/deferred', 'third-party/utfencode', 'third-party/minimatch'],

    function(Deferred, utfencode, minimatch) {

        var mount_cache = {};

        var DB_VERSION = 21;

        var DATA_STORE = 'FILE_DATA';

        function strRPop(str,sep){
            var parts = str.split('/');
            if (parts.length == 0)
                return '';
            return parts[0:parts.length-1].join('/');
        }

        function checkPath(path){
            if (path[0] != '/')
                return false;
            return true;
        }

        // Return the IndexedDB interface via a Promise
        function db() {
            var db = window.indexedDB ||
                window.mozIndexedDB ||
                window.webkitIndexedDB ||
                window.msIndexedDB;
            if (db)
                defer.resolve(db);
            else
                defer.reject('IndexedDB not available');
            return defer.promise;
        }


        //TODO: Check if mount is actually a document of another mount
        //if so, reject
        function newMount(path) {
            return db().then(function(db) {
                var req;
                var mnt_defer = new Deferred();
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
                return mnt_defer.promise;
            });
        }



        //Try to get a mount point for a particular path.
        //If it is not in the cache, create a new one.
        //Always return a promise.
        function getMount(path) {
            var mnt = mount_cache[path];
            if (mnt) {
                var mnt_defer = new Deferred();
                mnt_defer.resolve(mnt);
                return mnt_defer.promise;
            }
            return newMount(path);
        }


        function findMount(path){
            //Starting with the full path, pop off the last
            //element of the path and search the cache until
            //a match is found
            if (!checkPath)
                throw "Invalid path";
            var try_mnt = path;
            while (try_mnt.length > 0){
                if (try_mnt in mnt_cache)
                    return try_mnt;
                try_mnt = strRPop(try_mnt, '/');
            }
            return null;
        }

        function getObjectStore(path){
            var store_def = new Deferred();
            try {
                var mnt = findMount(path);
                var store_req =
                    mnt.transaction(path, 'readwrite').objectStore(DATA_STORE);
                store_req.oncomplete(function(e){
                    store_def.resolve(store_req.result);
                });
                store_req.onerror(function(e){
                    store_def.reject(e);
                });
            } catch(e){
                store_def.reject(e);
            }
            return store_def;
        }


        function doWrite(path, utf16){
            return getObjectStore(path).then(function(store){
                var put_def = new Deferred();
                var put_req = store.put(utf16,path);
                put_req.onsuccess = function(e){
                    put_def.resolve(true);
                };
                put_req.onerror = function(e){
                    put_def.reject(e);
                }
                return put_def.promise;
            });
        }

        function doRead(path){
            return getObjectStore(path).then(function(store){
                var get_def = new Deferred();
                var get_req = store.get(path);
                get_req.onsuccess = function(e){
                    get_def.resolve(true);
                };
                get_req.onerror = function(e){
                    get_def.reject(e);
                }
                return get_def.promise;
            });
        }

        function doList(pattern){
        }

        function doRemove(pattern){
        }



        // "Public" functions should all return Promises
        return {

            mount: function(path){
                return getMount(path);
            }
            ,

            //This isn't an asynchronous operation, but
            //we're going to pretend it is just to keep
            //the interface consistent
            unmount: function(path){
                var unmnt_defer = new Deferred();
                if (path in mount_cache){
                    mount_cache[path].close();
                    delete mount_cache[path];
                    mnt.resolve(true);
                }
                mnt.resolve(false);
                return unmnt_defer;
            }
            ,

            write: function (path, utf16) {
                return doWrite(path, utf16);
            }
            ,

            read: function (path) {
                return doRead(path);
            }
            ,

            list: function (pattern) {
                return doList(pattern);
            }
            ,

            remove: function (pattern) {
                return doRemove(pattern);
            }

        }
    }
);