import { remote } from 'electron'

const fs = require('fs')

var Config = function () {
  this.iniFile = remote.app.getPath('userData') + '/epic-config.ini'

  this.data = {}
  if (fs.existsSync(this.iniFile)) {
    var raw = fs.readFileSync(this.iniFile, 'utf8')
    this.data = JSON.parse(raw)
  }

  this.write = function () {
    fs.writeFileSync(this.iniFile, JSON.stringify(this.data), 'utf8')
  }
}

export default new Config()
