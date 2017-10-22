<template>
    <div id="editorContainer">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:block"></div>
        <div :id="id"></div>
    </div>
</template>

<style>
    #editorContainer {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: white;
    }

    #mceu_12, #mceu_12-body, #mceu_28, #editor_ifr {
        display: flex !important;
        flex-direction: column;
        flex-grow: 1;
    }

    #editor blockquote {
        display: block;
        background: #fff;
        padding: 16px 24px 16px 46px;
        margin: 1.5em 0;
        position: relative;

        /*Font*/
        font-family: Georgia, serif;
        font-size: 14pt;
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

    #editor blockquote::before {
        content: "\201C"; /*Unicode for Left Double Quote*/

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

    #editor blockquote::after {
        /*Reset to make sure*/
        content: "";
    }
</style>

<script>
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
      let customStyles = this.injectStyles()

      // Create editor
      let vm = this
      tinymce.init({
        init_instance_callback: function (editor) {
          vm.editor = editor // set the editor instance
          vm.editor.focus() // Set focus
          vm.setContent(vm.entry.content) // Get initial text
        },
        content_style: customStyles,
        plugins: 'image imagetools',
        selector: '#' + this.id,
        statusbar: false,
        branding: false,
        browser_spellcheck: true,
        contextmenu: true,
        style_formats: [
          {title: 'Bold text', inline: 'strong'},
          {title: 'Red text', inline: 'span', styles: {color: '#ff0000'}},
          {title: 'Red header', block: 'p', classes: 'quote'},
          {
            title: 'Badge',
            inline: 'span',
            styles: {
              display: 'inline-block',
              border: '1px solid #2276d2',
              'border-radius': '5px',
              padding: '2px 5px',
              margin: '0 2px',
              color: '#2276d2'
            }
          },
          {title: 'Table row 1', selector: 'tr', classes: 'tablerow1'}
        ],
        formats: {
          alignleft: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'left'},
          aligncenter: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'center'},
          alignright: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'right'},
          alignfull: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'full'},
          bold: {inline: 'span', 'classes': 'bold'},
          italic: {inline: 'span', 'classes': 'italic'},
          underline: {inline: 'span', 'classes': 'underline', exact: true},
          strikethrough: {inline: 'del'},
          customformat: {
            inline: 'span',
            styles: {color: '#00ff00', fontSize: '20px'},
            attributes: {title: 'My custom format'},
            classes: 'example1'
          }
        }
      })
    },
    methods: {
      getContent () {
        if (this.editor) {
          console.log(this.editor.getContent())
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
      injectStyles () {
        console.log('i:', this.customStyles)
        let css = ''

        // Register all custom styles
        for (let i = 0; i < this.customStyles.length; i++) {
          let className = this.customStyles[i]['class']
          let element = this.customStyles[i]['element']
          let style = this.customStyles[i]['style']

          // Create style list for dropdown
          this.styleList.push(i)

          // Create CSS
          let name = (className) ? element + '.' + className : element
          css += name + '{' + style + '}\n'
        } // Next i

        // Set master CSS
        return css
      }
    }
  }
</script>