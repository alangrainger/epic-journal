# Epic Journal

A password-protected, encrypted daily journal / diary app for Windows, with full CSS styling. It is built with Sqlite3 and 
SQLcipher with AES 256 CBC encryption.

Download the [latest release here](https://github.com/alangrainger/epic-journal/releases).

![Screenshot](screenshot.png?raw=true)

The app is in progress, but completely usable right now. New features are being added
constantly, but you can safely start adding entries. The journal is a single file
that you can store in your Dropbox, or wherever you like.

I built it as an open-source replacement for [The Journal](http://www.davidrm.com/) by DavidRM, which I have used 
for years. The main issues I wanted to solve were better styling, and the ability to know that my
entries are safe, with an open and known database format.

### Upcoming features

I'll be working towards feature parity with The Journal, but the next things I'm working on are:

- Tagging of entries, both inline, and at the entry level.
- A better CSS editing feature. The existing one DOES work though!
- Search. Good fast search.

### Please note

Proper File > Open functions are yet to be built, but when you run it the first 
time it will ask you for a database file. Put in the full path plus filename, e.g.

> c:/users/alan/dropbox/journal.epic

Next it will ask you for a password. Put that in, and you're done!

## Build Setup for Windows

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
