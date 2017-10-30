import { app } from 'electron'

let fs = require('fs')

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
    fs.writeFile(this.iniFile, output, 'utf8', (err) => {
      if (err) console.log(err)
    })
  }
}

export default new Config()
