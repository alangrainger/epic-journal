<template>
    <div id="main">
        <div id="wrapper">
            <div id="sidebar">
                <pre>{{date}}</pre>
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <pre>{{entryId}}</pre>
                <EntriesTree ref="entriesTree" :selected="entryId"></EntriesTree>
            </div>
            <div id="content">
                <Editor ref="editor"
                        @update="updateTree"
                        @close="onClose"></Editor>
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
      table: 'entries',
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
  computed: {
    template () {
      return {
        id: null,
        date: this.$route.params.date,
        table: this.table,
        folder_id: 1,
        content: '',
        tags: []
      }
    }
  },
  mounted () {
    // Update calendar
    this.updateCalendarEntries(this.date.substring(0, 4), this.date.substring(5, 7))
  },
  watch: {
    date () {
      this.goToDate(this.date)
    },
    '$route.params.date': {
      handler () {
        this.getEntryByDate(this.$route.params.date)
      },
      immediate: true
    }
  },
  methods: {
    async onClose (data) {
      // Prune empty current entry from the database on entry change
      if (await this.$db.deleteEntry({id: data.id, table: this.table}, true)) {
        console.log(`Pruned empty entry ${data.id}`)
        this.updateTree()
      }
    },
    goToDate (date) {
      if (
        this.$moment(date).format(this.$db.DATE_DAY) === date && // valid date format
        this.$route.params.date !== date // not the current route
      ) {
        this.$router.push({name: 'home', params: {date: date}})
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
        await this.$refs.editor.load(this.table, entry.id)
      } else {
        await this.$refs.editor.new(this.template)
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
      this.$db.all(`SELECT date FROM ${this.table} WHERE DATE(date) BETWEEN DATE('${start}') AND date('${end}') AND folder_id = 1 ORDER BY date ASC`)
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
