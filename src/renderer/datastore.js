import { remote } from 'electron'
import moment from 'moment'

var filename = remote.app.getPath('userData') + '/datastore.db'
var SQLite3 = require('better-sqlite3')
var sql = new SQLite3(filename)

function createTables () {
  // Entries
  sql.prepare(
    'CREATE TABLE IF NOT EXISTS entries(' +
    'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
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

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'

  this.speak = function () {
    return 'helo'
  }

  this.createNewEntry = function (content) {
    var created = moment().format()
    var id = sql.prepare('INSERT INTO entries (created, modified, content) VALUES (?, ?, ?)').run(created, created, content).lastInsertROWID

    return id
  }

  this.getEntry = function (entryId) {
    var entry = sql.prepare('SELECT * FROM entries WHERE entry_id = ' + entryId).get()
    return entry
  }
}

export default new Database()
