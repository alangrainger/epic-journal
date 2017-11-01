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
        tinymce: '',
        templates: []
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

          return this.getTemplates()
        })
        .then(templates => {
          // Add the templates
          this.templates = templates

          // Once all done, set up the editor
          this.createEditor()
        })
        .catch(err => { console.error(err) })
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
      setContent (content) {
        if (this.editor) {
          if (!content) content = '' // if empty, set to a string, TinyMCE expects this
          this.editor.setContent(content)
          this.editor.focus() // set focus back to editor
        }
      },
      createEditor () {
        tinymce.init({
          init_instance_callback: (editor) => {
            // this.toggleMenubar() // hide menu bar by default
            this.editor = editor // set the editor instance
            if (this.entry.content) this.setContent(this.entry.content) // Get initial text
          },
          content_css: ['static/editor.css'],
          content_style: this.customCSS,
          plugins: 'image fullscreen link hr codesample lists contextmenu table',
          browser_spellcheck: true,
          contextmenu: 'insertTemplate | link image inserttable | cell row column deletetable',
          table_toolbar: '',
          default_link_target: '_blank',
          image_caption: true,
          image_description: false,
          image_title: true,
          image_dimensions: false,
          selector: '#' + this.id,
          statusbar: false,
          branding: false,
          menubar: false,
          toolbar: ['styleselect | undo redo | bold italic | blockquote codesample hr | bullist numlist | alignleft aligncenter alignright | indent outdent | link image table | showmenu'],
          style_formats: [
            {title: 'My Styles', items: this.styleList},
            {title: 'Tags', items: this.tagList}
          ],
          style_formats_merge: true,
          setup: (editor) => {
            editor.addMenuItem('insertTemplate', {
              text: 'Insert Template',
              menu: this.templates
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
              resolve(templates)
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
              console.log(err)
            })
        }
        input.click() // click the input to launch the process
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