import { remote } from 'electron'

const fs = require('fs')

let Config = function () {
  this.data = {}

  // Set INI file location
  this.iniFile = remote.app.getPath('userData') + '/epic-config.ini'

  // Read existing data
  if (fs.existsSync(this.iniFile)) {
    let raw = fs.readFileSync(this.iniFile, 'utf8')
    this.data = JSON.parse(raw)
  }

  // Write data function
  this.write = function () {
    fs.writeFileSync(this.iniFile, JSON.stringify(this.data), 'utf8')
  }
}

export default new Config()
