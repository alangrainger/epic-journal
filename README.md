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
- Search. Good fast search.

### Please note

Proper File > Open functions are yet to be built, but when you run it the first 
time it will ask you for a database file. Put in the full path plus filename, e.g.

> c:/users/alan/dropbox/journal.epic

Next it will ask you for a password. Put that in, and you're done!

## Configuration

All settings are stored in `%appdata%\epic-journal\epic-config.ini`

To configure custom styles, open up your `epic-config.ini` file, and edit the `customStyles` section. It is an array of objects
in this format:

```
[
  {
    'name': 'Normal',
    'class': false,
    'element': 'p',
    'style': 'font-size: 14pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Heading 1',
    'class': false,
    'element': 'h1',
    'style': 'font-size: 20pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Quote',
    'class': 'quote',
    'element': 'p',
    'style': 'font-style: italic; margin: 1em; background-color: #fcfcfc; padding: 0.9em 1.1em; border: solid 1px #cccccc;'
  }
]
```

- **name** - the friendly name that appears in the dropdown list in the editor
- **class** - your custom class name
- **element** - the HTML element it applies to
- **style** - the style configuration

The 'Quote' style from the list above becomes `p.quote { style }` in the final CSS.
 
To create a new class, simply add a new section at the end, like this:

```
[
  {
    'name': 'Normal',
    'class': false,
    'element': 'p',
    'style': 'font-size: 14pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Heading 1',
    'class': false,
    'element': 'h1',
    'style': 'font-size: 20pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Quote',
    'class': 'quote',
    'element': 'p',
    'style': 'font-style: italic; margin: 1em; background-color: #fcfcfc; padding: 0.9em 1.1em; border: solid 1px #cccccc;'
  },
  {
    'name': 'Fancy New Style',
    'class': 'fancy',
    'element': 'p',
    'style': 'font-family "Comic Sans MS"; font-size: 26pt; color: blue;'
  }
]
```

## Build Setup for Windows

My build environment:

- Windows 10
- Node 8.7.0
- NPM 5.3.0

**Note:** 

``` bash
# install Windows build tools if you don't have a build environment
npm install -g windows-build-tools

# install yarn
npm install -g yarn

# install dependencies
yarn install

# serve with hot reload at localhost:9080
yarn run dev

# build app for production
yarn run build
```
