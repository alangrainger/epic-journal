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
        editor: '',
        customCSS: '',
        styleList: [],
        tagList: [],
        tinymce: ''
      }
    },
    mounted: function () {
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

          /* This way adds them asynchronously
          this.editor.formatter.register('custom' + i, {
            [type]: element,
            title: tag.name,
            classes: tagClass,
            attributes: {title: tag.name}
          })

          // Add to CSS
          let css = element + '.' + tagClass + '{' + tag.style + '}'
          this.editor.dom.addStyle(css) */

          // Get tags
          return this.$db.all('SELECT * FROM tags ORDER BY name ASC')
        })
        .then((rows) => {
          for (let i = 0; i < rows.length; i++) {
            let tag = rows[i]
            let tagClass = 'tag' + tag.tag_id
            let type = (tag.type === 'block') ? 'block' : 'inline'
            let element = (tag.type === 'block') ? 'p' : 'span'

            // Set up tag list for dropdown
            this.tagList.push({
              'title': tag.name,
              [type]: element,
              'classes': tagClass,
              attributes: {title: tag.name}
            })

            // Add to CSS
            this.customCSS += element + '.' + tagClass + '{' + tag.style + '}\n'
          }

          // Once all done, set up the editor
          this.createEditor()
        })
    },
    methods: {
      getContent () {
        try {
          return this.editor.getContent()
        } catch (err) {
          // No editor created
        }
      },
      setContent (content) {
        if (this.editor) {
          if (!content) content = '' // if empty, set to a string, TinyMCE expects this
          this.editor.setContent(content)
          this.editor.focus() // set focus back to editor
        }
      },
      createEditor () {
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
          style_formats: [
            {title: 'My Styles', items: this.styleList},
            {title: 'Tags', items: this.tagList}
          ],
          style_formats_merge: true,
          /* setup: function (editor) {
            editor.addButton('tags', {
              type: 'menubutton',
              text: 'Tags',
              icon: false,
              onselect: function (e) {
                console.log(vm.tinymce.activeEditor.formatter.get())
              },
              menu: [
                {text: 'test', value: 'blah'}
              ]
            })
          }, */
          file_picker_types: 'image',
          file_picker_callback: (cb, value, meta) => {
            this.insertImage(cb, value, meta)
          }
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
              new Promise(function (resolve, reject) {
                if (mimeType === 'image/jpg' || mimeType === 'image/jpeg' || mimeType === 'image/png') {
                  // Resize if JPG or PNG
                  let maxWidth, maxHeight
                  vm.$db.getOption('image_width')
                    .then((value) => {
                      maxWidth = value || 400
                      return vm.$db.getOption('image_height')
                    })
                    .then((value) => {
                      maxHeight = value || 400

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
                        mimeType = 'image/jpeg' // standardise mime type
                        if (resize) data = image.resize({width: width}).toJPEG(65)
                      } else if (mimeType === 'image/png') {
                        // PNG
                        if (resize) data = image.resize({width: width}).toPNG()
                      }
                      resolve(data)
                    })
                    .catch((err) => { reject(err) })
                } else {
                  // Not a supported resize type - just add the attachment
                  resolve(data)
                }
              })
                .then((data) => {
                  // Add attachment to the DB
                  return vm.$db.addAttachment(mimeType, data)
                })
                .then((rowId) => {
                  // Link file into the content
                  console.info('New attachment added with ID ' + rowId)
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
      }
    },
    beforeDestroy: function () {
      try {
        this.tinymce.remove()
      } catch (err) {
        // TinyMCE throws an error each time, but the function works as expected. Not sure what the problem is.
        console.log('Destroy error')
      }
    }
  }
</script>