/*
SQLite language reference:
https://sqlite.org/lang.html

Node SQLite language reference:
https://github.com/mapbox/node-sqlite3/wiki/API
 */

import dayjs from 'dayjs'
import config from '../electron-store'

const sqlite3 = require('@journeyapps/sqlcipher').verbose()

const SCHEMA_VERSION = 8

const Datastore = (function () {
  'use strict'

  const publicFunc = {}
  const DATE_SQL = 'YYYY-MM-DD HH:mm:ss'
  const DATE_DAY = 'YYYY-MM-DD'

  publicFunc.DATE_DAY = DATE_DAY
  publicFunc.DATE_SQL = DATE_SQL
  publicFunc.table = {
    entries: 'entries',
    tags: 'tags'
  }
  publicFunc.connected = false

  /**
   * Return the current date/time as a SQL-formatted string
   * @returns {string}
   */
  const now = function () {
    return dayjs().format(DATE_SQL)
  }
  publicFunc.now = now

  // Raw SQLite handle
  let __dbHandle // will be set after connecting/creating the database

  /**
   * Open or create the database, and perform any housekeeping tasks.
   * Database filename comes from electron-store config.
   *
   * @param {string} password - Password to decrypt the database
   * @returns {Promise<boolean>}
   */
  publicFunc.openDatabase = async (password) => {
    const filename = config.get('journal')
    password = password.replace(/'/g, '\'\'') // escape single quotes with two single quotes

    // Create/connect database
    try {
      __dbHandle = await __connect(filename)
      await publicFunc.run('PRAGMA cipher_compatibility = 3')
      await publicFunc.run('PRAGMA KEY = \'' + password + '\'')
      await publicFunc.run('PRAGMA CIPHER = \'aes-256-cbc\'')
      // Test DB read/write
      await publicFunc.run('CREATE TABLE IF NOT EXISTS test (id INTEGER)')
      await publicFunc.run('DROP TABLE test')
      // Check database schema version
      let row = await publicFunc.get('PRAGMA user_version;')
      let version = row.user_version
      if (!version || version < SCHEMA_VERSION) {
        // Database is new or out of date
        await __createTables()
        await __updateTables()
      }
      // Create default data if needed
      await __createDefaultData()
      // All complete
      publicFunc.connected = true
    } catch (e) {
      console.log(e)
      if (__dbHandle) {
        __dbHandle.close()
        __dbHandle = null
      }
      console.log('Fatal error: Database not writeable. Please check your password, check if your database file is locked, and restart the app.')
      throw new Error(e)
    }
    return publicFunc.connected
  }

  /**
   * Open an existing database file or create a new one, and return the database instance
   *
   * @param {string} filename - The full path to the database file to open or create
   * @returns {Promise<Object>}
   * @private
   */
  const __connect = function (filename) {
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

  /**
   * Parse the result of an UPDATE or DELETE database call, and return
   * the number of rows changed
   *
   * @param {object} dbResult - The database result object
   * @returns {number}
   * @private
   */
  const __numChanges = function (dbResult) {
    if (dbResult && typeof dbResult === 'object' && dbResult.hasOwnProperty('changes')) {
      const changes = parseInt(dbResult.changes)
      if (!isNaN(changes)) return changes
    }
    return 0
  }

  /*
   *
   * Promise wrappers for built-in Sqlite3 functions
   * https://github.com/mapbox/node-sqlite3/wiki/API
   *
   */

  /**
   * Execute a prepared SQL query with optional array of placeholder parameters
   * https://github.com/mapbox/node-sqlite3/wiki/API#databaserunsql-param--callback
   *
   * @example
   * // Example UPDATE command
   * run('UPDATE entries SET content = ? WHERE id = ?', ['example', 1])
   *
   * // Example return value - only ONE of these will contain valid information
   * {
   *   lastID: 23 // The ID of the inserted row on an INSERT statement
   *   changes: 6 // The number of rows affected by an UPDATE or DELETE statement
   * }
   * @param {string} query - The SQL query, with ? for placeholders to be filled from 'parameters' array
   * @param {array} [parameters] - The array of parameters to use in the query
   *
   * @returns {Promise<unknown>}
   * Returns false on failure, otherwise an object with 'lastID' and 'changes' properties.
   */
  publicFunc.run = (query, parameters = []) => {
    return new Promise(function (resolve) {
      if (!__dbHandle) resolve(false)
      __dbHandle.run(query, parameters, function (error) {
        if (error) {
          resolve(false)
        } else {
          // Return the raw SQLite result
          resolve(this)
        }
      })
    })
  }
  /**
   * Fetch a row from the database, using a prepared statement SQL format and its parameters
   *
   * @param {string} query - SQL query
   * @param {array} [parameters] - Parameters for the prepared statement
   * @returns {Promise<unknown>}
   * Returns 'undefined' if no matching row is found
   */
  publicFunc.get = function (query, parameters = []) {
    return new Promise(function (resolve) {
      if (!__dbHandle) resolve(false)
      __dbHandle.get(query, parameters, function (err, row) {
        if (err) {
          resolve(false)
        } else {
          resolve(row)
        }
      })
    })
  }
  /**
   * Runs a query and returns all result rows, using a prepared statement SQL format and its parameters
   *
   * @param {string} query - SQL query
   * @param {array} parameters - Parameters for the prepared statement
   * @returns {Promise<array>}
   */
  publicFunc.all = function (query, parameters = []) {
    return new Promise(function (resolve) {
      if (!__dbHandle) resolve([])
      __dbHandle.all(query, parameters, function (err, rows) {
        if (err) {
          resolve([])
        } else {
          resolve(rows)
        }
      })
    })
  }

  /**
   * Insert a row from a data object of columns => values
   *
   * @param {string} table - Table name
   * @param {object} data - Data object of columns => values
   * @returns {Promise<boolean|number>}
   */
  publicFunc.insert = async (table, data) => {
    try {
      if (table.match(/\W/)) return false // invalid characters in table name
      let columns = []
      let values = []
      let placeholders = []
      // Turn the data object into two arrays - column names, and placeholders (ie string '?')
      for (let key of Object.keys(data)) {
        columns.push('`' + key + '`')
        values.push(data[key])
        placeholders.push('?')
      }
      // Insert the row
      let result = await publicFunc.run('INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ')', values)
      return result ? result.lastID : false
    } catch (e) {
      console.log(e)
    }
    return false
  }
  /*
   * END PROMISE WRAPPERS
   */

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
  publicFunc.update = async (table, data, id) => {
    if (table && data && id) {
      try {
        let columns = []
        let values = []
        for (let key of Object.keys(data)) {
          columns.push('`' + key + '` = ?')
          values.push(data[key])
        }
        values.push(id)
        const result = await publicFunc.run('UPDATE ' + table + ' SET ' + columns.join(', ') + ' WHERE id = ?', values)
        return __numChanges(result)
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
  publicFunc.delete = async (table, id) => {
    // Reject if ID not an integer
    if (!Number.isInteger(id)) throw new Error('Invalid ID specified for delete')
    try {
      const result = await publicFunc.run('DELETE FROM ' + table + ' WHERE id = ?', [id])
      return __numChanges(result)
    } catch (e) {
      console.log(e)
    }
    return 0
  }

  const __createTables = async () => {
    try {
      // Folders
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS folders(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT);')
      // Entries
      await publicFunc.run(
        `CREATE TABLE IF NOT EXISTS entries(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER,
        \`date\` TEXT,
        created TEXT,
        modified TEXT,
        deleted TEXT,
        content TEXT,
        FOREIGN KEY (folder_id) REFERENCES folders (folder_id));`)
      await publicFunc.run('CREATE INDEX IF NOT EXISTS index_date ON entries(`date`, folder_id)')
      await publicFunc.run('CREATE INDEX entries_deleted ON entries(deleted)')
      // Tags
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS tags(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT, ' +
        'style TEXT);')
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS entry_tags(' +
        'entry_id INTEGER, ' +
        'tag_id INTEGER, ' +
        'FOREIGN KEY (entry_id) REFERENCES entries (entry_id), ' +
        'FOREIGN KEY (tag_id) REFERENCES tags (tag_id));')
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS options(' +
        'name TEXT PRIMARY KEY, ' +
        'value TEXT);')
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS attachments(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'created TEXT, ' +
        'mime_type TEXT, ' +
        'data BLOB);')
      await publicFunc.run(
        'CREATE TABLE IF NOT EXISTS styles(' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'name TEXT, ' +
        'type TEXT, ' +
        'element TEXT, ' +
        'class_name TEXT, ' +
        'style TEXT);')
      // Templates
      await publicFunc.run(
        `CREATE TABLE IF NOT EXISTS templates(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        \`name\` TEXT,
        created TEXT,
        modified TEXT,
        deleted TEXT,
        content TEXT)`)
      await publicFunc.run('CREATE INDEX templates_deleted ON templates(deleted)')
    } catch (e) {
      throw new Error(e)
    }
  }
  const __updateTables = async () => {
    try {
      // Get DB version
      let row = await publicFunc.get('PRAGMA user_version;')
      let version = row.user_version
      if (!version) {
        // New database
        await publicFunc.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      } else if (version < SCHEMA_VERSION) {
        console.log('Outdated database schema, updating...')
        if (version < 5) {
          /*
          Tag table was updated to include style and a style-type of inline or block
           */
          await publicFunc.run('DROP TABLE tags')
          await publicFunc.run(
            `CREATE TABLE IF NOT EXISTS tags(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            style TEXT);`)
        }
        if (version <= 6) {
          /*
          Multicolumn index_date added
           */
          await publicFunc.run('DROP INDEX IF EXISTS index_date')
          await publicFunc.run('CREATE INDEX index_date ON entries(`date`, folder_id)')
        }
        if (version < 7) {
          /*
          Updating all tables to have standard 'id' fields, instead of unique ones
           */
          await publicFunc.run('ALTER TABLE attachments RENAME COLUMN attachment_id TO id;')
          await publicFunc.run('ALTER TABLE entries RENAME COLUMN entry_id TO id;')
          await publicFunc.run('ALTER TABLE folders RENAME COLUMN folder_id TO id;')
          await publicFunc.run('ALTER TABLE styles RENAME COLUMN style_id TO id;')
          await publicFunc.run('ALTER TABLE tags RENAME COLUMN tag_id TO id;')
          await publicFunc.run('ALTER TABLE templates RENAME COLUMN template_id TO id;')
        }
        if (version < 8) {
          /*
          Add a deleted column to the entries table to soft-delete entries
           */
          await publicFunc.run('ALTER TABLE entries ADD deleted TEXT;') // date YYYY-MM-DD
          await publicFunc.run('CREATE INDEX entries_deleted ON entries(deleted)')
          await publicFunc.run('ALTER TABLE templates ADD deleted TEXT;') // date YYYY-MM-DD
          await publicFunc.run('CREATE INDEX templates_deleted ON templates(deleted)')
        }
        await publicFunc.run('PRAGMA user_version = ' + SCHEMA_VERSION)
      }
    } catch (e) {
      console.log('Error updating database schema')
      console.log(e)
    }
  }

  const __createDefaultData = async () => {
    try {
      let result = await publicFunc.get('SELECT * FROM folders')
      if (result) {
        // Table exists, do nothing
      } else {
        // Create default data
        await publicFunc.run('INSERT INTO folders (name, type) VALUES (?, ?)', ['Journal', 'journal'])
      }
    } catch (err) {
      console.log('Error in createDefaultData', err)
    }
  }

  /**
   * Insert a new journal entry row
   *
   * @param {Object} entry - An object with the following properties:
   * @param {string} entry.table - The table to insert into
   * @param {number|string} entry.folder_id - Folder ID for the entry
   * @param {string} entry.date - The date in YYYY-MM-DD format
   * @param {string} entry.content - The body content
   *
   * @returns {Promise<boolean|number>}
   * Returns false on error, otherwise returns the ID of the newly created row
   */
  publicFunc.createEntry = async (entry) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      let res = await publicFunc.run(`INSERT INTO ${entry.table} (folder_id, date, created, modified, content) VALUES (?, ?, ?, ?, ?)`,
        [entry.folder_id, entry.date, now(), now(), entry.content])
      return res && res.lastID ? res.lastID : false
    } catch (e) {
      console.log(e)
      return false
    }
  }

  /**
   * Update the content of an existing entry
   *
   * @param {Object} entry - An object with the following properties:
   * @param {string} entry.table - The table where the the entry is stored
   * @param {number|string} entry.id - ID of the entry to update
   * @param {string} entry.content - The body content
   *
   * @returns {Promise<boolean>}
   */
  publicFunc.updateEntry = async (entry) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      let res = await publicFunc.run(`UPDATE ${entry.table} SET modified = ?, content = ? WHERE id = ?`, [now(), entry.content, entry.id])
      // res.changes contains the number of rows deleted
      return res && res.changes
    } catch (e) {
      console.log(e)
      return false
    }
  }

  publicFunc.deleteEntry = async (entry, onlyIfEmpty = false) => {
    try {
      if (entry.table.match(/\W/)) return false // invalid characters in table name
      if (parseInt(entry.id, 10) !== entry.id) return false // invalid characters in ID
      let ifEmpty = onlyIfEmpty ? ' AND (content = "" OR content IS NULL)' : ''
      let res = await publicFunc.run(`DELETE FROM ${entry.table} WHERE id = ? ${ifEmpty}`, [entry.id])
      // res.changes contains the number of rows deleted
      return res && res.changes
    } catch (e) {
      console.log(e)
      return false
    }
  }

  /**
   * Fetch a journal entry by date
   *
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<unknown|boolean>}
   * Returns the matching row, or 'undefined' if no row found
   */
  publicFunc.getEntryByDate = async (date) => {
    if (!date) throw new Error('No date specified')
    try {
      return publicFunc.get('SELECT * FROM entries WHERE date = ?', [date])
    } catch (e) {
      console.log(e)
    }
    return false
  }

  /**
   * Get an entry from DB
   *
   * @param {string} table - Table name
   * @param {number|string} id - Entry ID
   * @returns {Promise<unknown>}
   */
  publicFunc.getById = function (table, id) {
    return new Promise(function (resolve, reject) {
      if (!table) reject(new Error('No table specified'))
      table = table.replace(/\W/g, '')
      publicFunc.get('SELECT * FROM ' + table + ' WHERE id = ?', [id])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  publicFunc.getAll = function (table, options) {
    return new Promise((resolve, reject) => {
      let orderBy = (options && options.orderBy) ? ' ORDER BY ' + options.orderBy : ''
      publicFunc.all('SELECT * FROM ' + table + orderBy)
        .then(rows => { resolve(rows) })
        .catch(err => { reject(err) })
    })
  }

  publicFunc.getEntryTree = function () {
    return new Promise(function (resolve, reject) {
      let tree = {}
      publicFunc.all('SELECT id, date FROM entries ORDER BY date ASC')
        .then((rows) => {
          for (let i = 0; i < rows.length; i++) {
            /*
            I feel that this section is a kludge, but I don't know a better way to do it :\
             */
            let row = rows[i]
            let year = row.date.substr(0, 4)
            let month = dayjs(row.date, DATE_DAY).format('MMMM')
            let day = dayjs(row.date, DATE_DAY).format('DD - dddd')

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

  publicFunc.getOption = function (name) {
    return new Promise(function (resolve, reject) {
      if (!name) { reject(new Error('No option specified')) }

      publicFunc.get('SELECT * FROM options WHERE name = ?', [name])
        .then((row) => {
          resolve((row && row.value) ? row.value : null)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  publicFunc.setOption = function (name, value) {
    return new Promise(function (resolve, reject) {
      if (!name) { reject(new Error('No option specified')) }

      publicFunc.run('INSERT OR REPLACE INTO options VALUES (?, ?)', [name, value])
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
  publicFunc.addAttachment = function (mimetype, data) {
    return new Promise(function (resolve, reject) {
      publicFunc.run('INSERT INTO attachments (created, mime_type, data) VALUES (?, ?, ?)', [now(), mimetype, data])
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

  publicFunc.getAttachment = function (id) {
    return new Promise(function (resolve, reject) {
      publicFunc.get('SELECT * FROM attachments WHERE id = ?', [id])
        .then((row) => {
          resolve(row)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  return publicFunc
})()

export default Datastore
