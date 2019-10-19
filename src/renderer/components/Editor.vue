<template>
    <div id="editorContainer">
        <div :id="editorId"></div>
        <div id="statusbar">ID: {{ $root.entryId }} {{ $route.fullPath }} {{ statusBarTags }}<span style="float:right">{{ wordCount }} </span></div>
    </div>
</template>

<script>
import { nativeImage } from 'electron'
import fs from 'fs'
import path from 'path'

let tinymce = require('tinymce')
tinymce.baseURL = 'static/tinymce'

let scrollbarCSS = `
/* Scrollbars */
::-webkit-scrollbar-track
{
    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.1);
    background-color: #FEFEFE;
}

::-webkit-scrollbar
{
    width: 6px;
    background-color: #FEFEFE;
}

::-webkit-scrollbar-thumb
{
    background-color: #E0E0E0;
}
    `

export default {
  data () {
    return {
      editorId: 'editor',
      editor: '',
      entry: null,
      lastContent: null,
      scrollCheck: '',
      scrollCheckLength: 20,
      attachments: [],
      customCSS: '',
      styleList: [],
      tagList: {},
      tagContextItems: [],
      tinymce: '',
      templates: [],
      statusBarTags: '',
      wordCount: 'Words: 0',
      autosaveTimer: null
    }
  },
  async mounted () {
    // Get custom dropdown styles before initialising the editor
    await this.getStyles()
    // Initialise the editor
    await this.createEditor()
    // Get custom CSS
    await this.getCustomCSS()
    // Get templates
    await this.getTemplates()
    // Get tags
    await this.getTags()
    // Inject the custom stylesheet
    this.editor.dom.addStyle(this.customCSS)
    // Add tags and templates to menus
    this.addMenus()
    // Add keyboard shortcuts
    this.addKeyboardShortcuts()

    // Autosave entry
    this.autosaveTimer = setInterval(() => {
      this.save()
    }, 3000) // every 3 seconds
    // Save entry on close
    window.addEventListener('unload', this.save)
  },
  methods: {
    async new (template) {
      await this.save()
      console.log('Creating blank entry')
      this.entry = JSON.parse(JSON.stringify(template))
      this.setContent(null)
    },
    async load (table, id) {
      await this.save()
      if (this.entry && this.entry.id && id !== this.entry.id) {
        // We're changing to a different entry
        this.$emit('close', {id: this.entry.id})
      }
      try {
        let data = await this.$db.getById(table, id)
        if (data) {
          data.table = table
          this.entry = data
          console.log(`Loading ID ${id} from DB`)
          this.$emit('open', {id: data.id})
          this.setContent(data.content)
        }
      } catch (e) {
        console.log('Error loading DB content')
        console.log(e)
      }
    },
    focus () {
      if (this.editor) this.editor.focus()
    },
    getContent () {
      if (this.editor) {
        return this.editor.getContent()
      }
    },
    setContent (content, focus = true) {
      if (this.editor) {
        if (!content) content = '' // if empty, set to a string, TinyMCE expects this
        this.lastContent = content
        this.editor.setContent(content)
        if (focus) this.editor.focus()
        this.updateWordCount()
        this.scrollCheck = this.editor.getContent().substring(this.editor.getContent().length - this.scrollCheckLength)
      }
    },
    async save () {
      if (!this.editor) return false // editor hasn't loaded
      let liveContent = this.editor.getContent()
      if (this.entry.content === liveContent) {
        return true // entry has not changed - no need to save
      }

      this.entry.content = liveContent // store the content to compare next time
      let entry = JSON.parse(JSON.stringify(this.entry)) // take a clone

      console.log(`Saving entry ${entry.id}`)

      if (entry.id) {
        console.log(`Updating entry ${entry.id}`)
        if (await this.$db.updateEntry(entry)) {
          this.$emit('update', {id: entry.id})
          console.log(`Saved ${entry.id}`)
        } else {
          return false
        }
      } else {
        // Create new entry
        if (entry.content !== '') { // but only if there's some content
          let id = await this.$db.createEntry(entry)
          if (!id) {
            console.log('ERROR CREATING ENTRY')
            return
          }
          this.$emit('update', {id: id})
          console.log(`Created db entry ${id}`)
          this.entry.id = id
        }
      }

      return true
    },
    createEditor () {
      return new Promise((resolve) => {
        tinymce.init({
          init_instance_callback: (editor) => {
            // let vm = this
            // Set the editor instance
            this.editor = editor
            // Get initial text
            if (this.entry) this.editor.setContent(this.entry.content)
            // Watch when selection changes
            editor.on('NodeChange', (event) => { this.nodeChange(event) })
            // Update word count
            // Can't use 'Change' event for this, as it doesn't fire very often
            editor.on('KeyUp', () => {
              this.updateWordCount()

              // Function to scoll to bottom of editor pane when typing at the bottom
              let check = this.editor.getContent()
              check = check.substring(check.length - this.scrollCheckLength)
              if (check !== this.scrollCheck) {
                editor.getBody().scrollTop = editor.getBody().scrollHeight
              }
              this.scrollCheck = check
            })
            // Open entry links immediately without ctrl+click
            editor.getBody().onclick = function (e) {
              if (e.target.origin === 'entry://') {
                window.location.href = e.target.href
              }
            }
            // Back to main execution
            resolve()
          },
          plugins: 'image fullscreen link hr codesample lists contextmenu table wordcount',
          browser_spellcheck: true,
          contextmenu: 'insertTemplate applyTag | link removeformat | inserttable cell row column deletetable',
          table_toolbar: '',
          default_link_target: '_blank',
          image_caption: true,
          image_description: false,
          image_title: true,
          image_dimensions: false,
          selector: '#' + this.editorId,
          statusbar: false,
          resize: false,
          branding: false,
          menubar: false,
          toolbar: ['styleselect | undo redo | bold italic | blockquote codesample hr | bullist numlist | alignleft aligncenter alignright | indent outdent | link image | removeformat'],
          style_formats: this.styleList,
          style_formats_merge: true,
          file_picker_types: 'image',
          file_picker_callback: (callback) => {
            this.insertImage(callback)
          }
        })
      })
    },
    getTemplates () {
      return new Promise((resolve, reject) => {
        let templates = []
        this.$db.getAll('templates')
          .then((rows) => {
            for (let i = 0; i < rows.length; i++) {
              templates.push({
                text: rows[i].name,
                onclick: () => {
                  this.editor.insertContent(rows[i].content)
                }
              })
            }
            this.templates = templates
            resolve()
          })
          .catch(err => { reject(err) })
      })
    },
    getTags () {
      return new Promise((resolve, reject) => {
        // Get tags
        this.$db.getAll('tags', {orderBy: 'name ASC'})
          .then((rows) => {
            for (let i = 0; i < rows.length; i++) {
              let tag = rows[i]
              let tagClass = 'tag' + tag.tag_id
              let type = (tag.type === 'block') ? 'block' : 'inline'
              let element = (tag.type === 'block') ? 'p' : 'span'

              // Set up tag list for registering in TinyMCE once it's initialised
              this.tagList[tag.tag_id] = {
                id: tagClass,
                name: tag.name,
                type: type,
                element: element
              }

              // Set up tag items for the TinyMCE context menu
              this.tagContextItems.push({
                text: tag.name,
                onclick: () => {
                  this.editor.formatter.apply(tagClass)
                }
              })

              // Add to the CSS applied to TinyMCE editor iframe
              this.customCSS += element + '.' + tagClass + '{' + tag.style + '}\n'
            }
            // Register the tag classes
            for (const key of Object.keys(this.tagList)) {
              let tag = this.tagList[key]
              this.editor.formatter.register(tag.id, {
                [tag.type]: tag.element,
                title: tag.name,
                classes: tag.id
              })
            }

            resolve()
          })
          .catch(err => { reject(err) })
      })
    },
    getStyles () {
      return new Promise((resolve, reject) => {
        // Set up custom styles
        this.$db.all('SELECT * FROM styles ORDER BY name ASC')
          .then((rows) => {
            for (let i = 0; i < rows.length; i++) {
              // Create style list for Formats dropdown
              let style = rows[i]
              this.styleList.push({
                title: style.name,
                [style.type]: style.element,
                classes: style.class_name
              })

              // Create CSS
              let fullName = (style.class_name) ? style.element + '.' + style.class_name : style.element
              this.customCSS += fullName + '{' + style.style + '}\n'
            }
            resolve()
          })
          .catch(err => reject(err))
      })
    },
    getCustomCSS () {
      return new Promise((resolve, reject) => {
        // Add the scrollbars
        this.customCSS += scrollbarCSS
        let name = 'editorCSS'
        this.$db.getOption(name)
          .then((stored) => {
            if (!stored) {
              // If it's empty, add the default CSS
              let defaultCSS = fs.readFileSync(path.resolve(__dirname, 'default-styles.css'), 'utf8')
              this.customCSS += defaultCSS
              this.$db.setOption(name, defaultCSS)
                .then(resolve())
                .catch(err => reject(err))
            } else {
              // Otherwise use the stored CSS
              this.customCSS += stored
              resolve()
            }
          })
          .catch(err => reject(err))
      })
    },
    toggleMenubar () {
      let menubar = document.getElementsByClassName('mce-menubar')
      for (let i = 0; i < menubar.length; i++) {
        if (!this.menubar) {
          menubar[i].style.display = 'block'
        } else {
          menubar[i].removeAttribute('style')
        }
        this.menubar = !this.menubar
      }
    },
    addMenus () {
      this.editor.addMenuItem('insertTemplate', {
        text: 'Insert Template',
        menu: this.templates.concat([{
          text: 'Add new template...',
          onclick: () => {
            this.$router.push('templates')
          }
        }])
      })
      this.editor.addMenuItem('applyTag', {
        text: 'Apply Tag',
        menu: this.tagContextItems
      })
    },
    addKeyboardShortcuts () {
      for (let i = 1; i <= 4; i++) {
        this.editor.addShortcut('ctrl+alt+' + i, 'Heading ' + i, () => { this.editor.formatter.apply('h' + i) })
      }
      this.editor.addShortcut('ctrl+shift+l', 'Bulleted list', () => { this.editor.execCommand('InsertUnorderedList') })
      this.editor.addShortcut('ctrl+shift+n', 'Numbered list', () => { this.editor.execCommand('InsertOrderedList') })
      // Horizontal rule: Ctrl + hyphen
      this.editor.addShortcut('ctrl+189', 'Horizontal rule', () => { this.editor.execCommand('InsertHorizontalRule') })
      // Clear formatting: Ctrl + Space
      this.editor.addShortcut('ctrl+32', 'Clear formatting', () => {
        let selection = this.editor.selection.getSel()
        let node = this.editor.selection.getNode()
        if (selection.type === 'Caret') {
          // Nothing is currently selected, so let's select the current node
          this.editor.selection.select(node)
        }
        let cursorLocation = this.editor.selection.getEnd()
        this.editor.execCommand('RemoveFormat')
        this.editor.selection.setCursorLocation(cursorLocation)
      })
    },
    insertImage (callback) {
      let vm = this
      let fs = require('fs')
      let input = document.createElement('input') // set up a temporary file input field
      input.setAttribute('type', 'file')
      input.setAttribute('accept', 'image/*')
      input.onchange = function () {
        // Get the file
        let fileName = this.files[0].path
        let mimeType = this.files[0].type

        new Promise((resolve, reject) => {
          fs.readFile(fileName, (err, data) => {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          })
        })
          .then(fileData => {
            // Resize if JPG or PNG
            if (mimeType === 'image/jpg' || mimeType === 'image/jpeg' || mimeType === 'image/png') {
              return Promise.all([vm.$db.getOption('image_width'), vm.$db.getOption('image_height')])
                .then(results => {
                  let maxWidth = parseInt(results[0], 10) || 400
                  let maxHeight = parseInt(results[1], 10) || 400

                  let image = nativeImage.createFromBuffer(fileData)
                  let width = 0
                  let resize = false
                  if (maxWidth / maxHeight < image.getAspectRatio()) {
                    width = Math.round(maxWidth)
                    if (image.getSize().width > width) resize = true
                  } else {
                    width = Math.round(maxHeight * image.getAspectRatio())
                    if (image.getSize().width > width) resize = true
                  }

                  if (mimeType === 'image/jpg' || mimeType === 'image/jpeg') {
                    // JPG
                    mimeType = 'image/jpeg' // standardise mime type
                    if (resize) fileData = image.resize({width: width}).toJPEG(65)
                  } else if (mimeType === 'image/png') {
                    // PNG
                    if (resize) fileData = image.resize({width: width}).toPNG()
                  }
                  // Return the resized data
                  return fileData
                })
            } else {
              // Not a supported resize type - just return the attachment
              return fileData
            }
          })
          .then((data) => {
            // Add attachment to the DB
            return vm.$db.addAttachment(mimeType, data)
          })
          .then((rowId) => {
            // Link file into the content
            // eslint-disable-next-line
            callback('attach://' + rowId)
          })
          .catch((err) => {
            console.error(err)
          })
      }
      input.click() // click the input to launch the process
    },
    nodeChange (event) {
      // Get the list of tags for current cursor position
      let names = []
      let parents = event.parents // array
      for (let i = 0; i < parents.length; i++) {
        if (parents[i].className.startsWith('tag')) {
          let tagId = parents[i].className.substring(3)
          if (this.tagList[tagId]) names.push(this.tagList[tagId].name)
        }
      }
      this.statusBarTags = (names.length) ? 'Tags: ' + names.join(', ') : ''
    },
    updateWordCount () {
      if (this.editor) {
        this.wordCount = 'Words: ' + this.editor.plugins.wordcount.getCount()
      }
    }
  },
  async beforeDestroy () {
    if (this.entry) {
      await this.save()
      this.$emit('close', {id: this.entry.id})
    }
    try {
      tinymce.remove()
    } catch (err) {
      // TinyMCE throws an error each time, but the function works as expected. Not sure what the problem is.
      console.log(err)
    }
    window.removeEventListener('unload', this.save)
    clearInterval(this.autosaveTimer)
  }
}
</script>

<style>
    body {
        background: #FDFDFD;
    }

    #editorContainer {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: white;
    }

    /* Styles to force TinyMCE to flex */

    .mce-tinymce,
    .mce-tinymce > .mce-stack-layout,
    .mce-tinymce > .mce-stack-layout > .mce-edit-area,
    #editor_ifr {
        display: flex !important;
        flex-direction: column;
        flex-grow: 1;
    }

    #statusbar {
        font-size: 12px;
        background: #f0f0f0;
        padding: 3px 6px;
        color: #404040;
    }
</style>
