import { app } from 'electron'

var fs = require('fs')

let defaultStyles = [
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
    'name': 'Heading 2',
    'class': false,
    'element': 'h2',
    'style': 'font-size: 18pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Heading 3',
    'class': false,
    'element': 'h3',
    'style': 'font-size: 16pt; margin-bottom: 0.7em;'
  },
  {
    'name': 'Quote',
    'class': 'quote',
    'element': 'p',
    'style': 'font-style: italic; margin: 1em; background-color: #fcfcfc; padding: 0.9em 1.1em; border: solid 1px #cccccc;'
  }
]

let Config = function () {
  // Default data
  this.data = {}

  // Set INI file location
  this.iniFile = app.getPath('userData') + '/epic-config.ini'

  // Read existing data
  if (fs.existsSync(this.iniFile)) {
    let raw = fs.readFileSync(this.iniFile, 'utf8')
    this.data = JSON.parse(raw)
  }

  // Write data function
  this.write = function () {
    let output = JSON.stringify(this.data, null, 2)
    output = output.replace(/\r?\n/g, '\r\n') // Windows line feeds
    fs.writeFileSync(this.iniFile, output, 'utf8')
  }

  // Check to see if the custom style section exists
  if (!this.data.customStyles) {
    this.data.customStyles = defaultStyles
    this.write()
  }
}

export default new Config()
