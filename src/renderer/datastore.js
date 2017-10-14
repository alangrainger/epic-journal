import { remote } from 'electron'
import moment from 'moment'

const DATE_SQL = 'YYYY-MM-DD hh:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

var filename = remote.app.getPath('userData') + '/datastore.db'
var SQLite3 = require('better-sqlite3')
var sql = new SQLite3(filename)

function createTables () {
  // Entries
  sql.prepare(
    'CREATE TABLE IF NOT EXISTS entries(' +
    'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'date TEXT, ' +
    'created TEXT, ' +
    'modified TEXT, ' +
    'content TEXT);').run()

  // Tags
  sql.prepare(
    'CREATE TABLE IF NOT EXISTS tags(' +
    'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'name TEXT, ' +
    'class TEXT);').run()

  sql.prepare(
    'CREATE TABLE IF NOT EXISTS entry_tags(' +
    'entry_id INTEGER, ' +
    'tag_id INTEGER);').run()
}

function Database () {
  // Set up the tables if not existing
  createTables()

  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'

  this.createNewEntry = function (data) {
    var created = moment().format(DATE_SQL)
    var id = sql.prepare('INSERT INTO entries (date, created, modified, content) VALUES (?, ?, ?, ?)').run(data.date, created, created, data.content).lastInsertROWID

    return id
  }

  this.updateEntry = function (entryId, content) {
    var modified = moment().format()
    var result = sql.prepare('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?').run(modified, content, entryId).changes
    return result
  }

  this.getEntry = function (entryId) {
    try {
      var entry = sql.prepare('SELECT * FROM entries WHERE entry_id = ' + entryId).get()
    } catch (e) {
      console.log(e)
    }
    return entry
  }

  this.getEntryByDate = function (date = null) {
    date = date || moment().format(DATE_DAY)
    try {
      var entry = sql.prepare('SELECT * FROM entries WHERE date = "' + date + '"').get()
    } catch (e) {
      console.log(e)
    }
    return entry
  }
}

export default new Database()
