<template>
    <div id="wrapper">
        <main>
            <div id="sidebar">
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <div id="tree">
                    <Tree :tree="tree" @update="getEntryByDate"></Tree>
                </div>
            </div>
            <div id="content">
                <Editor ref="editor" :entry="entry"></Editor>
            </div>
        </main>
        <div v-html="'<style>' + calendarStyle + '</style>'" style="display:none"></div>
        <div v-html="'<style>' + customStyles + '</style>'" style="display:none"></div>
    </div>
</template>

<style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    .flatpickr-input {
        display: none;
    }

    .flatpickr-calendar {
        margin-bottom: 20px;
    }

    #wrapper {
        height: 100vh;
        padding: 46px 60px;
        width: 100vw;
    }

    main {
        display: flex;
        height: 100%;
        justify-content: stretch;
    }

    #sidebar {
        display: flex;
        flex-direction: column;
        margin-right: 40px;
    }

    #tree {
        overflow-y: auto;
    }

    #content {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
</style>

<script>
  import flatPickr from 'vue-flatpickr-component'
  import 'flatpickr/dist/flatpickr.css'
  import Editor from './Editor.vue'
  import Tree from './Tree.vue'

  export default {
    name: 'main',
    components: {
      flatPickr,
      Editor,
      Tree
    },
    data () {
      return {
        date: this.$moment().format(this.$db.DATE_DAY),
        entry: this.newEntry(),
        autosaveTimer: '',
        calendarMonth: null,
        calendarStyle: '',
        calConfig: {
          locale: {
            firstDayOfWeek: 1
          },
          inline: true,
          onMonthChange: (selectedDates, dateStr, instance) => {
            // Update calendar with new entry highlights
            let month = this.$moment(instance.currentMonth + 1, 'M').format('MMMM') // from 0-11 to MMMM
            this.updateCalendarEntries(month)
          }
        },
        customStyles: '',
        tree: {},
        editor: null
      }
    },
    mounted: function () {
      // Listen for goto commands from main menu
      this.$electron.ipcRenderer.on('goto', (event, arg) => {
        switch (arg) {
          case 'today':
            if (this.$router.currentRoute.name !== 'main') {
              this.$router.push('main')
            }
            this.date = this.$moment().format(this.$db.DATE_DAY)
            break
          case 'previous':
            if (this.$router.currentRoute.name !== 'main') break
            this.$db.get('SELECT date FROM entries WHERE DATE(date) < DATE(?) ORDER BY date DESC LIMIT 1', this.date)
              .then(row => {
                if (row && row.date) this.date = row.date
              })
            break
          case 'next':
            if (this.$router.currentRoute.name !== 'main') break
            this.$db.get('SELECT date FROM entries WHERE DATE(date) > DATE(?) ORDER BY date ASC LIMIT 1', this.date)
              .then(row => {
                if (row && row.date) this.date = row.date
              })
            break
        }
      })

      // Load existing entry if there is one
      this.getEntryByDate(this.entry.date)

      // Get entry tree
      this.updateTree()

      // Autosave entry
      this.autosaveTimer = setInterval(() => {
        this.save()
      }, 5000) // every 5 seconds

      // Save entry on close
      window.addEventListener('unload', this.save)

      // Set focus to editor
      this.$refs.editor.focus()
    },
    watch: {
      date: function () {
        /*
        Watch for when a new calendar date is picked, and then select the entry for that day.
        If no entry, then create a new blank one.
         */
        // Update marked entries on calendar
        let month = this.$moment(this.date).format('MMMM')
        if (this.calendarMonth !== month) {
          this.calendarMonth = month
          this.updateCalendarEntries()
        }

        // Update entry
        this.getEntryByDate(this.date)
      }
    },
    methods: {
      getContent () {
        return this.$refs.editor.getContent()
      },
      setContent (content) {
        this.entry.content = content
        if (this.$refs.editor) this.$refs.editor.setContent(content)
      },
      newEntry () {
        return {
          id: null,
          date: this.$moment().format(this.$db.DATE_DAY),
          content: null,
          tags: []
        }
      },
      clearEntry () {
        this.entry = this.newEntry()
        this.setContent(null)
      },
      getEntryByDate (date) {
        if (this.$moment(date, this.$db.DATE_DAY).format(this.$db.DATE_DAY) !== date) {
          return false // invalid date
        }

        // Check if we need to save the current entry
        this.save()
        // And create a blank entry
        this.clearEntry()

        this.date = date
        this.entry.date = date
        this.$db.getEntryByDate(date)
          .then((row) => {
            if (row && 'entry_id' in row && 'date' in row && 'content' in row) {
              // If exisitng entry, then fill in existing data
              this.entry.id = row.entry_id
              this.entry.date = row.date
              this.setContent(row.content)
            }
          })
          .catch((err) => {
            if (err.number === 101) {
              // No entry at this date
              console.debug(err.message)
            } else {
              console.error(err)
            }
          })
      },
      save () {
        if (!this.$refs.editor.editor) return // editor hasn't loaded
        if (this.getContent() === this.entry.content) {
          return // entry has not changed
        }

        // Get latest content from TinyMCE
        this.entry.content = this.getContent()

        // Save tags in DB
        this.updateTags()

        if (!this.entry.content || this.entry.content === '<p><br></p>') {
          /* Entry is empty
             If it exists, then prune it from DB
             '<p><br></p>' is the minimum content for an empty Quill editor */
          if (this.entry.id) {
            this.$db.deleteEntry(this.entry)
              .then(() => {
                console.info('Empty entry ' + this.entry.id + ' has been pruned')
                this.clearEntry()
                this.updateTree()
              })
              .catch((error) => {
                console.error(error)
              })
          }
        } else if (this.entry.id) {
          // Entry ID already exists, update existing entry
          this.$db.updateEntry(this.entry)
            .then(() => {
              console.log(this.$moment().format('HH:mm:ss') + ' saved entry', 'ID: ' + this.entry.id)
              this.entry.saved = true
            })
            .catch(() => {
              console.error('FAILED TO SAVE ENTRY')
            })
        } else {
          // No existing entry, so create new entry
          this.$db.createNewEntry(this.entry)
            .then((entryId) => {
              this.entry.id = entryId
              console.info(this.$moment().format('HH:mm:ss') + ' created new entry', 'ID: ' + this.entry.id)
              this.entry.saved = true
              this.updateTree()
            })
            .catch((err) => {
              console.error(err)
            })
        }
      },
      updateTags () {
        if (!this.entry.id) return

        // Get the existing database list of tags for this entry
        this.$db.all('SELECT tag_id FROM entry_tags WHERE entry_id = ?', [this.entry.id])
          .then((rows) => {
            let tags = {}

            // Add database tags to array
            for (let i = 0; i < rows.length; i++) {
              tags[rows[i].tag_id] = true
            }

            // Find tags in live entry
            if (this.entry.content) {
              let classes = /<[^>]*?class="([^"]*tag\d+[^"]*)"/g
              let match
              let processed = []
              do {
                // Find all classes containing at least one tag
                match = classes.exec(this.entry.content)
                if (match) {
                  let tagReg = /tag(\d+)/g
                  let tag
                  do {
                    // Find all tags inside those classes
                    tag = tagReg.exec(match[1])
                    if (tag && !processed[tag[1]]) {
                      let tagId = tag[1]
                      if (!tags[tagId]) {
                        // Live tag doesn't exist, so add it to database
                        this.$db.run('REPLACE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', [this.entry.id, tagId])
                      } else {
                        // Otherwise remove from database array
                        delete tags[tagId]
                      }
                      processed[tagId] = true
                    }
                  } while (tag)
                }
              } while (match)
            }

            // Whatever remains in the database array no longer remains in the entry, so delete them from table
            for (let tagId in tags) {
              this.$db.run('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?', [this.entry.id, tagId])
            }
          })
      },
      updateTree () {
        this.$db.getEntryTree()
          .then((tree) => {
            // Set tree
            this.tree = tree
            this.updateCalendarEntries()
          })
          .catch(err => { console.error(err) })
      },
      updateCalendarEntries (monthName) {
        /*
          Mark all dates with entries on the calendar
         */
        let year = this.$moment(this.date).format('YYYY')
        let month = monthName || this.$moment(this.date).format('MMMM')
        if (!this.tree || !this.tree[year] || !this.tree[year]['months'][month]) {
          return // if the tree is not yet set
        }
        let entries = this.tree[year]['months'][month]['entries']
        let styles = []
        let style = ''
        if (entries.length) {
          for (let i = 0; i < entries.length; i++) {
            let flatpickrDate = this.$moment(entries[i].date).format('MMMM D, YYYY')
            styles[i] = 'span[aria-label="' + flatpickrDate + '"]'
          }
          style = styles.join(', ') + ' { background-color: #D0E4F8; }'
        }
        this.calendarStyle = style
      }
    },
    beforeDestroy: function () {
      this.save()
      window.removeEventListener('unload', this.save)
      clearInterval(this.autosaveTimer)
    }
  }
</script>
