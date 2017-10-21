<template>
    <div id="quill">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
        <div :id="id"></div>
    </div>
</template>

<style>
    #quill {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        height: 100%;
    }

    .ql-toolbar {
        background: white;
    }

    #editor {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: white;
    }

    .ql-customStyles {
        width: 7em;
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
  import Quill from 'quill'
  import './editor/quill.core.css'
  import './editor/quill.snow.css'
  import { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } from 'electron-spellchecker'

  export default {
    name: 'quill',
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
        editor: '',
        customCSS: '',
        selectedStyle: '',
        styleList: [],
        stylePrefix: 'epic'
      }
    },
    mounted: function () {
      let vm = this

      // Set up styles - Quill toolbar, Quill Blots, and this.customCSS
      this.injectStyles()

      // Create editor
      this.editor = new Quill('#' + this.id, {
        modules: {
          toolbar: {
            container: [
              [{'customStyles': this.styleList}],
              [{'align': []}],
              ['bold', 'italic', 'underline', 'strike'],
              [{'list': 'ordered'}, {'list': 'bullet'}],
              [{'color': []}, {'background': []}],
              ['blockquote', 'code-block'],
              [{'indent': '-1'}, {'indent': '+1'}],
              ['clean']
            ],
            handlers: {
              'customStyles': function (index) {
                vm.applyCustomStyle(index)
              }
            }
          }
        },
        theme: 'snow'
      })

      // Add custom style dropdown
      const dropdownPickerItems = Array.prototype.slice.call(document.querySelectorAll('.ql-customStyles .ql-picker-item'))
      dropdownPickerItems.forEach(function (item) {
        item.textContent = vm.customStyles[item.dataset.value]['name']
      })
      document.querySelector('.ql-customStyles .ql-picker-label').innerHTML = 'Styles' + document.querySelector('.ql-customStyles .ql-picker-label').innerHTML

      // Set editor content element
      this.contentElement = document.querySelector(`#${this.id} .ql-editor`)

      // Watch text changes
      this.editor.on('text-change', () => {
        this.$emit('textChange', this.contentElement.innerHTML)
      })

      // Set up spell checker
      const osLocale = require('os-locale')
      window.spellCheckHandler = new SpellCheckHandler()
      window.spellCheckHandler.attachToInput()
      osLocale()
        .then(locale => {
          window.spellCheckHandler.switchLanguage(locale)
            .catch((err) => { console.log(err) })
        })
        .catch(() => {
          window.spellCheckHandler.switchLanguage('en_US')
            .catch((err) => { console.log(err) })
        })
      let contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler)
      let contextMenuListener = new ContextMenuListener((info) => {
        contextMenuBuilder.showPopupMenu(info)
      })
      console.log(contextMenuListener)
    },
    watch: {
      value (content) {
        if (content !== this.contentElement.innerHTML) {
          this.contentElement.innerHTML = content
        }
      }
    },
    methods: {
      injectStyles () {
        let Block = Quill.import('blots/block')
        let css = ''

        // Register all custom styles
        for (let i = 0; i < this.customStyles.length; i++) {
          let className = this.customStyles[i]['class']
          let element = this.customStyles[i]['element']
          let style = this.customStyles[i]['style']

          // Set up Quill Blot
          class Blot extends Block {
            static create () {
              let node = super.create()
              if (className) {
                node.setAttribute('class', className)
              }
              return node
            }
          }

          Blot.blotName = this.stylePrefix + i
          Blot.tagName = element
          Quill.register(Blot)

          // Create style list for dropdown
          this.styleList.push(i)

          // Create CSS
          let name = (className) ? element + '.' + className : element
          css += '#' + this.id + ' ' + name + '{' + style + '}\n'
        } // Next i

        // Set master CSS
        this.customCSS = css
      },
      applyCustomStyle (index) {
        if (!index) { index = '0' }
        this.editor.format(this.stylePrefix + index, true)
        // const cursorPosition = this.quill.getSelection().index
        // this.quill.insertText(cursorPosition, value)
        // this.quill.setSelection(cursorPosition + value.length)
      }
    }
  }
</script>