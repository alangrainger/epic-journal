import moment from 'moment'

const SCHEMA_VERSION = 5

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

function Datastore () {
  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'
  this.connected = false

  let sql = false
  let db = this

  // ID translation array
  const primaryKeys = {
    entries: 'entry_id',
    templates: 'template_id',
    tags: 'tag_id'
  }

  this.openDatabase = function (password) {
    return new Promise(function (resolve, reject) {
      let sqlite3 = require('win-sqlcipher')

      let filename = global['config'].get('journal')
      password = password.replace(/'/g, '\'\'') // escape single quotes with two single quotes

      // Create/connect database
      new Promise(function (resolve, reject) {
        sql = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
        .then(() => { return db.run('PRAGMA KEY = \'' + password + '\'') })
        .then(() => { return db.run('PRAGMA CIPHER = \'aes-256-cbc\'') })
        // Test DB read/write
        .then(() => { return db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER)') })
        .then(() => { return db.run('DROP TABLE test') })
        // Create tables IF NOT EXISTS
        .then(() => { return createTables() })
        .then(() => { return updateTables() })
        .then(() => {
          createDefaultData()
          db.connected = true
          resolve() // back to main execution
        })
        .catch((err) => {
          sql.close()
          console.log('Fatal error: Database not writeable. Please check your password, check if your database file is locked, and restart the app.')
          reject(err)
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
      console.log(query)
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
  this.insert = function (table, data) {
    return new Promise(function (resolve, reject) {
      let columns = []
      let values = []
      let placeholders = []
      for (let key in data) {
        columns.push(key)
        values.push(data[key])
        placeholders.push('?')
      }

      db.run('INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ')', values)
        .then(result => {
          resolve(result.lastID)
        })
        .catch(err => { reject(err) })
    })
  }

  this.update = function (table, data, id) {
    return new Promise(function (resolve, reject) {
      let columns = []
      let values = []
      for (let key in data) {
        columns.push(key + ' = ?')
        values.push(data[key])
      }

      db.run('UPDATE ' + table + ' SET ' + columns.join(', ') + ' WHERE ' + primaryKeys[table] + ' = ' + id, values)
        .then(result => {
          resolve(result.changes)
        })
        .catch(err => { reject(err) })
    })
  }
  this.delete = function (table, id) {
    return new Promise(function (resolve, reject) {
      // Reject if bad table name
      if (!primaryKeys.hasOwnProperty(table)) reject(new Error('Invalid table specified for delete'))
      // Reject if ID not an integer
      if (!parseInt(Number(id))) reject(new Error('Invalid ID specified for delete'))
      db.run('DELETE FROM ' + table + ' WHERE ' + primaryKeys[table] + ' = ' + id)
        .then(result => {
          resolve(result.changes)
        })
        .catch(err => { reject(err) })
    })
  }

  /*
   * END PROMISE WRAPPERS
   */

  let createTables = function () {
    return new Promise(function (resolve, reject) {
      // Folders
      db.run(
        'CREATE TABLE IF NOT EXISTS folders(' +
        'folder_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT);')
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS entries(' +
            'entry_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'folder_id INTEGER, ' +
            'date TEXT, ' + // YYYY-MM-DD
            'created TEXT, ' +
            'modified TEXT, ' +
            'content TEXT, ' +
            'FOREIGN KEY (folder_id) REFERENCES folders (folder_id));')
        })
        .then(() => {
          return db.run(
            'CREATE INDEX IF NOT EXISTS index_date ON entries(date)')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS tags(' +
            'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'type TEXT, ' +
            'style TEXT);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS entry_tags(' +
            'entry_id INTEGER, ' +
            'tag_id INTEGER, ' +
            'FOREIGN KEY (entry_id) REFERENCES entries (entry_id), ' +
            'FOREIGN KEY (tag_id) REFERENCES tags (tag_id));')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS options(' +
            'name TEXT PRIMARY KEY, ' +
            'value TEXT);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS attachments(' +
            'attachment_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'created TEXT, ' +
            'mime_type TEXT, ' +
            'data BLOB);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS styles(' +
            'style_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'type TEXT, ' +
            'element TEXT, ' +
            'class_name TEXT, ' +
            'style TEXT);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS templates(' +
            'template_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'created TEXT, ' +
            'modified TEXT, ' +
            'content TEXT)')
        })
        .then(resolve())
        .catch((err) => {
          reject(err)
        })
    })
  }
  let updateTables = function () {
    return new Promise(function (resolve, reject) {
      // Get DB version
      db.get('PRAGMA user_version;')
        .then((row) => {
          let version = row.user_version
          if (!version) {
            // New database
            db.run('PRAGMA user_version = ' + SCHEMA_VERSION)
          } else {
            if (version < SCHEMA_VERSION) console.log('Outdated database schema, updating...')

            if (version < 5) {
              /*
              Tag table was updated to include style and a style-type of inline or block
               */
              db.run('DROP TABLE tags')
                .then(() => {
                  db.run(
                    'CREATE TABLE IF NOT EXISTS tags(' +
                    'tag_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                    'name TEXT, ' +
                    'type TEXT, ' +
                    'style TEXT);')
                })
            }
            db.run('PRAGMA user_version = ' + SCHEMA_VERSION)
          }
          resolve()
        })
        .catch(err => reject(err))
    })
  }

  let createDefaultData = function () {
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

  this.getById = function (table, id) {
    return new Promise(function (resolve, reject) {
      if (!table) reject(new Error('No table specified'))

      if (!primaryKeys.hasOwnProperty(table)) reject(new Error('Invalid table specified in getById'))
      db.get('SELECT * FROM ' + table + ' WHERE ' + primaryKeys[table] + ' = ?', [id])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          console.log(error)
        })
    })
  }

  this.getAll = function (table, options) {
    return new Promise((resolve, reject) => {
      let orderBy = (options && options.orderBy) ? ' ORDER BY ' + options.orderBy : ''
      db.all('SELECT * FROM ' + table + orderBy)
        .then(rows => { resolve(rows) })
        .catch(err => { reject(err) })
    })
  }

  this.getEntryTree = function () {
    return new Promise(function (resolve, reject) {
      let tree = {}
      db.all('SELECT entry_id, date FROM entries ORDER BY date ASC')
        .then((rows) => {
          for (let i = 0; i < rows.length; i++) {
            /*
            I feel that this section is a kludge, but I don't know a better way to do it :\
             */
            let row = rows[i]
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
          }
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
      db.get('SELECT * FROM attachments WHERE attachment_id = ?', [id])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
}

export default new Datastore()
