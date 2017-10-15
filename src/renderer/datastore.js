import { remote } from 'electron'
import moment from 'moment'

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

var filename = remote.app.getPath('userData') + '/datastore.db'

// var sqlite3 = require('win-sqlcipher').verbose()
var sqlite3 = require('sqlite3').verbose()
var sql = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE || sqlite3.OPEN_CREATE, function (err) {
  if (err) {
    errorMessage('Fatal error: Cannot create connection to database file, please restart the app.', err)
  }
})

// Test DB read/write
sql.serialize(function () {
  sql.run('CREATE TABLE test (id INTEGER)', function (err) {
    if (err) { errorMessage('Fatal error: Database not writeable, please check if your database file is locked and restart the app.', err) }
  })
  sql.run('DROP TABLE test')
})

function createTables () {
  // Entries
  sql.serialize(function () {
    sql.run(
      'CREATE TABLE IF NOT EXISTS entries(' +
      'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
      'date TEXT, ' + // yyyy-mm-dd
      'created TEXT, ' +
      'modified TEXT, ' +
      'content TEXT);')

    sql.run('CREATE INDEX IF NOT EXISTS index_date ON entries(date)')

    // Tags
    sql.run(
      'CREATE TABLE IF NOT EXISTS tags(' +
      'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
      'name TEXT, ' +
      'class TEXT);')

    sql.run(
      'CREATE TABLE IF NOT EXISTS entry_tags(' +
      'entry_id INTEGER, ' +
      'tag_id INTEGER);')
  })
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
    sql.run('INSERT INTO entries (date, created, modified, content) VALUES (?, ?, ?, ?)', [data.date, created, created, data.content], function (err) {
      if (err) {
        console.log(err)
      } else {
        data.entryId = this.lastID
      }
    })
  }

  this.updateEntry = function (data, callback) {
    var modified = moment().format(DATE_SQL)
    sql.run('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?', [modified, data.content, data.entryId], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.changes)
      }
    })
  }

  this.getEntryByDate = function (date, callback) {
    if (!date) return false
    sql.get('SELECT * FROM entries WHERE date = ?', date, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    })
  }

  var getEach = function (query, callback) {
    sql.each(query, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    })
  }
  this.getEach = getEach

  this.getEntryTree = function () {
    var tree = {}
    getEach('SELECT distinct(strftime(\'%Y\', date)) AS year FROM entries ORDER BY date ASC', function (row) {
      var year = row.year
      tree[year] = {}
      getEach('SELECT distinct(strftime(\'%m\', date)) AS month FROM entries WHERE strftime(\'%Y\', date) = \'' + year + '\' ORDER BY date ASC', function (row) {
        var month = row.month
        tree[year][month] = []
        getEach('SELECT * FROM entries WHERE (strftime(\'%Y\', date)) =\'' + year + '\' AND strftime(\'%m\', date) = \'' + month + '\' ORDER BY date ASC', function (row) {
          tree[year][month].push(row)
        })
      })
    })
    return tree
  }
}

function errorMessage (message, err) {
  console.log(message)
  console.log(err)
}

export default new Database()
