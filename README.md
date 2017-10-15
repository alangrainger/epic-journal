# Epic Journal

> A daily journal app

#### Build Setup for Windows

First, be sure that you have long paths enabled:

Go to ```HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem```, find
the key ```LongPathsEnabled ``` and change the value to 1. You may need to create 
this key yourself. 

``` bash
# install Windows build tools
npm install -g windows-build-tools

# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build

# rebuild Sqlite3 for Electron
.\node_modules\.bin\electron-rebuild -w sqlite3 -p

```

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
