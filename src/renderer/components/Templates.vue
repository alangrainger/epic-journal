<template>
    <div id="wrapper">
        <main>
            <div id="sidebar">
                <p>Current templates:</p>
                <button @click="clearEntry">Add New</button>
                <div class="row" v-for="item in templates" @click="load(item.template_id)" :class="{ selected: item.template_id === entry.id }">
                    {{ item.name }}
                </div>
            </div>
            <div id="content">
                <input id="name" v-model="entry.name" placeholder="Template name" @keyup="entry.nameChanged = true"/>
                <Editor ref="editor" :entry="entry"></Editor>
            </div>
        </main>
    </div>
</template>

<style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
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

    .row {
        padding: 10px;
        background: white;
        border-bottom: 1px solid #F0F0F0;
        cursor: pointer;
    }

    .selected {
        background: #D0E4FC;
    }

    #name {
        font-size: 1.5em;
        margin-bottom: 0.2em;
        padding: 5px 10px;
        border: none;
        background: none;
    }

    #content {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
</style>

<script>
  import Editor from './Editor.vue'

  export default {
    name: 'templates',
    components: {
      Editor
    },
    data () {
      return {
        name: 'templates',
        templates: [],
        entry: this.newEntry(),
        autosaveTimer: '',
        customStyles: '',
        editor: null
      }
    },
    mounted: function () {
      this.updateList()

      // Autosave entry
      this.autosaveTimer = setInterval(() => {
        this.save()
      }, 5000) // every 5 seconds

      // Save entry on close
      window.addEventListener('unload', this.save)
    },
    methods: {
      getContent () {
        return this.$refs.editor.getContent()
      },
      setContent (content) {
        this.entry.content = content
        this.$refs.editor.setContent(content)
      },
      newEntry () {
        return {
          id: null,
          name: '',
          content: null
        }
      },
      clearEntry () {
        this.entry = this.newEntry()
        this.setContent(null)
        document.getElementById('name').focus()
      },
      updateList () {
        // Get list of existing templates
        this.$db.all('SELECT * FROM templates ORDER BY name ASC')
          .then(rows => {
            this.templates = rows
          })
          .catch((err) => { console.error(err) })
      },
      load (id) {
        // Check if we need to save the current entry
        this.save()

        // Get template from DB
        this.$db.getById('templates', id)
          .then((row) => {
            if (row) {
              this.entry.id = row.template_id
              this.entry.name = row.name
              this.setContent(row.content)
            } else {
              this.clearEntry()
            }
          })
          .catch((error) => {
            console.error(error)
          })

        // Set focus to editor
        this.$refs.editor.focus()
      },
      save () {
        if (!this.$refs.editor.editor) return // editor hasn't loaded
        if (this.getContent() === this.entry.content && !this.entry.nameChanged) {
          return // entry has not changed
        }
        if (!this.entry.name) return // no name

        // Get latest content from TinyMCE
        this.entry.content = this.getContent()

        if (!this.entry.content || this.entry.content === '<p><br></p>') {
          /* Entry is empty
             If it exists, then prune it from DB
             '<p><br></p>' is the minimum content for an empty Quill editor */
          if (this.entry.id) {
            this.$db.delete('templates', this.entry.id)
              .then(() => {
                this.entry.id = null
              })
              .catch((error) => {
                console.error(error)
              })
          }
        } else if (this.entry.id) {
          // Entry ID already exists, update existing entry
          let data = {
            name: this.entry.name,
            content: this.entry.content
          }
          this.$db.update('templates', data, this.entry.id)
            .then(() => {
              console.log(this.$moment().format('HH:mm:ss') + ' saved entry', 'ID: ' + this.entry.id)
            })
            .catch(() => {
              console.error('FAILED TO SAVE ENTRY')
            })
        } else {
          // No existing entry, so create new entry
          let date = this.$moment().format(this.$db.DATE_SQL)
          this.$db.insert('templates', {
            name: this.entry.name,
            content: this.entry.content,
            created: date,
            modified: date
          })
            .then(id => {
              this.entry.id = id
              console.info(this.$moment().format('HH:mm:ss') + ' created new entry', 'ID: ' + this.entry.id)
            })
            .catch(err => { console.error(err) })
        }
        this.entry.nameChanged = false
        this.updateList()
      }
    },
    beforeDestroy: function () {
      this.save()
      window.removeEventListener('unload', this.save)
      clearInterval(this.autosaveTimer)
    }
  }
</script>
