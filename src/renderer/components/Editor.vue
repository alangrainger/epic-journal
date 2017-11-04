<template>
    <div id="editorContainer">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
        <div :id="id"></div>
        <div id="statusbar">{{ statusBarTags }}<span style="float:right">{{ wordCount }} </span></div>
    </div>
</template>

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

<script>
  let tinymce = require('tinymce')
  tinymce.baseURL = 'static/tinymce'

  export default {
    props: {
      value: String,
      entry: {
        type: Object
      }
    },
    data () {
      return {
        id: 'editor',
        editor: '',
        customCSS: '',
        styleList: [],
        tagList: [],
        tagContextItems: [],
        tinymce: '',
        templates: [],
        statusBarTags: '',
        wordCount: ''
      }
    },
    mounted: function () {
      this.getStyles()
        .then(() => { return this.getTags() }) // we have to create the tag styles arrays before initialising the editor
        .then(() => { return this.getTemplates() })
        .then(() => {
          // Initialise the editor
          this.createEditor()
        })
        .catch(err => console.error(err))
    },
    methods: {
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
          this.editor.setContent(content)
          if (focus) this.editor.focus()
          this.updateWordCount()
        }
      },
      createEditor () {
        tinymce.init({
          init_instance_callback: (editor) => {
            // this.toggleMenubar() // hide menu bar by default
            this.editor = editor // set the editor instance
            // Get initial text
            if (this.entry.content) this.setContent(this.entry.content)
            // Watch when selection changes
            editor.on('NodeChange', (event) => { this.nodeChange(event) })
            // Update word count
            editor.on('KeyUp', () => { this.updateWordCount() })

            // Register the tag classes
            this.tagList.forEach((tag) => {
              this.editor.formatter.register(tag.id, {
                [tag.type]: tag.element,
                title: tag.name,
                classes: tag.id
              })
            })
          },
          content_css: ['static/editor.css'],
          content_style: this.customCSS,
          plugins: 'image fullscreen link hr codesample lists contextmenu table wordcount',
          browser_spellcheck: true,
          contextmenu: 'insertTemplate applyTag | link removeformat | inserttable cell row column deletetable',
          table_toolbar: '',
          default_link_target: '_blank',
          image_caption: true,
          image_description: false,
          image_title: true,
          image_dimensions: false,
          selector: '#' + this.id,
          statusbar: false,
          resize: false,
          branding: false,
          menubar: false,
          toolbar: ['styleselect | undo redo | bold italic | blockquote codesample hr | bullist numlist | alignleft aligncenter alignright | indent outdent | link image table | removeformat'],
          style_formats: [
            {title: 'My Styles', items: this.styleList},
            {title: 'Tags', items: this.tagList}
          ],
          style_formats_merge: true,
          setup: (editor) => {
            editor.addMenuItem('insertTemplate', {
              text: 'Insert Template',
              menu: this.templates.concat([{
                text: 'Add new template...',
                onclick: () => {
                  this.$router.push('templates')
                }
              }])
            })
            editor.addMenuItem('applyTag', {
              text: 'Apply Tag',
              menu: this.tagContextItems
            })
          },
          file_picker_types: 'image',
          file_picker_callback: (callback) => {
            this.insertImage(callback)
          }
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
      getStyles () {
        return new Promise((resolve, reject) => {
          // Set up custom styles
          this.$db.all('SELECT * FROM styles ORDER BY name ASC')
            .then((rows) => {
              for (let i = 0; i < rows.length; i++) {
                let style = rows[i]
                // Create style list for dropdown
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
                this.tagList.push({
                  id: tagClass,
                  name: tag.name,
                  type: type,
                  element: element
                })

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
              resolve()
            })
            .catch(err => { reject(err) })
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
              if (err) reject(err)
              else resolve(data)
            })
          })
            .then(fileData => {
              // Resize if JPG or PNG
              if (mimeType === 'image/jpg' || mimeType === 'image/jpeg' || mimeType === 'image/png') {
                return Promise.all([vm.$db.getOption('image_width'), vm.$db.getOption('image_height')])
                  .then(results => {
                    const maxWidth = results[0] || 400
                    const maxHeight = results[1] || 400

                    const nativeImage = require('electron').nativeImage
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
        let tagList = []
        let tagCount = 0
        let parents = event.parents // array
        for (let i = 0; i < parents.length; i++) {
          if (parents[i].className.startsWith('tag')) {
            tagCount++
            let tagId = parents[i].className.substring(3)
            this.$db.getById('tags', tagId)
              .then(row => {
                if (row && row.name) {
                  tagList.push(row.name)
                  this.statusBarTags = 'Tags: ' + tagList.join(', ')
                }
              })
              .catch(err => { console.error(err) })
          }
        }
        if (!tagCount) this.statusBarTags = ''
      },
      updateWordCount () {
        if (this.editor) {
          this.wordCount = 'Words: ' + this.editor.plugins.wordcount.getCount()
        }
      }
    },
    beforeDestroy: function () {
      try {
        tinymce.remove()
      } catch (err) {
        // TinyMCE throws an error each time, but the function works as expected. Not sure what the problem is.
      }
    }
  }
</script>