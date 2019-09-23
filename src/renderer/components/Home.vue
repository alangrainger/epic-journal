<template>
    <div id="main">
        <div id="wrapper">
            <div id="sidebar">
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <EntriesTree ref="entriesTree" :entry="entry"></EntriesTree>
            </div>
            <div id="content">
                <Editor ref="editor" table="entries" :id="23"></Editor>
            </div>
            <div v-html="'<style>' + calendarStyle + '</style>'" style="display:none"></div>
            <div v-html="'<style>' + customStyles + '</style>'" style="display:none"></div>
        </div>
    </div>
</template>

<style scoped>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    #main {
        height: 100%;
    }

    #wrapper {
        display: flex;
        height: 100%;
        justify-content: stretch;
    }

    .flatpickr-input {
        display: none;
    }

    .flatpickr-calendar {
        margin-bottom: 20px;
    }

    #sidebar {
        display: flex;
        flex-direction: column;
        margin-right: 40px;
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
import EntriesTree from './EntriesTree.vue'

export default {
  name: 'home',
  components: {
    flatPickr,
    Editor,
    EntriesTree
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
          this.updateCalendarEntries(instance.currentYear, instance.currentMonth + 1)
        }
      },
      customStyles: '',
      tree: [],
      editor: null
    }
  },
  mounted: function () {
    // Load specified entry if there is one
    if (this.$route.params.id) {
      this.getEntryById(this.$route.params.id)
    } else {
      // Load today's entry if there is one
      this.getEntryByDate(this.date)
    }

    // Autosave entry
    this.autosaveTimer = setInterval(() => {
      this.save()
    }, 3000) // every 3 seconds

    // Save entry on close
    window.addEventListener('unload', this.save)

    // Set focus to editor
    this.$refs.editor.focus()

    // Update calendar
    this.updateCalendarEntries(this.date.substring(0, 4), this.date.substring(5, 7))
  },
  watch: {
    date () {
      this.getEntryByDate(this.date)
      let newMonth = this.date.substring(0, 7)
      if (newMonth !== this.calendarMonth) {
        this.updateCalendarEntries(this.date.substring(0, 4), this.date.substring(5, 7))
        this.calendarMonth = newMonth
      }
    },
    '$route.params.id' (id) {
      // Watch for route to be updated with new entry ID
      this.getEntryById(id)
    },
    'entry.id' () {
      this.$root.entryId = this.entry.id
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
        date: this.$moment(this.date).format(this.$db.DATE_DAY),
        content: null,
        tags: []
      }
    },
    getEntryById (id) {
      if (!id) return false

      // Check if we need to save the current entry
      this.save()

      this.$db.getById('entries', id)
        .then((row) => {
          if (row && 'entry_id' in row && 'date' in row && 'content' in row) {
            // If exisitng entry, then set entry object
            let data = this.newEntry()
            data.id = row.entry_id
            data.date = row.date
            data.content = row.content
            this.setContent(row.content)
            this.date = row.date
            this.entry = data
          } else {
            // Create new entry
            this.setContent(null)
            this.entry = this.newEntry()
          }
        })
        .catch((err) => { console.error(err) })
    },
    getEntryByDate (date) {
      if (this.$moment(date, this.$db.DATE_DAY).format(this.$db.DATE_DAY) !== date) {
        return false // invalid date
      }

      // Check if we need to save the current entry
      this.save()

      this.date = date
      this.$db.getEntryByDate(date)
        .then((row) => {
          if (row && 'entry_id' in row && 'date' in row && 'content' in row) {
            // If exisitng entry, route to ID
            if (row.entry_id !== this.$root.entryId) this.$router.push({name: 'home', params: {id: row.entry_id}})
          } else {
            // Create new entry
            this.setContent(null)
            this.entry = this.newEntry()
          }
        })
        .catch((err) => { console.error(err) })
    },
    save () {
      if (!this.$refs.editor.editor) return // editor hasn't loaded
      let liveContent = this.getContent()
      if (this.entry.content === liveContent) {
        return // entry has not changed - no need to save
      } else {
        this.entry.content = liveContent
      }

      let entryToSave = this.entry

      // Save tags in DB
      this.updateTags(entryToSave)

      if (!entryToSave.content) {
        // Entry is empty. If it exists, then prune it from DB
        if (entryToSave.id) {
          this.$db.deleteEntry(entryToSave)
            .then(() => {
              console.debug('Empty entry ' + entryToSave.id + ' has been pruned')
              this.entry = this.newEntry()
              this.$router.push({name: 'home'}) // change the route
              if (entryToSave.date) {
                // Update tree and calendar
                let year = entryToSave.date.substring(0, 4)
                let month = entryToSave.date.substring(5, 7)
                this.$refs.entriesTree.findMonth(year, month).update()
                this.updateCalendarEntries(year, month)
              }
            })
            .catch((error) => {
              console.error(error)
            })
        }
      } else if (entryToSave.id) {
        // Entry ID already exists, update existing entry
        this.$db.updateEntry(entryToSave)
          .then(() => {
            console.debug(this.$moment().format('HH:mm:ss') + ' saved entry for ' + entryToSave.date, 'ID: ' + entryToSave.id)
          })
          .catch(() => {
            console.error('FAILED TO SAVE ENTRY')
          })
      } else {
        // No existing entry, so create new entry
        this.$db.createNewEntry(entryToSave)
          .then((entryId) => {
            entryToSave.id = entryId
            console.debug(this.$moment().format('HH:mm:ss') + ' created new entry', 'ID: ' + entryToSave.id)
            // If the current visible entry hasn't already changed (e.g. through clicking the calendar)
            // then update the ID
            if (this.date === entryToSave.date) {
              this.entry.id = entryToSave.id
              this.$router.push({name: 'home', params: {id: entryToSave.id}}) // change the route
            }
            // Update tree and calendar
            let year = entryToSave.date.substring(0, 4)
            let month = entryToSave.date.substring(5, 7)
            this.$refs.entriesTree.findMonth(year, month).update()
            this.updateCalendarEntries(year, month)
          })
          .catch((err) => {
            console.error(err)
          })
      }
    },
    updateTags (entry) {
      if (!entry.id) return

      // Get the existing database list of tags for this entry
      this.$db.all('SELECT tag_id FROM entry_tags WHERE entry_id = ?', [entry.id])
        .then((rows) => {
          let tags = {}

          // Add database tags to array
          for (let i = 0; i < rows.length; i++) {
            tags[rows[i].tag_id] = true
          }

          // Find tags in live entry
          if (entry.content) {
            let classes = /<[^>]*?class="([^"]*tag\d+[^"]*)"/g
            let match
            let processed = []
            do {
              // Find all classes containing at least one tag
              match = classes.exec(entry.content)
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
                      this.$db.run('REPLACE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', [entry.id, tagId])
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
            this.$db.run('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?', [entry.id, tagId])
          }
        })
    },
    updateCalendarEntries (year, month) {
      /*
        Mark all dates with entries on the calendar
       */
      let start = this.$moment(year + '-' + month, 'YYYY-M').startOf('month').format(this.$db.DATE_DAY)
      let end = this.$moment(year + '-' + month, 'YYYY-M').endOf('month').format(this.$db.DATE_DAY)
      this.$db.all('SELECT date FROM entries WHERE DATE(date) BETWEEN DATE(\'' + start + '\') AND date(\'' + end + '\') AND folder_id = 1 ORDER BY date ASC')
        .then(rows => {
          let styles = []
          for (let i = 0; i < rows.length; i++) {
            let flatpickrDate = this.$moment(rows[i].date).format('MMMM D, YYYY')
            styles.push('span[aria-label="' + flatpickrDate + '"]')
          }
          this.calendarStyle = styles.join(', ') + ' { background-color: #D0E4F8; }'
        })
    }
  },
  beforeDestroy: function () {
    this.save()
    window.removeEventListener('unload', this.save)
    clearInterval(this.autosaveTimer)
  }
}
</script>
