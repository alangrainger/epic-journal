# Epic Journal

> An encrypted daily journal app

The app is in progress, but completely usable right now.

Proper File > Open functions are yet to be built, but when you run it the first 
time it will ask you for a database file. Put in the full path plus filename, e.g.

> c:/users/alan/dropbox/journal.epic

Next it will ask you for a password. Put that in, and you're done!

#### Build Setup for Windows

My build environment:

- Windows 10
- Node 8.7.0
- NPM 5.3.0

**Note:** 

``` bash
# install Windows build tools if you don't have a build environment
npm install -g windows-build-tools

# install dependencies
npm install

# rebuild Win-SQLcipher / Sqlite3 for Electron
.\node_modules\.bin\electron-rebuild -w sqlite3 -p

# serve with hot reload at localhost:9080
npm run dev

# build app for production
npm run build
```

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
