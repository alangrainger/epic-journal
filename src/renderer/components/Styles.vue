<template>
  <div id="main">
    <div class="info">
      <h1>Styles</h1>
      <p>
        These styles will appear in the dropdown Formats list in the editor. If you wish to add raw CSS,
        please use the box at the bottom of the page.
      </p>
    </div>
    <table>
      <tr>
        <th>Friendly Name</th>
        <th>Element</th>
        <th>Type</th>
        <th>Class Name</th>
        <th style="width:40%">
          Style
        </th>
        <th />
      </tr>
      <tr v-for="style in styles" :key="'style'+style.style_id" @keyup="style.saved = false">
        <td><input v-model="style.name" style="width: 120px" type="text"></td>
        <td><input v-model="style.element" style="width: 60px" type="text"></td>
        <td @change="style.saved = false">
          <input :id="'type' + style.style_id" v-model="style.type" type="radio" value="block">&nbsp;<label
            :for="'type' + style.style_id"
          >Block</label>
          <input :id="'type' + style.style_id" v-model="style.type" type="radio" value="inline">&nbsp;<label
            :for="'type' + style.style_id"
          >Inline</label>
        </td>
        <td><input v-model="style.class_name" style="width: 100px" type="text"></td>
        <td><textarea v-model="style.style" @keyup="style.saved = false" /></td>
        <td>
          <button :class="{disabled: style.saved}" :disabled="style.saved" @click="saveTag(style)">
            Save
          </button>
          <button @click="deleteTag(style.style_id, $event)">
            Delete
          </button>
        </td>
      </tr>
    </table>
    <button @click="newTag">
      Add New
    </button>
    <div class="info" style="margin-top:30px;">
      <h2>Custom Editor CSS</h2>
      <p>This applies to your journal entries. It is loaded in addition to the styles above, so it is possible to create conflicting entries.</p>
      <textarea v-model="editorCSS" />
      <button @click="save('editorCSS', $event)">
        Save editor CSS
      </button>
    </div>
  </div>
</template>

<style scoped>
    tr {
        vertical-align: top;
    }

    th {
        text-align: left;
    }

    td {
        padding: 0 20px 15px 0;
    }

    textarea {
        height: 100px;
        width: 100%;
    }

    .info textarea {
        height: 400px;
        margin: 0;
        padding: 10px;
    }

    input {
        font-size: 1em;
    }

    button.disabled {
        color: #d5d5d5;
        border-color: #d5d5d5;
        cursor: default;
    }

    button.disabled:hover {
        background: white;
        color: #d5d5d5;
    }

    h1, h2, h3 {
        margin: 0.5em 0;
    }

    p {
        margin-bottom: 0.8em;
    }

    .info {
        max-width: 760px;
        margin: 0 0 1.5em 0;
        padding: 0;
    }
</style>

<script>
export default {
  data () {
    return {
      name: 'styles',
      styles: [],
      editorCSS: '',
      globalCSS: ''
    }
  },
  mounted: function () {
    // Get styles from DB
    this.$db.all('SELECT * FROM styles ORDER BY name ASC')
      .then((rows) => {
        rows.forEach((row) => {
          this.styles.push({
            style_id: row.style_id,
            name: row.name,
            type: row.type,
            element: row.element,
            class_name: row.class_name,
            style: row.style,
            saved: true
          })
        })
      })

      // Add initial CSS
    this.$db.getOption('editorCSS')
      .then((value) => { this.editorCSS = value })
    this.$db.getOption('globalCSS')
      .then((value) => { this.globalCSS = value })
  },
  methods: {
    newTag () {
      this.$db.insert('styles', {
        name: '',
        type: 'block',
        element: 'p'
      })
        .then((id) => {
          this.styles.push({
            style_id: id,
            name: '',
            type: 'block',
            element: 'p',
            class_name: '',
            style: '',
            saved: true
          })
        })
        .catch((error) => {
          console.log(error)
        })
    },
    saveTag (style) {
      // Sanitize type just to be safe
      let type = (style.type === 'inline') ? 'inline' : 'block'

      // Add to DB
      this.$db.run('UPDATE styles SET name = ?, type = ?, element = ?, class_name = ?, style = ? WHERE style_id = ?',
        [style.name, type, style.element.toLowerCase(), style.class_name.toLowerCase(), style.style, style.style_id])
        .then(() => {
          style.saved = true
        })
        .catch((err) => {
          console.error(err)
        })
    },
    deleteTag (id, event) {
      let confirm = 'Are you sure?'
      if (event.target.innerText === confirm) {
        this.$db.run('DELETE FROM styles WHERE style_id = ?', [id])
          .then((ret) => {
            if (ret.changes) {
              this.styles = this.styles.filter(style => {
                return style.style_id !== id
              })
            }
          })
          .catch((error) => {
            console.log(error)
          })
      } else {
        event.target.innerText = confirm
      }
    },
    save (name, event) {
      let css = this[name]
      this.$db.setOption(name, css)
      let current = event.target.innerText
      event.target.innerText = 'Saved'
      setTimeout(() => { event.target.innerText = current }, 1500)
    },
    exit () {
      this.$router.go(-1)
    }
  }
}
</script>
