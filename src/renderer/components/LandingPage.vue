<template>
    <div id="wrapper">
        <main>
            <div id="sidebar">
                <flat-pickr v-model="date" :config="calConfig" @click="console.log(this)"></flat-pickr>
                <input id="calendar" v-model="date" type="text" title="Calendar">
                <p>Saved: {{ entry.saved }}, AID: {{ autosaveEntryId }}, ID: {{entry.id}}</p>
                <button @click="save">Save entry</button>
                <button @click="getCSS">Get CSS into current editor</button>
                <button @click="setCSS">Set CSS styles</button>
                <Tree :tree="tree" @update="getEntryByDate"></Tree>
            </div>
            <div id="content">
                <vue-editor id="editor" v-model="entry.content"></vue-editor>
            </div>
        </main>
        <div v-html="'<style>' + calendarStyle + '</style>'"></div>
        <div v-html="'<style>' + customStyles + '</style>'"></div>
    </div>
</template>
<script>
  import { VueEditor } from 'vue2-editor'
  import flatPickr from 'vue-flatpickr-component'
  import 'flatpickr/dist/flatpickr.css'
  import Tree from './Tree.vue'

  const flatpickr = require('flatpickr')

  let vm = ''

  export default {
    name: 'landing-page',
    components: {
      VueEditor,
      flatPickr,
      Tree
    },
    created: function () {
      vm = this
    },
    mounted: function () {
      // Create calendar
      this.flatpickr = flatpickr('#calendar', {
        locale: {
          firstDayOfWeek: 1
        },
        inline: true,
        onMonthChange: function (selectedDates, dateStr, instance) {
          // Update calendar with new entry highlights
          let month = vm.$moment(instance.currentMonth + 1, 'M').format('MMMM') // from 0-11 to MMMM
          vm.updateCalendarEntries(month)
        }
      })

      // Listen for goto commands from main menu
      this.$electron.ipcRenderer.on('goto', (event, arg) => {
        switch (arg) {
          case 'today':
            vm.date = this.$moment().format(this.$db.DATE_DAY)
            break
        }
      })

      // Load CSS
      this.$db.getOption('css', function (result) {
        if (result) { vm.customStyles = result }
      })

      // Load existing entry if there is one
      this.$db.getEntryByDate(this.entry.date, function (row) {
        if (row) {
          vm.setEntryFromRow(row)
        }
      })

      // Get entry tree
      this.updateTree()

      // Autosave entry
      setInterval(function () {
        if (!vm.entry.saved) {
          vm.save()
        }
      }, 15000) // every 15 seconds
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
        autosaveEntryId: null,
        calendarMonth: null,
        calendarStyle: '',
        calConfig: {
          locale: {
            firstDayOfWeek: 1
          },
          inline: true,
          onMonthChange: function (selectedDates, dateStr, instance) {
            // Update calendar with new entry highlights
            let month = vm.$moment(instance.currentMonth + 1, 'M').format('MMMM') // from 0-11 to MMMM
            vm.updateCalendarEntries(month)
          }
        },
        customStyles: '',
        tree: {}
      }
    },
    watch: {
      content: function () {
        // Watch the editor for changes we need to save
        if (this.autosaveEntryId === this.entry.id) {
          this.entry.saved = false
        } else {
          // If we have changed entries through the calendar, don't save, just update the ID
          this.autosaveEntryId = this.entry.id
        }
      },
      date: function () {
        /*
        Watch for when a new calendar date is picked, and then select the entry for that day.
        If no entry, then create a new blank one.
         */
        // Set calendar to new date
        this.flatpickr.setDate(this.date)

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
      clearEntry () {
        this.entry.id = null
        this.entry.date = this.date
        this.entry.content = null
        this.entry.saved = true
      },
      setEntryFromRow (row) {
        if (row && 'entry_id' in row && 'date' in row && 'content' in row) {
          this.entry.id = row.entry_id
          this.entry.date = row.date
          this.entry.content = row.content
          this.entry.saved = true
        }
      },
      getEntryByDate (date) {
        if (this.$moment(date, this.$db.DATE_DAY).format(this.$db.DATE_DAY) !== date) {
          return false // invalid date
        }

        // Check if we need to save the current entry
        if (!this.entry.saved) {
          this.save()
        }

        let vm = this
        this.date = date
        this.entry.date = date
        this.$db.getEntryByDate(date, function (row) {
          if (row) {
            // There is an existing entry for that date
            vm.setEntryFromRow(row)
          } else {
            vm.clearEntry()
          }
        })
      },
      save () {
        let vm = this
        if (!this.entry.content || this.entry.content === '<p><br></p>') {
          /* Entry is empty
             If it exists, then prune it from DB
             '<p><br></p>' is the minimum content for an empty Quill editor */
          if (this.entry.id) {
            this.$db.deleteEntry(this.entry, function (result) {
              if (result) {
                console.log('Empty entry ' + vm.entry.id + ' has been pruned')
                vm.clearEntry()
                vm.updateTree()
              }
            })
          }
        } else if (this.entry.id) {
          // Entry ID already exists, update existing entry
          this.$db.updateEntry(this.entry, function (result) {
            if (result) {
              console.log(vm.$moment().format('HH:mm:ss') + ' saved entry', 'ID: ' + vm.entry.id)
              vm.entry.saved = true
            } else {
              console.log('FAILED TO SAVE ENTRY!')
            }
          })
        } else {
          // No existing entry, so create new entry
          this.$db.createNewEntry(vm.entry, function (entryId) {
            if (entryId) {
              vm.entry.id = entryId
              console.log(vm.$moment().format('HH:mm:ss') + ' created new entry', 'ID: ' + vm.entry.id)
              vm.entry.saved = true
              vm.updateTree()
            } else {
              console.log('FAILED TO CREATE NEW ENTRY!')
            }
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
        // Mark entry dates for this month on calendar
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
      },
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      getCSS () {
        let vm = this
        this.$db.getOption('css', function (result) {
          vm.customStyles = result
          vm.entry.content = result
        })
      },
      setCSS () {
        // TODO: write a proper editor
        // stripping the HTML tags out for now, need to write a proper CSS editor page
        let css = this.entry.content.replace(/<\/?[^>]+(>|$)/g, '')
        this.customStyles = css
        this.$db.setOption('css', css)
      }
    }
  }
</script>

<style>
    /* @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro'); */

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    .flatpickr-input {
        display: block;
    }

    .flatpickr-calendar {
        margin-bottom: 20px;
    }

    body {
        font-family: sans-serif;
    }

    #wrapper {
        height: 100vh;
        padding: 60px 80px;
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

    #content {
        display: flex;
        flex-grow: 1;
    }

    .quillWrapper {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
    }

    #editor {
        display: flex;
        flex-grow: 1;
        flex-direction: row;
    }

    .ql-editor {
        width: 100%;
    }

    .welcome {
        color: #555;
        font-size: 23px;
        margin-bottom: 10px;
    }

    .title {
        color: #2c3e50;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 6px;
    }

    .title.alt {
        font-size: 18px;
        margin-bottom: 10px;
    }

    #editor p {
        color: black;
        font-size: 14pt;
        margin-bottom: 0.7em;
    }

    .doc button {
        font-size: .8em;
        cursor: pointer;
        outline: none;
        padding: 0.75em 2em;
        border-radius: 2em;
        display: inline-block;
        color: #fff;
        background-color: #4fc08d;
        transition: all 0.15s ease;
        box-sizing: border-box;
        border: 1px solid #4fc08d;
    }

    .doc button.alt {
        color: #42b983;
        background-color: transparent;
    }
</style>
