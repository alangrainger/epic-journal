<template>
    <div id="editorContainer">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
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
        customStyles: this.$config.data.customStyles,
        editor: '',
        customCSS: '',
        styleList: [],
        tinymce: ''
      }
    },
    mounted: function () {
      this.generateCustomStyles()

      // Create editor
      this.tinymce = require('tinymce')
      this.tinymce.baseURL = 'static/tinymce'
      this.tinymce.init({
        init_instance_callback: (editor) => {
          // this.toggleMenubar() // hide menu bar by default
          this.editor = editor // set the editor instance
          this.setContent(this.entry.content) // Get initial text
          this.editor.focus() // Set focus
        },
        content_css: ['static/editor.css'],
        content_style: this.customCSS,
        plugins: 'image fullscreen link hr codesample lists',
        browser_spellcheck: true,
        contextmenu: false,
        default_link_target: '_blank',
        image_caption: true,
        image_description: false,
        image_title: true,
        image_dimensions: false,
        selector: '#' + this.id,
        statusbar: false,
        branding: false,
        menubar: false,
        toolbar: ['styleselect | undo redo | bold italic | blockquote codesample hr | bullist numlist | alignleft aligncenter alignright | indent outdent | link image | showmenu'],
        style_formats: this.styleList,
        style_formats_merge: true,
        setup: function (editor) {
          editor.addButton('addimage', {
            icon: 'image',
            onclick: () => {
              this.insertImage(editor)
            }
          })
        },
        file_picker_types: 'image',
        file_picker_callback: (cb, value, meta) => {
          this.insertImage(cb, value, meta)
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
      insertImage (cb, value, meta) {
        let vm = this
        let fs = require('fs')
        let input = document.createElement('input') // set up a temporary file input field
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.onchange = function () {
          // Get the file
          let filename = this.files[0].path
          let mimeType = this.files[0].type
          fs.readFile(filename, (err, data) => {
            if (err) {
              console.log(err)
            } else {
              if (mimeType === 'image/jpg' || mimeType === 'image/jpeg' || mimeType === 'image/png') {
                // Resize if JPG or PNG
                let maxWidth = vm.$config.data.imageWidth || 400
                let maxHeight = vm.$config.data.imageHeight || 400

                const nativeImage = require('electron').nativeImage
                let image = nativeImage.createFromBuffer(data)
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
                  mimeType = 'image/jpeg' // standardise
                  if (resize) data = image.resize({width: width}).toJPEG(65)
                } else if (mimeType === 'image/png') {
                  // PNG
                  if (resize) data = image.resize({width: width}).toPNG()
                }
              }
              // Add file to database
              vm.$db.addAttachment(mimeType, data)
                .then((rowId) => {
                  console.log('New attachment added with ID ' + rowId)
                  // Link file into the content
                  // editor.insertContent('<img src="attach://' + rowId + '" data-mime="' + mimeType + '">')
                  // eslint-disable-next-line
                  cb('attach://' + rowId)
                })
                .catch((err) => {
                  console.log(err)
                })
            }
          })
        }
        input.click() // click the input to launch the process
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
    },
    beforeDestroy: function () {
      this.tinymce.remove()
    }
  }
</script>