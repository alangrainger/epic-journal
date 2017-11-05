# Epic Journal

A cross-platform encrypted daily journal / diary app, with full CSS styling. It is built with Sqlite3 and 
SQLcipher with AES 256 CBC encryption.

I have builds for Windows, and I'd be very happy for anyone to submit builds for Mac and Linux.

**NOTE: I have not paid for a Windows code-signing certificate, so you will get a warning when you
try to install it.**

Download the [latest release here](https://github.com/alangrainger/epic-journal/releases).

![Screenshot](screenshot.png?raw=true)

I built it as a free and open replacement for [The Journal](http://www.davidrm.com/) by DavidRM, which I have used 
for many years. The main issues I wanted to solve were better styling, and the ability to know that my
entries are safe for the long-term, with an open and known database format.

## Features

- Fast and clean
- AES 256 CBC encryption
- Single journal file that you can store in your Dropbox, or wherever you like
- Custom style types
- Pure HTML5 compatible
- Insertable templates
- Tagging
- Image support
- Active development

## Usage

#### Using templates

To create a template, click the Go menu, and then Edit Templates. Give your template a name and fill in some text
and it will auto-save it for you.

To insert a template, right-click anywhere in an entry and choose Insert Template. 

#### Editing your own styles

Click Go > Edit Styles.

The editor I'm using is TinyMCE, and it requires you to specify if it's a block or inline level element.
If you wanted to make a highlighted span class, you'd set it up like this:

- Element: `span`
- Type: `inline`
- Class name: `myclass`
- Style: `background-color: yellow;`

This page needs a bit of work, but any styles you set up here will persist into future versions.

## Upcoming features

I'll be working towards feature parity with The Journal, but the next things I'm working on are:

- Search. Good fast search.
- Multiple folders. They will be tabs above the editor - think of them as master categories.
- Minimise to tray, and hotkey open.
- Emoji support.
