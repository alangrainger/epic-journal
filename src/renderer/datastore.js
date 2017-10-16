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

  this.createNewEntry = function (data) {
    var created = moment().format(DATE_SQL)
    db.run('INSERT INTO entries (date, created, modified, content) VALUES (?, ?, ?, ?)', [data.date, created, created, data.content], function (err) {
      if (err) {
        console.log(err)
      } else {
        data.entryId = this.lastID
      }
    })
  }

  this.updateEntry = function (data, callback) {
    var modified = moment().format(DATE_SQL)
    db.run('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?', [modified, data.content, data.entryId], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.changes)
      }
    })
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
          var year = row.date.substr(0, 4)
          var month = row.date.substr(5, 2)
          if (!tree[year]) { tree[year] = {} }
          if (!tree[year][month]) { tree[year][month] = [] }
          var day = moment(row.date, 'YYYY-MM-DD').format('DD - dddd')
          tree[year][month].push({date: row.date, value: day})
        })
        callback(tree)
      }
    })
  }
  /* this.getEntryTree = function (callback) {
    var done = function (isIt) {
      if (isIt) {
        console.log(JSON.stringify(tree))
      }
    }

    var tree = {}
    db.serialize(function () {
      db.each('SELECT distinct(strftime(\'%Y\', date)) AS year FROM entries ORDER BY date ASC', function (err, row) {
        if (err) {
          errorMessage(null, err)
        } else {
          var year = row.year
          console.log(year)
          tree[year] = {}
          db.each('SELECT distinct(strftime(\'%m\', date)) AS month FROM entries WHERE strftime(\'%Y\', date) = \'' + year + '\' ORDER BY date ASC',
            function (err, row) {
              if (err) {
                errorMessage(null, err)
              } else {
                var month = row.month
                tree[year][month] = []
              }
            }, function () {
              console.log('m ' + JSON.stringify(tree))
            })
        }
      }, function () {
        if (done()) {
          console.log(JSON.stringify(tree))
        }
      })
    })
    /* if (err) { errorMessage(null, err) }
    var year = row.year
    console.log('asdf')
    tree[year] = []
    getEach('SELECT distinct(strftime(\'%m\', date)) AS month FROM entries WHERE strftime(\'%Y\', date) = \'' + year + '\' ORDER BY date ASC', function (row) {
      var month = row.month
      console.log(month)
      tree[year][month] = []
      var entries = []
      getEach('SELECT * FROM entries WHERE (strftime(\'%Y\', date)) =\'' + year + '\' AND strftime(\'%m\', date) = \'' + month + '\' ORDER BY date ASC', function (row) {
        entries.push(row)
        console.log(row)
      }, function () {
        console.log(entries)
        tree[year][month] = entries
      })
    })
  })
  } */

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
