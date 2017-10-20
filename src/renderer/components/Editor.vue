<template>
    <div id="quill">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
        <!-- <div id="toolbar">
            <div class="toolbar">
                <span class="ql-formats">
                    <select class="ql-formats" style="width:100px">
                        <option class="ql-test" value="ql-test">Test</option>
                        <option class="ql-quote" value="ql-quote">Quote</option>
                    </select>
                    <select class="ql-header">
                        <option value="1">Heading</option>
                        <option value="2">Subheading</option>
                        <option selected>Normal</option>
                    </select>
                    <select class="ql-font">
                        <option selected>Sailec Light</option>
                        <option value="sofia">Sofia Pro</option>
                        <option value="slabo">Slabo 27px</option>
                        <option value="roboto">Roboto Slab</option>
                        <option value="inconsolata">Inconsolata</option>
                        <option value="ubuntu">Ubuntu Mono</option>
                    </select>
                </span>
                <span class="ql-formats">
                    <button class="ql-bold"></button>
                    <button class="ql-italic"></button>
                    <button class="ql-underline"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-list" value="ordered"></button>
                    <button class="ql-list" value="bullet"></button>
                    <select class="ql-align">
                        <option selected></option>
                        <option value="center"></option>
                        <option value="right"></option>
                        <option value="justify"></option>
                    </select>
                </span>
                <span class="ql-formats">
                    <button class="ql-link"></button>
                    <button class="ql-image"></button>
                    <button class="ql-video"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-formula"></button>
                    <button class="ql-code-block"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-clean"></button>
                </span>
            </div>
        </div>-->
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

    #toolbar {
        display: flex;
        background: white;
    }

    #editor {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: white;
    }

    #editor p {
        color: black;
        font-size: 14pt;
        margin-bottom: 0.7em;
    }

    .alan {
        font-size: 20px;
    }

    .bob {
        text-decoration: underline;
    }

    .ql-apple {
        text-decoration: underline
    }

    .ql-frog {
        background-color: green
    }
</style>

<script>
  import Quill from 'quill'
  import 'quill/dist/quill.core.css'
  import 'quill/dist/quill.snow.css'

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
        customStyles: [
          {
            'name': 'Normal',
            'class': 'default',
            'element': 'p',
            'style': '',
            'INFO': 'DEFAULT CLASS - DO NOT MOVE THIS ARRAY ELEMENT'
          },
          {
            'name': 'Heading 1',
            'class': 'default',
            'element': 'h1',
            'style': ''
          },
          {
            'name': 'Heading 2',
            'class': 'default',
            'element': 'p',
            'style': ''
          },
          {
            'name': 'Steve\'s Style',
            'class': 'steve',
            'element': 'p',
            'style': 'font-family: "Comic Sans MS"; font-size:20pt; color: blue;'
          },
          {
            'name': 'Fancy Quote',
            'class': 'quote',
            'element': 'p',
            'style': 'margin: 1em; background-color: #fcfcfc; padding: 1em;'
          }
        ],
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

      // Set default style
      this.editor.format(this.stylePrefix + '0', true)

      // Add custom style dropdown
      const placeholderPickerItems = Array.prototype.slice.call(document.querySelectorAll('.ql-customStyles .ql-picker-item'))
      placeholderPickerItems.forEach(function (item) {
        item.textContent = vm.customStyles[item.dataset.value]['name']
      })
      document.querySelector('.ql-customStyles .ql-picker-label').innerHTML = 'Custom Styles' + document.querySelector('.ql-customStyles .ql-picker-label').innerHTML

      // Set editor content element
      this.contentElement = document.querySelector(`#${this.id} .ql-editor`)

      // Watch text changes
      this.editor.on('text-change', () => {
        this.$emit('textChange', this.contentElement.innerHTML)
      })
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

        // Register Normal style
        /* class NormalBlot extends Block {}

        NormalBlot.blogName = this.stylePrefix + '0'
        NormalBlot.tagName = 'p'
        Quill.register(NormalBlot) */

        // Register all custom styles
        for (let i = 0; i < this.customStyles.length; i++) {
          let className = this.customStyles[i]['class']
          let element = this.customStyles[i]['element']
          let style = this.customStyles[i]['style']
          console.log(className)

          // Set up Quill Blot
          class Blot extends Block {
            static create () {
              if (className) {
                let node = super.create()
                node.setAttribute('class', className)
                return node
              }
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