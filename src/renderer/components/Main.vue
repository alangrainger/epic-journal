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
    name: 'landing-page',
    components: {
      flatPickr,
      Editor,
      Tree
    },
    data () {
      return {
        date: this.$moment().format(this.$db.DATE_DAY),
        entry: {
          id: null,
          date: this.$moment().format(this.$db.DATE_DAY),
          content: null,
          saved: true
        },
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
            this.date = this.$moment().format(this.$db.DATE_DAY)
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
      this.focusOnEditor()
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
        this.$refs.editor.setContent(content)
      },
      focusOnEditor () {
        document.getElementById('editor').focus()
      },
      clearEntry () {
        this.entry.id = null
        this.entry.date = this.date
        this.entry.saved = true
        this.setContent(null)
      },
      setEntryFromRow (row) {
        if (row && 'entry_id' in row && 'date' in row && 'content' in row) {
          this.entry.id = row.entry_id
          this.entry.date = row.date
          this.entry.saved = true
          this.setContent(row.content)
        }
      },
      getEntryByDate (date) {
        if (this.$moment(date, this.$db.DATE_DAY).format(this.$db.DATE_DAY) !== date) {
          return false // invalid date
        }

        // Check if we need to save the current entry
        this.save()

        this.date = date
        this.entry.date = date
        this.$db.getEntryByDate(date)
          .then((row) => {
            this.setEntryFromRow(row)
          })
          .catch((err) => {
            if (err === 'dont output these') console.log(err)
            this.clearEntry()
          })
        this.focusOnEditor()
      },
      save () {
        if (!this.$refs.editor.editor) return // editor hasn't loaded
        if (this.getContent() === this.entry.content) {
          return // entry has not changed
        }

        // Get latest content from TinyMCE
        this.entry.content = this.getContent()

        if (!this.entry.content || this.entry.content === '<p><br></p>') {
          /* Entry is empty
             If it exists, then prune it from DB
             '<p><br></p>' is the minimum content for an empty Quill editor */
          if (this.entry.id) {
            this.$db.deleteEntry(this.entry)
              .then(() => {
                console.log('Empty entry ' + this.entry.id + ' has been pruned')
                this.clearEntry()
                this.updateTree()
              })
              .catch((error) => {
                console.log(error)
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
              console.log('FAILED TO SAVE ENTRY')
            })
        } else {
          // No existing entry, so create new entry
          this.$db.createNewEntry(this.entry)
            .then((entryId) => {
              this.entry.id = entryId
              console.log(this.$moment().format('HH:mm:ss') + ' created new entry', 'ID: ' + this.entry.id)
              this.entry.saved = true
              this.updateTree()
            })
            .catch((err) => {
              console.log(err)
            })
        }
      },
      updateTree () {
        this.$db.getEntryTree()
          .then((tree) => {
            // Set tree
            this.tree = tree
            this.updateCalendarEntries()
          })
          .catch(console.error)
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
