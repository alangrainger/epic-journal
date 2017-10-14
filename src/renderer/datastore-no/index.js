import { remote } from 'electron'

var filename = remote.app.getPath('userData') + '/datastore.db'
var db = require('sqlite-sync')

try {
  db.connect(filename)
} catch (err) {
  console.log(err.message)
}

db.run(
  'CREATE TABLE IF NOT EXISTS entries(' +
  'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
  'created TEXT, ' +
  'modified TEXT, ' +
  'content TEXT);',
  function (res) {
    if (res.error) {
      throw res.error
    }
  })

export default db
