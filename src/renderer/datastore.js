import moment from 'moment'

const SCHEMA_VERSION = 2

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

function Datastore () {
  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'

  let db
  let datastore = this

  this.openDatabase = function (password, filename) {
    return new Promise(function (resolve, reject) {
      let sqlite3 = require('win-sqlcipher').verbose()

      db = new sqlite3.Database(filename)

      db.serialize(function () {
        password = password.replace(/'/g, '\'\'') // escape single quotes with two single quotes
        db.run('PRAGMA KEY = \'' + password + '\'')
        db.run('PRAGMA CIPHER = \'aes-256-cbc\'')
        db.run('PRAGMA user_version = ' + SCHEMA_VERSION)

        // Test DB read/write
        db.run('CREATE TABLE test (id INTEGER)', function (err) {
          if (err) {
            reject(err, 'Fatal error: Database not writeable. Please check your password, check if your database file is locked, and restart the app.')
          } else {
            db.run('DROP TABLE test')
            createTables() // Create tables IF NOT EXISTS
            createDefaultData()
            resolve()
          }
        })
      })
    })
  }

  const createTables = function () {
    db.serialize(function () {
      // Folders
      db.run(
        'CREATE TABLE IF NOT EXISTS folders(' +
        'folder_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT);')

      // Entries
      db.run(
        'CREATE TABLE IF NOT EXISTS entries(' +
        'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'folder_id INTEGER, ' +
        'date TEXT, ' + // YYYY-MM-DD
        'created TEXT, ' +
        'modified TEXT, ' +
        'content TEXT, ' +
        'FOREIGN KEY (folder_id) REFERENCES folders (folder_id));')
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
        'tag_id INTEGER, ' +
        'FOREIGN KEY (entry_id) REFERENCES entries (entry_id), ' +
        'FOREIGN KEY (tag_id) REFERENCES tags (tag_id));')

      // Options
      db.run(
        'CREATE TABLE IF NOT EXISTS options(' +
        'name TEXT PRIMARY KEY, ' +
        'value TEXT);')
    })
  }

  const createDefaultData = function () {
    datastore.getRow('SELECT * FROM folders')
      .then((result) => {
        if (result) {
          // Table exists, do nothing
        } else {
          // Create default data
          datastore.insert('folders', ['name', 'type'], ['Journal', 'journal'])
            .catch((err) => {
              console.log('Error inserting default data', err)
            })
        }
      })
      .catch((err) => {
        console.log('Error in createDefaultData', err)
      })
  }

  this.insert = function (table, columns, values) {
    return new Promise(function (resolve, reject) {
      let columnNames = columns.join(', ')
      let blanks = '?'
      for (let i = 1; i < columns.length; i++) {
        blanks += ', ?'
      }
      let query = 'INSERT INTO ' + table + ' (' + columnNames + ') VALUES (' + blanks + ')'
      db.run(query, values, function (err, row) {
        if (err) {
          reject(err)
        } else {
          resolve(this.lastID)
        }
      })
    })
  }

  this.createNewEntry = function (data, callback) {
    let created = moment().format(DATE_SQL)
    db.run('INSERT INTO entries (folder_id, date, created, modified, content) VALUES (?, ?, ?, ?, ?)', ['1', data.date, created, created, data.content], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.lastID)
      }
    })
  }

  this.updateEntry = function (entry, callback) {
    let modified = moment().format(DATE_SQL)
    db.run('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?', [modified, entry.content, entry.id], function (err) {
      if (err) {
        console.log(err)
      } else {
        callback(this.changes)
      }
    })
  }

  this.getRow = function (query, parameters) {
    return new Promise(function (resolve, reject) {
      db.get(query, parameters, function (err, row) {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
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
    db.get('SELECT * FROM entries WHERE entry_id = ?', entryId, function (err, row) {
      if (err) {
        console.log(err)
      } else {
        callback(row)
      }
    })
  }

  this.getEntryTree = function () {
    return new Promise(function (resolve, reject) {
      let tree = {}
      db.all('SELECT entry_id, date FROM entries ORDER BY date ASC', function (err, rows) {
        if (err) {
          reject(err)
        } else {
          rows.forEach(function (row) {
            /*
            I feel that this section is a kludge, but I don't know a better way to do it :\
             */
            let year = row.date.substr(0, 4)
            let month = moment(row.date, 'YYYY-MM-DD').format('MMMM')
            let day = moment(row.date, 'YYYY-MM-DD').format('DD - dddd')

            if (!tree[year]) { tree[year] = {} }
            if (!tree[year]['months']) { tree[year]['months'] = {} }
            if (!tree[year]['months'][month]) { tree[year]['months'][month] = {} }
            if (!tree[year]['months'][month]['entries']) { tree[year]['months'][month]['entries'] = [] }

            tree[year]['show'] = true
            tree[year]['months'][month]['show'] = true
            tree[year]['months'][month]['entries'].push({date: row.date, value: day})
          })
          resolve(tree)
        }
      })
    })
  }

  this.getOption = function (name, callback) {
    if (name) {
      db.get('SELECT * FROM options WHERE name = ?', name, function (err, row) {
        if (err) {
          console.log(err)
        } else {
          callback((row && row.value) ? row.value : null)
        }
      })
    }
  }

  this.setOption = function (name, value) {
    db.run('INSERT OR REPLACE INTO options VALUES (?, ?)', [name, value], function (err) {
      if (err) {
        console.log(err)
      }
    })
  }
}

export default new Datastore()
