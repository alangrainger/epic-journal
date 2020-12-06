import moment from 'moment'
import config from '../electron-store'

const SCHEMA_VERSION = 7

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

const now = function () {
  return moment().format(DATE_SQL)
}

function Datastore () {
  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL

  this.table = []
  this.table.entries = 'entries'
  this.table.tags = 'tags'
  this.connected = false

  let sql = false
  let db = this

  this.openDatabase = function (password) {
    return new Promise(function (resolve, reject) {
      let sqlite3 = require('@journeyapps/sqlcipher').verbose()

      let filename = config.get('journal')

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
        .then(() => { return db.run('PRAGMA cipher_compatibility = 3') })
        .then(() => { return db.run('PRAGMA KEY = \'' + password + '\'') })
        .then(() => { return db.run('PRAGMA CIPHER = \'aes-256-cbc\'') })
        // Test DB read/write
        .then(() => { return db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER)') })
        .then(() => { return db.run('DROP TABLE test') })
        // Check database schema version
        .then(() => {
          return new Promise((resolve, reject) => {
            db.get('PRAGMA user_version;')
              .then((row) => {
                let version = row.user_version
                if (!version || version < SCHEMA_VERSION) {
                  // Database is new or out of date
                  createTables()
                    .then(() => { return updateTables() })
                    .then(() => { resolve() })
                    .catch(err => { reject(err) })
                } else {
                  resolve()
                }
              })
              .catch(err => { reject(err) })
          })
        })
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

      db.run('UPDATE ' + table + ' SET ' + columns.join(', ') + ' WHERE id = ' + id, values)
        .then(result => {
          resolve(result.changes)
        })
        .catch(err => { reject(err) })
    })
  }
  this.delete = function (table, id) {
    return new Promise(function (resolve, reject) {
      // Reject if ID not an integer
      if (!parseInt(id, 10)) reject(new Error('Invalid ID specified for delete'))
      db.run('DELETE FROM ' + table + ' WHERE id = ?', [id])
        .then(result => {
          resolve(result.changes)
        })
        .catch(err => { reject(err) })
    })
  }

  /*
   * END PROMISE WRAPPERS
   */

  const createTables = function () {
    return new Promise(function (resolve, reject) {
      // Folders
      db.run(
        'CREATE TABLE IF NOT EXISTS folders(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT);')
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS entries(' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'folder_id INTEGER, ' +
            'date TEXT, ' + // YYYY-MM-DD
            'created TEXT, ' +
            'modified TEXT, ' +
            'content TEXT, ' +
            'FOREIGN KEY (folder_id) REFERENCES folders (folder_id));')
        })
        .then(() => {
          return db.run(
            'CREATE INDEX IF NOT EXISTS index_date ON entries(date, folder_id)')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS tags(' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
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
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'created TEXT, ' +
            'mime_type TEXT, ' +
            'data BLOB);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS styles(' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'type TEXT, ' +
            'element TEXT, ' +
            'class_name TEXT, ' +
            'style TEXT);')
        })
        .then(() => {
          return db.run(
            'CREATE TABLE IF NOT EXISTS templates(' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'created TEXT, ' +
            'modified TEXT, ' +
            'content TEXT)')
        })
        .then(() => { resolve() })
        .catch((err) => {
          reject(err)
        })
    })
  }
  const updateTables = async () => {
    try {
      // Get DB version
      let row = await db.get('PRAGMA user_version;')
      let version = row.user_version
      if (!version) {
        // New database
        await db.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      } else if (version < SCHEMA_VERSION) {
        console.log('Outdated database schema, updating...')
        if (version < 5) {
          /*
          Tag table was updated to include style and a style-type of inline or block
           */
          await db.run('DROP TABLE tags')
          await db.run(
            'CREATE TABLE IF NOT EXISTS tags(' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'name TEXT, ' +
            'type TEXT, ' +
            'style TEXT);')
        }
        if (version <= 6) {
          /*
          Multicolumn index_date added
           */
          await db.run('DROP INDEX IF EXISTS index_date')
          await db.run('CREATE INDEX index_date ON entries(date, folder_id)')
        }
        if (version < 7) {
          /*
          Updating all tables to have standard 'id' fields, instead of unique ones
           */
          await db.run('ALTER TABLE attachments RENAME COLUMN attachment_id TO id;')
          await db.run('ALTER TABLE entries RENAME COLUMN entry_id TO id;')
          await db.run('ALTER TABLE folders RENAME COLUMN folder_id TO id;')
          await db.run('ALTER TABLE styles RENAME COLUMN style_id TO id;')
          await db.run('ALTER TABLE tags RENAME COLUMN tag_id TO id;')
          await db.run('ALTER TABLE templates RENAME COLUMN template_id TO id;')
        }
        await db.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      }
    } catch (e) {
      console.log('Error updating database schema')
      console.log(e)
    }
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

  this.createEntry = async (entry) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      let res = await db.run(`INSERT INTO ${entry.table} (folder_id, date, created, modified, content) VALUES (?, ?, ?, ?, ?)`, [entry.folder_id, entry.date, now(), now(), entry.content])
      // res.changes contains the number of rows deleted
      return res && res.lastID ? res.lastID : false
    } catch (e) {
      console.log(e)
      return false
    }
  }

  this.updateEntry = async (entry) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      if (parseInt(entry.id, 10) !== entry.id) return false // invalid characters in ID
      let res = await db.run(`UPDATE ${entry.table} SET modified = ?, content = ? WHERE id = ?`, [now(), entry.content, entry.id])
      console.log(res)
      // res.changes contains the number of rows deleted
      return res && res.changes
    } catch (e) {
      console.log(e)
      return false
    }
  }

  this.deleteEntry = async (entry, onlyIfEmpty = false) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      if (parseInt(entry.id, 10) !== entry.id) return false // invalid characters in ID
      let ifEmpty = onlyIfEmpty ? ' AND (content = "" OR content IS NULL)' : ''
      let res = await db.run(`DELETE FROM ${entry.table} WHERE id = ? ${ifEmpty}`, [entry.id])
      // res.changes contains the number of rows deleted
      return res && res.changes
    } catch (e) {
      console.log(e)
      return false
    }
  }

  this.getEntryByDate = function (date) {
    return new Promise(function (resolve, reject) {
      if (!date) reject(new Error('No date specified'))
      db.get('SELECT * FROM entries WHERE date = ?', [date])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /**
   * Get an entry from DB
   *
   * @param {string} table - Table name
   * @param {number} id - Entry ID
   * @returns {Promise<unknown>}
   */
  this.getById = function (table, id) {
    return new Promise(function (resolve, reject) {
      if (!table) reject(new Error('No table specified'))
      table = table.replace(/\W/g, '')
      db.get('SELECT * FROM ' + table + ' WHERE id = ?', [id])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          reject(error)
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
      db.all('SELECT id, date FROM entries ORDER BY date ASC')
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
            tree[year]['months'][month]['entries'].push({ date: row.date, value: day })
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

  /**
   * Add an attachment into the database
   *
   * @param {string} mimetype - MIME type of the file
   * @param {buffer} data - Attachment data stream
   * @returns {Promise<unknown>}
   */
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
      db.get('SELECT * FROM attachments WHERE id = ?', [id])
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
