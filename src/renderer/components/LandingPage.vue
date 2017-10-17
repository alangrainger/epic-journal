<template>
    <div id="wrapper">
        <main>
            <div id="sidebar">
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <p>Entry date: {{ entry.date }}</p>
                <p>Saved: {{ entry.saved }}</p>
                <p>ID: {{ entry.id }}</p>
                <button @click="getCSS">get CSS</button>
                &nbsp;
                <button @click="setCSS">Set CSS styles</button>
                <Tree :tree="tree" @update="getEntryByDate"></Tree>
            </div>
            <div id="content" @keydown="entry.saved = false">
                <vue-editor id="editor" v-model="entry.content"></vue-editor>
                <div v-html="'<style>' + customStyles + '</style>'"></div>
            </div>
        </main>
    </div>
</template>
<script>
  import { VueEditor } from 'vue2-editor'
  import flatPickr from 'vue-flatpickr-component'
  import 'flatpickr/dist/flatpickr.css'
  import Tree from './Tree.vue'

  export default {
    name: 'landing-page',
    components: {
      VueEditor,
      flatPickr,
      Tree
    },
    mounted: function () {
      var vm = this

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
        vm.customStyles = result
      })

      // Load existing entry if there is one
      this.$db.getEntryByDate(this.entry.date, function (row) {
        if (row) {
          vm.entry.content = row.content
          vm.entry.id = row.entry_id
        }
      })

      // Get entry tree
      this.updateTree()

      // Autosave every 60 seconds
      setInterval(function () {
        if (!vm.entry.saved) {
          vm.save()
        }
      }, 60000)
    },
    data () {
      return {
        date: this.$moment().format(this.$db.DATE_DAY),
        entry: {
          id: null,
          date: this.date,
          content: null,
          saved: true
        },
        calConfig: {
          inline: true
        },
        customStyles: '',
        tree: {}
      }
    },
    watch: {
      date: function () {
        /*
        Watch for when a new calendar date is picked, and then select the entry for that day.
        If no entry, then create a new blank one.
         */
        var vm = this

        // First check if we need to save the current entry
        if (!vm.entry.saved) {
          vm.save()
        }

        // Then either fetch the new entry, or create a blank canvas
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
      updateDate (date) {
        this.entry.date = date
      },
      getEntryByDate (date) {
        if (this.$moment(date, this.$db.DATE_DAY).format(this.$db.DATE_DAY) !== date) {
          return false // invalid date
        }
        var vm = this
        this.date = date
        this.entry.date = date
        this.$db.getEntryByDate(date, function (row) {
          if (row) {
            // There is an existing entry for that date
            vm.entry.content = row.content
            vm.entry.id = row.entry_id
          } else {
            vm.clearEntry()
          }
        })
      },
      save () {
        var vm = this
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
              vm.updateTree()
            } else {
              console.log('FAILED TO CREATE NEW ENTRY!')
            }
          })
        }
        this.entry.saved = true
      },
      updateTree () {
        var vm = this
        this.$db.getEntryTree(function (tree) {
          vm.tree = tree
        })
      },
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      getCSS () {
        var vm = this
        this.$db.getOption('css', function (result) {
          vm.customStyles = result
          vm.entry.content = result
        })
      },
      setCSS () {
        // TODO: write a proper editor
        // stripping the HTML tags out for now, need to write a proper CSS editor page
        var css = this.content.replace(/<\/?[^>]+(>|$)/g, '')
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
        display: none;
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
