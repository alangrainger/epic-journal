# Epic Journal

A cross-platform encrypted daily journal / diary app, with full CSS styling. It is built with Sqlite3 and 
SQLcipher with AES 256 CBC encryption.

I have builds for Windows, and I'd be very happy for anyone to submit builds for Mac and Linux.

Download the [latest release here](https://github.com/alangrainger/epic-journal/releases).

![Screenshot](screenshot.png?raw=true)

I built it as a free and open replacement for [The Journal](http://www.davidrm.com/) by DavidRM, which I have used 
for many years. The main issues I wanted to solve were better styling, and the ability to know that my
entries are safe for the long-term, with an open and known database format.

## Usage

#### Creating templates

Click the Go menu, and then Edit Templates. Give your template a name and fill in some text
and it will auto-save it for you. 

#### Editing your own styles

Click Go > Edit Styles. (Yes, this page needs a little bit of work...)

The editor I'm using is TinyMCE, and it requires you to specify if it's a block or inline level element.
If you wanted to make a highlighted span class, you'd set it up like this:

- Element: `span`
- Type: `inline`
- Class name: `myclass`
- Style: `background-color: yellow;`

## Upcoming features

I'll be working towards feature parity with The Journal, but the next things I'm working on are:

- **Tagging of entries**, both inline, and at the entry level.
- Search. Good fast search.
- Minimise to tray, and hotkey open.
- Emoji support.
