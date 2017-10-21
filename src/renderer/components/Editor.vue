<template>
    <div id="editorContainer">
        <div v-html="'<style>' + customCSS + '</style>'" class="display:none"></div>
        <div :id="id"></div>
    </div>
</template>

<style>
    #editor {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        background: white;
    }

    .tinycme-full .mce-edit-area {
        display: flex;
        flex-flow: column;
    }

    .tinycme-full .mce-edit-area iframe {
        flex: 1 1 auto;
    }

    .tinycme-full {
        height: 100%;
    }

    .tinycme-full .mce-tinymce.mce-container {
        width: 100%;
        height: 100%;
        border: 0;
    }

    .tinycme-full .mce-panel {
        border: 0
    }

    .tinycme-full .mce-container-body.mce-stack-layout {
        display: flex;
        flex-flow: column;
        height: 100%;
    }

    .tinycme-full .mce-stack-layout-item {
        flex: 0 0 auto;
    }

    .tinycme-full .mce-edit-area {
        flex: 1 1 auto;
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
        editor: '',
        customCSS: '',
        selectedStyle: '',
        styleList: [],
        stylePrefix: 'epic'
      }
    },
    mounted: function () {
      // Create editor
      tinymce.init({
        plugins: 'image imagetools',
        selector: '#' + this.id,
        statusbar: false,
        branding: false,
        browser_spellcheck: true,
        contextmenu: true
      })
      console.log(tinymce)

      // Set editor content element
      this.contentElement = document.getElementById(this.id)
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
          css += '#' + this.id + ' ' + name + '{' + style + '}\n'
        } // Next i

        // Set master CSS
        this.customCSS = css
      }
    }
  }
</script>