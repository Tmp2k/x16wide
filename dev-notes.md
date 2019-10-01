# Developer Notes

## Ideas for dynamically loading PRGs

Get emscripten to load the emulator dynamically from a function instead of on page load.
e.g. `loadEmu('r32');` This will allow for specifying the release too.

Part of this function will be to completely remove any existing emulators from  the page/memory first.

Add a paramter to pass in a file object (blob array/file buffer). e.g. `loadEmu('r32',myPrgFile);` If this is set, then 
have enscripten preload this file into the virtual FS using [FS.createPreloadedFile](https://emscripten.org/docs/api_reference/Filesystem-API.html)

The file can be added from the local FS, by the user, using a file input and the JS [FileReader](https://javascript.info/file)

## Next step, adding an assembler/compiler