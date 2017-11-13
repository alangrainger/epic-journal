<template>
    <div id="editorContainer">
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

  let defaultCSS = `
body {
    font-family: Segoe UI, sans-serif !important;
    padding: 12px 14px 4px 14px;
}

p {
    font-size: 13pt;
    margin: 0 0 0.8em 0;
    padding: 0;
}

li {
    font-size: 13pt;
}

h1 {
    font-size: 20pt;
    margin-bottom: 0.7em;
}

h2 {
    font-size: 18pt;
    font-weight: normal;
    margin: 1em 0 0.7em 0;
}

h3 {
    font-size: 16pt;
    font-weight: normal;
    font-style: italic;
    margin: 1em 0 0.7em 0;
}

h4 {
    font-size: 13pt;
    font-weight: bold;
    margin: 1em 0 0.3em 0;
}

hr { margin: 2em 0; }

blockquote {
    display: block;
    background: #fff;
    padding: 16px 24px 16px 46px;
    margin: 1.3em 0;
    position: relative;

    /*Font*/
    font-family: Georgia, serif;
    font-size: 13pt;
    line-height: 1.4;
    color: #666;
    text-align: justify;

    /*Borders - (Optional)*/
    border-left: 15px solid #c76c0c;
    border-right: 2px solid #c76c0c;

    /*Box Shadow - (Optional)*/
    -moz-box-shadow: 2px 2px 15px #e6e6e6;
    -webkit-box-shadow: 2px 2px 15px #e6e6e6;
    box-shadow: 2px 2px 15px #e6e6e6;
}

blockquote::before {
    content: "\\201C"; /*Unicode for Left Double Quote*/

    /*Font*/
    font-family: Georgia, serif;
    font-size: 60px;
    font-weight: bold;
    color: #999;

    /*Positioning*/
    position: absolute;
    left: 10px;
    top: 5px;
}

blockquote::after {
    /*Reset to make sure*/
    content: "";
}
  `
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
        scrollCheck: '',
        scrollCheckLength: 20,
        attachments: [],
        innerDocument: null,
        customCSS: '',
        styleList: [],
        tagList: {},
        tagContextItems: [],
        tinymce: '',
        templates: [],
        statusBarTags: '',
        wordCount: 'Words: 0'
      }
    },
    mounted: function () {
      // Get custom dropdown styles before initialising the editor
      this.getStyles()
        .then(() => {
          // Initialise the editor
          return this.createEditor()
        })
        .then(() => {
          // Get custom CSS
          return this.getCustomCSS()
        })
        .then(() => {
          // Get templates
          return this.getTemplates()
        })
        .then(() => {
          // Get tags
          return this.getTags()
        })
        .then(() => {
          // Inject the custom stylesheet
          this.editor.dom.addStyle(this.customCSS)

          // Add tags and templates to menus
          this.addMenus()
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
          this.scrollCheck = this.editor.getContent().substring(this.editor.getContent().length - this.scrollCheckLength)
        }
      },
      createEditor () {
        return new Promise((resolve) => {
          tinymce.init({
            init_instance_callback: (editor) => {
              // Set the editor instance
              this.editor = editor
              // Set the iframe document
              let iframe = document.getElementById('editor_ifr')
              this.innerDocument = iframe.contentDocument || iframe.contentWindow.document
              // Get initial text
              if (this.entry.content) this.setContent(this.entry.content)
              // Watch when selection changes
              editor.on('NodeChange', (event) => { this.nodeChange(event) })
              // Update word count
              editor.on('KeyUp', () => {
                this.updateWordCount()

                // Function to scoll to bottom of editor pane when typing at the bottom
                let check = this.editor.getContent()
                check = check.substring(check.length - this.scrollCheckLength)
                if (check !== this.scrollCheck) {
                  this.innerDocument.body.scrollTop = this.innerDocument.body.scrollHeight
                }
                this.scrollCheck = check
              })
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
            selector: '#' + this.id,
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
        for (let i = 1; i <= 4; i++) {
          this.editor.addShortcut('ctrl+alt+' + i, 'Heading ' + i, () => { this.editor.formatter.apply('h' + i) })
        }
        this.editor.addShortcut('ctrl+shift+l', 'Bulleted list', () => { this.editor.execCommand('InsertUnorderedList') })
        this.editor.addShortcut('ctrl+shift+n', 'Numbered list', () => { this.editor.execCommand('InsertOrderedList') })
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
    beforeDestroy: function () {
      try {
        tinymce.remove()
      } catch (err) {
        // TinyMCE throws an error each time, but the function works as expected. Not sure what the problem is.
      }
    }
  }
</script>