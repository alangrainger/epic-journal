# Epic Journal

A free cross-platform encrypted daily journal / diary app, with full CSS styling. It is built with Sqlite3 and 
SQLcipher with AES 256 CBC encryption.

Download the [latest release here](https://github.com/alangrainger/epic-journal/releases/latest).

[![Screenshot](screenshot-small.jpg)](screenshot.jpg?raw=true)

I built it as a free and open replacement for *The Journal* by DavidRM, which I have used 
for many years. The main issues I wanted to solve were better styling, and the ability to know that my
entries are safe for the long-term, with an open and known database format.

## Features

- Fast and clean Electron app
- AES 256 CBC encryption
- Single journal file that you can store in your Dropbox, or wherever you like
- Custom style types
- Pure HTML5 compatible
- Syntax highlighting
- Insertable templates
- Tagging
- Image support
- Active development

## Usage

[See the documentation here](https://epicjournal.xyz/docs/).

## Upcoming features

I'll be working towards feature parity with The Journal, but the next things I'm working on are:

- Mobile app (nothing fancy, just to add entries on the go)
- Search. Good fast search.
- Multiple folders. They will be tabs above the editor - think of them as master categories.
- Linking between entries
- Minimise to tray, and hotkey open
- Notes folder – i.e. non date-related entries
- Emoji support

## Building

### Windows

It's quite difficult to get win-sqlcipher to work. Here are the steps that worked for me:

First, you need the right library files in your system directory. I got the DLL files from [DB Browser for SQLite](http://sqlitebrowser.org/) Windows build.

I've shared them here. Copy them to your System32 folder:

https://drive.google.com/file/d/0BwEyNB4Ss8kjLWVDVHFCVkRLT2s/view?usp=sharing

**My build environment:**

- Windows 10
- Node 8.7.0
- NPM 5.3.0 (this is important, you will get an error on a newer version. You can use [npm-windows-upgrade](https://www.npmjs.com/package/npm-windows-upgrade) to easily switch this)
- windows-build-tools 1.3.2
- electron 1.7.9
- win-sqlcipher 0.0.4

**Steps:**

1. Copy DLLs to System32
1. Install Windows Build Tools if you don't have them - `npm install -g windows-build-tools`
1. npm install
1. `.\node_modules\.bin\electrion-rebuild`

### MacOS / Linux

**NOTE: I haven't yet got unix-sqlcipher to compile properly on Mac. If you know how, let me know!** 

To build on MacOS / Linux, you will need to make two changes:

1. In `package.json`, change `"win-sqlcipher": "^0.0.4"` to be `"unix-sqlcipher": "^0.0.4"`

1. In `src/main/datastore.js`, replace 'win-sqlcipher' with 'unix-sqlcipher'.

Then build as normal.