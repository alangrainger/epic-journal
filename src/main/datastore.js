import moment from 'dayjs'
import config from '../electron-store'

const sqlite3 = require('@journeyapps/sqlcipher').verbose()

const SCHEMA_VERSION = 7

const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
const DATE_DAY = 'YYYY-MM-DD'

const now = function () {
  return moment().format(DATE_SQL)
}

function Datastore () {
  this.DATE_DAY = DATE_DAY
  this.DATE_SQL = DATE_SQL
  this.table = {
    entries: 'entries',
    tags: 'tags'
  }
  this.connected = false
  this.dbHandle = false

  const datastore = this

  this.openDatabase = async (password) => {
    const filename = config.get('journal')
    password = password.replace(/'/g, '\'\'') // escape single quotes with two single quotes

    // Create/connect database
    try {
      datastore.dbHandle = await datastore.connect(filename)
      await datastore.run('PRAGMA cipher_compatibility = 3')
      await datastore.run('PRAGMA KEY = \'' + password + '\'')
      await datastore.run('PRAGMA CIPHER = \'aes-256-cbc\'')
      // Test DB read/write
      await datastore.run('CREATE TABLE IF NOT EXISTS test (id INTEGER)')
      await datastore.run('DROP TABLE test')
      // Check database schema version
      let row = await datastore.get('PRAGMA user_version;')
      let version = row.user_version
      if (!version || version < SCHEMA_VERSION) {
        // Database is new or out of date
        await createTables()
        await updateTables()
      }
      // Create default data if needed
      await createDefaultData()
      // All complete
      datastore.connected = true
    } catch (e) {
      if (datastore.dbHandle) datastore.dbHandle.close()
      console.log('Fatal error: Database not writeable. Please check your password, check if your database file is locked, and restart the app.')
      throw new Error(e)
    }
  }

  /**
   * Open an existing database file or create a new one, and return the database instance
   *
   * @param {string} filename - The full path to the database file to open or create
   * @returns {Promise<unknown>}
   */
  this.connect = function (filename) {
    return new Promise((resolve, reject) => {
      const instance = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(instance)
        }
      })
    })
  }
  /*
   *
   * Promise wrappers for built-in Sqlite3 functions
   * https://github.com/mapbox/node-sqlite3/wiki/API
   *
   */
  this.run = (query, parameters = []) => {
    return new Promise(function (resolve, reject) {
      if (!datastore.dbHandle) { reject(new Error('run: Database object not created')) }
      datastore.dbHandle.run(query, parameters, function (error) {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
  this.get = function (query, parameters) {
    return new Promise(function (resolve, reject) {
      if (!datastore.dbHandle) { reject(new Error('get: Database object not created')) }
      datastore.dbHandle.get(query, parameters, function (err, row) {
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
      if (!datastore.dbHandle) { reject(new Error('all: Database object not created')) }
      datastore.dbHandle.all(query, parameters, function (err, rows) {
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

      datastore.run('INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ')', values)
        .then(result => {
          resolve(result.lastID)
        })
        .catch(err => { reject(err) })
    })
  }

  /**
   * Update a row with an object of columns => values.
   *
   * @example
   * // Update date and content of row 1 in the 'entries' table
   * update(
   *   'entries',
   *   {
   *     date: '2020-01-01',
   *     content: 'Test update'
   *   },
   *   1
   * )
   *
   * @param {String} table - The name of the table
   * @param {Object} data - An object containing columns => values
   * @param {Number|String} id - The ID of the row to update
   *
   * @returns {Promise<Number>}
   * Returns the number of rows changed
   */
  this.update = async (table, data, id) => {
    if (table && data && id) {
      try {
        let columns = []
        let values = []
        for (let key of Object.keys(data)) {
          columns.push(key + ' = ?')
          values.push(data[key])
        }
        values.push(id)
        const result = await datastore.run('UPDATE ' + table + ' SET ' + columns.join(', ') + ' WHERE id = ?', values)
        const changes = parseInt(result.changes)
        if (!isNaN(changes)) return changes
      } catch (e) {
        console.log(e)
      }
    }
    return 0
  }

  /**
   * Delete a row from a table by ID
   *
   * @param {string} table - Table name
   * @param {Number} id - Row ID
   * @returns {Promise<number>}
   */
  this.delete = async (table, id) => {
    // Reject if ID not an integer
    if (!Number.isInteger(id)) throw new Error('Invalid ID specified for delete')
    try {
      const result = await datastore.run('DELETE FROM ' + table + ' WHERE id = ?', [id])
      const changes = parseInt(result.changes)
      if (!isNaN(changes)) return changes
    } catch (e) {
      console.log(e)
    }
    return 0
  }

  /*
   * END PROMISE WRAPPERS
   */

  const createTables = async () => {
    try {
      // Folders
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS folders(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT);')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS entries(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'folder_id INTEGER, ' +
        'date TEXT, ' + // YYYY-MM-DD
        'created TEXT, ' +
        'modified TEXT, ' +
        'content TEXT, ' +
        'FOREIGN KEY (folder_id) REFERENCES folders (folder_id));')
      await datastore.run('CREATE INDEX IF NOT EXISTS index_date ON entries(date, folder_id)')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS tags(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT, ' +
        'style TEXT);')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS entry_tags(' +
        'entry_id INTEGER, ' +
        'tag_id INTEGER, ' +
        'FOREIGN KEY (entry_id) REFERENCES entries (entry_id), ' +
        'FOREIGN KEY (tag_id) REFERENCES tags (tag_id));')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS options(' +
        'name TEXT PRIMARY KEY, ' +
        'value TEXT);')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS attachments(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'created TEXT, ' +
        'mime_type TEXT, ' +
        'data BLOB);')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS styles(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT, ' +
        'element TEXT, ' +
        'class_name TEXT, ' +
        'style TEXT);')
      await datastore.run(
        'CREATE TABLE IF NOT EXISTS templates(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'created TEXT, ' +
        'modified TEXT, ' +
        'content TEXT)')
    } catch (e) {
      throw new Error(e)
    }
  }
  const updateTables = async () => {
    try {
      // Get DB version
      let row = await datastore.get('PRAGMA user_version;')
      let version = row.user_version
      if (!version) {
        // New database
        await datastore.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      } else if (version < SCHEMA_VERSION) {
        console.log('Outdated database schema, updating...')
        if (version < 5) {
          /*
          Tag table was updated to include style and a style-type of inline or block
           */
          await datastore.run('DROP TABLE tags')
          await datastore.run(
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
          await datastore.run('DROP INDEX IF EXISTS index_date')
          await datastore.run('CREATE INDEX index_date ON entries(date, folder_id)')
        }
        if (version < 7) {
          /*
          Updating all tables to have standard 'id' fields, instead of unique ones
           */
          await datastore.run('ALTER TABLE attachments RENAME COLUMN attachment_id TO id;')
          await datastore.run('ALTER TABLE entries RENAME COLUMN entry_id TO id;')
          await datastore.run('ALTER TABLE folders RENAME COLUMN folder_id TO id;')
          await datastore.run('ALTER TABLE styles RENAME COLUMN style_id TO id;')
          await datastore.run('ALTER TABLE tags RENAME COLUMN tag_id TO id;')
          await datastore.run('ALTER TABLE templates RENAME COLUMN template_id TO id;')
        }
        await datastore.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      }
    } catch (e) {
      console.log('Error updating database schema')
      console.log(e)
    }
  }

  const createDefaultData = async () => {
    try {
      let result = await datastore.get('SELECT * FROM folders')
      if (result) {
        // Table exists, do nothing
      } else {
        // Create default data
        await datastore.run('INSERT INTO folders (name, type) VALUES (?, ?)', ['Journal', 'journal'])
      }
    } catch (err) {
      console.log('Error in createDefaultData', err)
    }
  }

  this.createEntry = async (entry) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      let res = await datastore.run(`INSERT INTO ${entry.table} (folder_id, date, created, modified, content) VALUES (?, ?, ?, ?, ?)`, [entry.folder_id, entry.date, now(), now(), entry.content])
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
      let res = await datastore.run(`UPDATE ${entry.table} SET modified = ?, content = ? WHERE id = ?`, [now(), entry.content, entry.id])
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
      let res = await datastore.run(`DELETE FROM ${entry.table} WHERE id = ? ${ifEmpty}`, [entry.id])
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
      datastore.get('SELECT * FROM entries WHERE date = ?', [date])
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
   * @param {number|string} id - Entry ID
   * @returns {Promise<unknown>}
   */
  this.getById = function (table, id) {
    return new Promise(function (resolve, reject) {
      if (!table) reject(new Error('No table specified'))
      table = table.replace(/\W/g, '')
      datastore.get('SELECT * FROM ' + table + ' WHERE id = ?', [id])
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
      datastore.all('SELECT * FROM ' + table + orderBy)
        .then(rows => { resolve(rows) })
        .catch(err => { reject(err) })
    })
  }

  this.getEntryTree = function () {
    return new Promise(function (resolve, reject) {
      let tree = {}
      datastore.all('SELECT id, date FROM entries ORDER BY date ASC')
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

      datastore.get('SELECT * FROM options WHERE name = ?', [name])
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

      datastore.run('INSERT OR REPLACE INTO options VALUES (?, ?)', [name, value])
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
   * @returns {Promise<Number>}
   */
  this.addAttachment = function (mimetype, data) {
    return new Promise(function (resolve, reject) {
      let created = moment().format(DATE_SQL)
      datastore.run('INSERT INTO attachments (created, mime_type, data) VALUES (?, ?, ?)', [created, mimetype, data])
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
      datastore.get('SELECT * FROM attachments WHERE id = ?', [id])
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
