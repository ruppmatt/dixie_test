CFLAGS :=  -g4 -pedantic -Wall -std=c++14 -Wno-dollar-in-identifier-extension

EXPORT_FUNCS := -s EXPORTED_FUNCTIONS="['_main', '_RuntimeLoop', '_SyncFS']"
EMTERP_WHITE := "['_main', '_RuntimeLoop', '_SyncFS']"
EMTERPRETIFY_FLAGS := -s EMTERPRETIFY=1 -s EMTERPRETIFY_ASYNC=1 -s EMTERPRETIFY_WHITELIST=$(EMTERP_WHITE)
JS_FLAGS := --pre-js prepend.js
MEM_FLAGS := -s ALLOW_MEMORY_GROWTH=1
LINK_FLAGS :=  -o test_cc.js $(EXPORT_FUNCS) $(EMTERPRETIFY_FLAGS) $(JS_FLAGS) $(MEM_FLAGS)

all: test_cc.js

test.o: test.cc
	em++ -c $(CFLAGS) test.cc

test_cc.js: test.o prepend.js
	em++ test.o $(LINK_FLAGS)

clean:
	rm -f test_cc.js test.o


