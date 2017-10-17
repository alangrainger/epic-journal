import { remote } from 'electron'
import moment from 'moment'

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

var filename = remote.app.getPath('userData') + '/datastore.db'

// var sqlite3 = require('win-sqlcipher').verbose()
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE || sqlite3.OPEN_CREATE, function (err) {
  if (err) {
    errorMessage('Fatal error: Cannot create connection to database file, please restart the app.', err)
  }
})

// Test DB read/write
db.serialize(function () {
  db.run('CREATE TABLE test (id INTEGER)', function (err) {
    if (err) { errorMessage('Fatal error: Database not writeable, please check if your database file is locked and restart the app.', err) }
  })
  db.run('DROP TABLE test')
})

function createTables () {
  // Entries
  db.serialize(function () {
    db.run(
      'CREATE TABLE IF NOT EXISTS entries(' +
      'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
      'date TEXT, ' + // yyyy-mm-dd
      'created TEXT, ' +
      'modified TEXT, ' +
      'content TEXT);')

    db.run('CREATE INDEX IF NOT EXISTS index_date ON entries(date)')

    // Tags
    db.run(
      'CREATE TABLE IF NOT EXISTS tags(' +
      'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
      'name TEXT, ' +
      'class TEXT);')
    db.run(
      'CREATE TABLE IF NOT EXISTS entry_tags(' +
      'entry_id INTEGER, ' +
      'tag_id INTEGER);')

    // Options
    db.run(
      'CREATE TABLE IF NOT EXISTS options(' +
      'name TEXT PRIMARY KEY, ' +
      'value TEXT);')
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

  this.createNewEntry = function (data, callback) {
    var created = moment().format(DATE_SQL)
    db.run('INSERT INTO entries (date, created, modified, content) VALUES (?, ?, ?, ?)', [data.date, created, created, data.content], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.lastID)
      }
    })
  }

  this.updateEntry = function (entry, callback) {
    var modified = moment().format(DATE_SQL)
    db.run('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?', [modified, entry.content, entry.id], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.changes)
      }
    })
  }

  this.deleteEntry = function (entry, callback) {
    // Delete from the database if the entry is blank
    if (entry.id && Number.isInteger(entry.id)) {
      db.run('DELETE FROM entries WHERE entry_id = ?', entry.id, function (err) {
        if (err) {
          console.log(err)
        } else {
          callback(this.changes)
        }
      })
    }
  }

  this.getEntryByDate = function (date, callback) {
    if (!date) return false
    db.get('SELECT * FROM entries WHERE date = ?', date, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    })
  }

  this.getEntryById = function (entryId, callback) {
    if (!entryId) return false
    console.log(entryId)
    db.get('SELECT * FROM entries WHERE entry_id = ?', entryId, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    })
  }

  var getEach = function (query, callback, complete) {
    db.each(query, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    }, complete)
  }
  this.getEach = getEach

  this.getEntryTree = function (callback) {
    var tree = {}
    db.all('SELECT * FROM entries ORDER BY date ASC', function (err, rows) {
      if (err) {
        errorMessage(err)
      } else {
        rows.forEach(function (row) {
          /*
          I feel that this section is a kludge, but I don't know a better way to do it :\
           */
          var year = row.date.substr(0, 4)
          var month = moment(row.date, 'YYYY-MM-DD').format('MMMM')
          var day = moment(row.date, 'YYYY-MM-DD').format('DD - dddd')

          if (!tree[year]) { tree[year] = {} }
          if (!tree[year]['months']) { tree[year]['months'] = {} }
          if (!tree[year]['months'][month]) { tree[year]['months'][month] = {} }
          if (!tree[year]['months'][month]['entries']) { tree[year]['months'][month]['entries'] = [] }

          tree[year]['show'] = true
          tree[year]['months'][month]['show'] = true
          tree[year]['months'][month]['entries'].push({date: row.date, value: day})
        })
        callback(tree)
      }
    })
  }

  this.getOption = function (name, callback) {
    if (name) {
      db.get('SELECT * FROM options WHERE name = ?', name, function (err, row) {
        if (err) {
          errorMessage(null, err)
        } else {
          callback((row && row.value) ? row.value : null)
        }
      })
    }
  }

  this.setOption = function (name, value) {
    db.run('INSERT OR REPLACE INTO options VALUES (?, ?)', [name, value], function (err) {
      if (err) {
        errorMessage(null, err)
      }
    })
  }
}

function errorMessage (message, err) {
  if (message) {
    console.log(message)
  }
  console.log(err)
}

export default new Database()
