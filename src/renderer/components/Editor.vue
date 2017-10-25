<template>
    <div id="editorContainer">
        <input type="file" @change="image">
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
        toolbar: ['styleselect | undo redo | bold italic | blockquote | alignleft aligncenter alignright | indent outdent | spellchecker | link image'],
        style_formats: this.styleList,
        style_formats_merge: true,
        file_picker_types: 'image',
        // and here's our custom image picker
        file_picker_callback: function (cb, value, meta) {
          var input = document.createElement('input')
          input.setAttribute('type', 'file')
          input.setAttribute('accept', 'image/*')

          // Note: In modern browsers input[type="file"] is functional without
          // even adding it to the DOM, but that might not be the case in some older
          // or quirky browsers like IE, so you might want to add it to the DOM
          // just in case, and visually hide it. And do not forget do remove it
          // once you do not need it anymore.

          input.onchange = function () {
            var file = this.files[0]

            console.log(file)
            cb(file.path, {title: file.name})

            /* var reader = new FileReader()
            reader.onload = function () {
              // Note: Now we need to register the blob in TinyMCEs image blob
              // registry. In the next release this part hopefully won't be
              // necessary, as we are looking to handle it internally.
              var id = 'blobid' + (new Date()).getTime()
              var blobCache = tinymce.activeEditor.editorUpload.blobCache
              var base64 = reader.result.split(',')[1]
              var blobInfo = blobCache.create(id, file, base64)
              blobCache.add(blobInfo)

              // call the callback and populate the Title field with the file name
              cb(blobInfo.blobUri(), {title: file.name})
            }
            reader.readAsDataURL(file) */
          }

          input.click()
        }
        /* setup: function (editor) {
          console.log(editor)
          editor.addButton('mybutton', {
            type: 'menubutton',
            text: 'My button',
            icon: false,
            menu: [{
              text: 'Menu item 1',
              onclick: function () {
                tinymce.activeEditor.formatter.apply('bold')
              }
            }, {
              text: 'Menu item 2',
              onclick: function () {
                editor.insertContent('&nbsp;<em>Menu item 2 here!</em>&nbsp;')
              }
            }]
          })
        } */
      })
    },
    methods: {
      image (event) {
        let filename = event.target.files[0].path
        let mimetype = event.target.files[0].type
        fs.readFile(filename, (err, data) => {
          if (err) {
            console.log(err)
          } else {
            this.$db.addAttachment(mimetype, data)
          }
        })
      },
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
        let css = 'span.stoicism { border-bottom: 1px dotted green; }'
        css += 'span.stoicism3 { border-bottom: 1px dotted blue; }'
        css += 'p.stoicism2 { margin-left: -5px; border-left: 2px solid blue; padding-left: 5px; }'
        this.styleList.push({
          title: 'Stoicism Inline',
          inline: 'span',
          classes: 'stoicism'
        })
        this.styleList.push({
          title: 'Stoicism Inline 2',
          inline: 'span',
          classes: 'stoicism3'
        })
        this.styleList.push({
          title: 'Stoicism Block',
          block: 'p',
          classes: 'stoicism2'
        })

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