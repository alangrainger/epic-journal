import moment from 'moment'
import config from './config'

const SCHEMA_VERSION = 5

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

function Datastore () {
  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'

  let sql = false
  let db = this

  this.openDatabase = function (password) {
    return new Promise(function (resolve, reject) {
      let sqlite3 = require('win-sqlcipher')

      // Get filename from config always at point of open
      let filename = config.data.file
      sql = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
        if (err) {
          reject(err)
        }
      })

      sql.serialize(function () {
        password = password.replace(/'/g, '\'\'') // escape single quotes with two single quotes
        db.run('PRAGMA KEY = \'' + password + '\'')
          .catch((err) => { reject(err) })
        db.run('PRAGMA CIPHER = \'aes-256-cbc\'')
          .catch((err) => { reject(err) })

        // Test DB read/write
        db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER)')
          .then(() => {
            db.run('DROP TABLE test')
            createTables() // Create tables IF NOT EXISTS
              .then(updateTables())
              .catch((err) => { reject(err) })
            createDefaultData()
            resolve() // back to main execution
          })
          .catch((err) => {
            console.log('Fatal error: Database not writeable. Please check your password, check if your database file is locked, and restart the app.')
            reject(err)
          })
      })
    })
  }

  /*
   *
   * Promise wrappers for built-in Sqlite3 functions
   *
   */
  this.run = function (query, parameters = []) {
    return new Promise(function (resolve, reject) {
      if (!sql) { reject(new Error('run: Database object not created')) }
      sql.run(query, parameters, function (error) {
        if (error) {
          reject(error)
        } else {
          resolve(this)
        }
      })
    })
  }
  this.get = function (query, parameters) {
    return new Promise(function (resolve, reject) {
      if (!sql) { reject(new Error('get: Database object not created')) }
      sql.get(query, parameters, function (err, row) {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }
  this.all = function (query, parameters) {
    return new Promise(function (resolve, reject) {
      if (!sql) { reject(new Error('all: Database object not created')) }
      sql.all(query, parameters, function (err, rows) {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }
  this.insert = function (query, parameters) {
    return new Promise(function (resolve, reject) {
      if (!sql) { reject(new Error('run: Database object not created')) }
      sql.run(query, parameters, function (error) {
        if (error) {
          reject(error)
        } else if (this.lastID) {
          resolve(this.lastID)
        } else {
          reject(new Error('insert: Row not inserted'))
        }
      })
    })
  }
  /*
   * END PROMISE WRAPPERS
   */

  const createTables = function () {
    return new Promise(function (resolve, reject) {
      sql.serialize(function () {
        // Folders
        db.run(
          'CREATE TABLE IF NOT EXISTS folders(' +
          'folder_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
          'name TEXT, ' +
          'type TEXT);')
          .then(
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
          )
          .then(
            db.run('CREATE INDEX IF NOT EXISTS index_date ON entries(date)')
          )
          .then(
            // Tags
            db.run(
              'CREATE TABLE IF NOT EXISTS tags(' +
              'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
              'name TEXT, ' +
              'type TEXT, ' +
              'style TEXT);')
          )
          .then(
            db.run(
              'CREATE TABLE IF NOT EXISTS entry_tags(' +
              'entry_id INTEGER, ' +
              'tag_id INTEGER, ' +
              'FOREIGN KEY (entry_id) REFERENCES entries (entry_id), ' +
              'FOREIGN KEY (tag_id) REFERENCES tags (tag_id));')
          )
          .then(
            // Options
            db.run(
              'CREATE TABLE IF NOT EXISTS options(' +
              'name TEXT PRIMARY KEY, ' +
              'value TEXT);')
          )
          .then(
            // Attachments
            db.run(
              'CREATE TABLE IF NOT EXISTS attachments(' +
              'attachment_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
              'created TEXT, ' +
              'mime_type TEXT, ' +
              'data BLOB);')
          )
          .then(
            // Styles
            db.run(
              'CREATE TABLE IF NOT EXISTS styles(' +
              'style_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
              'name TEXT, ' +
              'type TEXT, ' +
              'element TEXT, ' +
              'class_name TEXT, ' +
              'style TEXT);')
          )
          .catch((err) => {
            reject(err)
          })
      })
    })
  }
  const updateTables = function () {
    // Get DB version
    db.get('PRAGMA user_version;')
      .then((row) => {
        let version = row.user_version
        if (version < SCHEMA_VERSION) console.log('Outdated database schema, updating...')

        if (version < 5) {
          /*
          Tag table was updated to include style and a style-type of inline or block
           */
          db.run('DROP TABLE tags')
          db.run(
            'CREATE TABLE IF NOT EXISTS tags(' +
            'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'type TEXT, ' +
            'style TEXT);')
          db.run('PRAGMA user_version = ' + SCHEMA_VERSION)
        }
      })
  }

  const createDefaultData = function () {
    db.get('SELECT * FROM folders')
      .then((result) => {
        if (result) {
          // Table exists, do nothing
        } else {
          // Create default data
          db.run('INSERT INTO folders (name, type) VALUES (?, ?)', ['Journal', 'journal'])
            .catch((err) => {
              console.log('Error inserting default data', err)
            })
        }
      })
      .catch((err) => {
        console.log('Error in createDefaultData', err)
      })
  }

  this.createNewEntry = function (data) {
    return new Promise(function (resolve, reject) {
      let created = moment().format(DATE_SQL)
      db.run('INSERT INTO entries (folder_id, date, created, modified, content) VALUES (?, ?, ?, ?, ?)', ['1', data.date, created, created, data.content])
        .then((ret) => {
          if (ret.lastID) {
            resolve(ret.lastID)
          } else {
            reject(new Error('Entry was not created'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.updateEntry = function (entry) {
    return new Promise(function (resolve, reject) {
      let modified = moment().format(DATE_SQL)
      db.run('UPDATE entries SET modified = ?, content = ? WHERE entry_id = ?', [modified, entry.content, entry.id])
        .then((ret) => {
          if (ret.changes) {
            resolve(ret.changes)
          } else {
            reject(new Error('Entry was not updated'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.deleteEntry = function (entry) {
    return new Promise(function (resolve, reject) {
      // Delete from the database if the entry is blank
      if (entry.id && Number.isInteger(entry.id)) {
        db.run('DELETE FROM entries WHERE entry_id = ?', [entry.id])
          .then((ret) => {
            if (ret.changes) {
              resolve(ret.changes)
            } else {
              reject(new Error('Entry was not deleted'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      }
    })
  }

  this.getEntryByDate = function (date) {
    return new Promise(function (resolve, reject) {
      if (!date) reject(new Error('No date specified'))
      db.get('SELECT * FROM entries WHERE date = ?', [date])
        .then((row) => {
          if (row) {
            resolve(row)
          } else {
            let err = new Error('No entry found with date ' + date)
            err.number = 101
            reject(err)
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.getEntryById = function (entryId) {
    return new Promise(function (resolve, reject) {
      if (!entryId) reject(new Error('Not a valid ID'))
      db.get('SELECT * FROM entries WHERE entry_id = ?', [entryId])
        .then((row) => {
          if (row) {
            resolve(row)
          } else {
            reject(new Error('No row found for ID ' + entryId))
          }
        })
        .catch((error) => {
          console.log(error)
        })
    })
  }

  this.getEntryTree = function () {
    return new Promise(function (resolve, reject) {
      let tree = {}
      db.all('SELECT entry_id, date FROM entries ORDER BY date ASC')
        .then((rows) => {
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
        })
        .catch((err) => {
          console.log(err)
        })
    })
  }

  this.getOption = function (name) {
    return new Promise(function (resolve, reject) {
      if (!name) { reject(new Error('No option specified')) }

      db.get('SELECT * FROM options WHERE name = ?', [name])
        .then((row) => {
          resolve((row && row.value) ? row.value : null)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.setOption = function (name, value) {
    return new Promise(function (resolve, reject) {
      if (!name) { reject(new Error('No option specified')) }

      db.run('INSERT OR REPLACE INTO options VALUES (?, ?)', [name, value])
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.addAttachment = function (mimetype, data) {
    return new Promise(function (resolve, reject) {
      let created = moment().format(DATE_SQL)
      db.run('INSERT INTO attachments (created, mime_type, data) VALUES (?, ?, ?)', [created, mimetype, data])
        .then((ret) => {
          if (ret.lastID) {
            resolve(ret.lastID)
          } else {
            reject(new Error('Attachment was not added'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  this.getAttachment = function (id) {
    return new Promise(function (resolve, reject) {
      if (!isNaN(id) && id === parseInt(id, 10)) reject(new Error('No attachment ID specified'))
      db.get('SELECT * FROM attachments WHERE attachment_id = ?', [id])
        .then((row) => {
          if (row) {
            resolve(row)
          } else {
            reject(new Error('No entry found with ID ' + id))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
}

export default new Datastore()
