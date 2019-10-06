<template>
    <div id="main">
        <div id="wrapper">
            <div id="sidebar">
                <pre>{{date}}</pre>
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <EntriesTree ref="entriesTree" :selected="entryId"></EntriesTree>
            </div>
            <div id="content">
                <Editor ref="editor" table="entries" :id="entryId" @created="updateTree" @deleted="updateTree"></Editor>
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
      entryId: null,
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
  mounted () {
    if (!this.$route.params.date) {
      // If we don't have an entry ID requested, try today's date
      this.getEntryByDate(this.$moment().format(this.$db.DATE_DAY))
    }
    // Autosave entry
    /* this.autosaveTimer = setInterval(() => {
      this.save()
    }, 3000) // every 3 seconds */

    // Save entry on close
    // window.addEventListener('unload', this.save)

    // Set focus to editor
    this.$refs.editor.focus()

    // Update calendar
    this.updateCalendarEntries(this.date.substring(0, 4), this.date.substring(5, 7))
  },
  watch: {
    date () {
      this.goToDate(this.date)
    },
    /**
     * Watch for route to be updated with new entry ID
     * and set that as the local ID
     */
    '$route.params.date' () {
      this.getEntryByDate(this.$route.params.date)
    },
    entryId () {
      console.log(this.entryId)
      // this.getEntryById(this.entryId)
    }
  },
  methods: {
    goToDate (date) {
      if (
        this.$moment(date).format(this.$db.DATE_DAY) === date && // valid date format
        this.$route.params.date !== date // not the current route
      ) {
        this.$router.push({name: 'home', params: {date: date}})
      }
    },
    newEntry (date) {
      return {
        id: null,
        date: date,
        table: 'entries',
        folder_id: 1,
        content: '',
        tags: []
      }
    },
    updateTree () {
      // Update tree and calendar
      let year = this.date.substring(0, 4)
      let month = this.date.substring(5, 7)
      this.$refs.entriesTree.findMonth(year, month).update()
      this.updateCalendarEntries(year, month)
    },
    async getEntryByDate (date) {
      if (!date) date = this.$moment().format(this.$db.DATE_DAY)
      let entry = await this.$db.getEntryByDate(date)
      if (entry) {
        this.entryId = entry.id
      } else {
        // No existing entry found, create a new entry
        console.log(`Creating new entry`)
        entry = this.newEntry(date)
        let id = await this.$db.createEntry(entry)
        if (!id) {
          console.log('ERROR CREATING ENTRY')
          return
        }
        this.entryId = id
      }
      this.date = entry.date
      this.updateTree()
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
    // this.save()
    window.removeEventListener('unload', this.save)
    clearInterval(this.autosaveTimer)
  }
}
</script>
