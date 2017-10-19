<template>
    <div id="quill">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
        <div id="toolbar">
            <select id="style-dropdown" v-model="selectedStyle" style="width:100px">
                <option value="test">Test</option>
                <option value="quote">Quote</option>
            </select>
            <div class="toolbar">
                <span class="ql-formats">
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
        </div>
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
        customStyles: {
          test: {
            name: 'Test',
            element: 'p',
            style: 'color: blue;'
          },
          quote: {
            name: 'Nice quote',
            element: 'p',
            style: 'margin: 1em; background-color: #fcfcfc; padding: 1em;'
          }
        },
        editor: '',
        customCSS: '',
        selectedStyle: ''
      }
    },
    mounted: function () {
      this.injectStyles()
      this.customCSS = this.createCSS()

      // Create editor
      this.editor = new Quill('#' + this.id, {
        modules: {
          toolbar: '#toolbar'
          /* [
          [{'header': [1, 2, 3, 4, 5, 6, false]}],
          ['alan'],
          ['bob'],
          [{'align': []}],
          ['bold', 'italic', 'underline', 'strike'],
          [{'list': 'ordered'}, {'list': 'bullet'}],
          [{'color': []}, {'background': []}],
          ['blockquote', 'code-block'],
          [{'indent': '-1'}, {'indent': '+1'}],
          ['clean']
          ] */
        },
        theme: 'snow'
      })

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
      },
      selectedStyle: function () {
        this.editor.format('color', 'red')
      }
    },
    methods: {
      injectStyles () {
        let Block = Quill.import('blots/block')

        for (let key in this.customStyles) {
          class Blot extends Block {
            static create () {
              let node = super.create()
              node.setAttribute('class', key)
              return node
            }
          }

          Blot.blotName = key
          Blot.tagName = this.customStyles[key]['element']
          Quill.register(Blot)
        }
      },
      createCSS () {
        let css = ''
        for (let key in this.customStyles) {
          let element = this.customStyles[key]['element']
          let style = this.customStyles[key]['style']
          css += '#' + this.id + ' ' + element + '.' + key + '{' + style + '}\n'
        }
        return css
      }
    }
  }
</script>