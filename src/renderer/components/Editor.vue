<template>
    <div id="editorContainer">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:block"></div>
        <div :id="id"></div>
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
</style>

<script>
  let fs = require('fs')
  let tinymce = require('tinymce')
  tinymce.baseURL = 'node_modules/tinymce'

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
        contentElement: null,
        buffer: {},
        customStyles: this.$config.data.customStyles,
        editor: null,
        customCSS: '',
        selectedStyle: '',
        styleList: [],
        stylePrefix: 'epic',
        bufferTimeout: 0
      }
    },
    mounted: function () {
      let vm = this
      this.generateCustomStyles()

      // Create editor
      tinymce.init({
        init_instance_callback: (editor) => {
          this.editor = editor // set the editor instance
          this.setContent(this.entry.content) // Get initial text
          this.editor.focus() // Set focus
        },
        content_css: '/static/editor.css',
        content_style: this.customCSS,
        plugins: 'image imagetools spellchecker',
        selector: '#' + this.id,
        statusbar: false,
        branding: false,
        browser_spellcheck: true,
        contextmenu: true,
        menubar: false,
        toolbar: ['styleselect | undo redo | bold italic | blockquote | alignleft aligncenter alignright | indent outdent | spellchecker | addimage'],
        style_formats: this.styleList,
        style_formats_merge: true,
        setup: function (editor) {
          editor.addButton('addimage', {
            text: 'Add image',
            onclick: function () {
              let input = document.createElement('input') // set up a temporary file input field
              input.setAttribute('type', 'file')
              input.setAttribute('accept', 'image/*')
              input.onchange = function (event) {
                // Get the file
                let filename = event.path[0].files[0].path
                let mimeType = event.path[0].files[0].type
                fs.readFile(filename, (err, data) => {
                  if (err) {
                    console.log(err)
                  } else {
                    // Add file to database
                    vm.$db.addAttachment(mimeType, data)
                      .then((rowId) => {
                        console.log('New attachment added with ID ' + rowId)
                        // Link file into the content
                        editor.insertContent('<img src="attach://' + rowId + '" data-mime="' + mimeType + '">')
                      })
                      .catch((err) => {
                        console.log(err)
                      })
                  }
                })
              }
              input.click() // click the input to launch the process
            }
          })
        }
      })
    },
    methods: {
      getContent () {
        if (this.editor) {
          return this.editor.getContent()
        }
      },
      setContent (content) {
        if (this.editor) {
          if (!content) content = '' // if empty, set to a string, TinyMCE expects this
          this.editor.setContent(content)
          this.editor.focus() // set focus back to editor
        }
      },
      generateCustomStyles () {
        let css = ''
        for (let i = 0; i < this.customStyles.length; i++) {
          let className = this.customStyles[i]['class']
          let element = this.customStyles[i]['element']
          let style = this.customStyles[i]['style']
          let name = this.customStyles[i]['name']

          // Create style list for dropdown
          this.styleList.push({
            title: name,
            block: element,
            classes: className
          })

          // Create CSS
          let fullName = (className) ? element + '.' + className : element
          css += fullName + '{' + style + '}\n'
        }

        this.customCSS = css
      }
    }
  }
</script>