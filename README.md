# Epic Journal

> A daily journal app

#### Build Setup for Windows

My build environment:

- Windows 10
- Node 7.9.0
- NPM 4.2.0

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
