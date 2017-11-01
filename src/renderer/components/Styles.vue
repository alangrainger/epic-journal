<template>
    <div id="wrapper">
        <table>
            <tr>
                <th>Friendly Name</th>
                <th>Element</th>
                <th>Type</th>
                <th>Class Name</th>
                <th style="width:40%">Style</th>
                <th></th>
            </tr>
            <tr v-for="style in styles" @keyup="style.saved = false">
                <td><input style="width: 120px" type="text" v-model="style.name"></td>
                <td><input style="width: 60px" type="text" v-model="style.element"></td>
                <td @change="style.saved = false">
                    <input type="radio" :id="'type' + style.style_id" value="block" v-model="style.type">&nbsp;<label :for="'type' + style.style_id">Block</label>
                    <input type="radio" :id="'type' + style.style_id" value="inline" v-model="style.type">&nbsp;<label :for="'type' + style.style_id">Inline</label>
                </td>
                <td><input style="width: 100px" type="text" v-model="style.class_name"></td>
                <td><textarea v-model="style.style" @keyup="style.saved = false"></textarea></td>
                <td>
                    <button v-if="!style.saved" @click="saveTag(style)">Save</button>
                    <button @click="deleteTag(style.style_id, $event)">Delete</button>
                </td>
            </tr>
            <button @click="newTag">Add New</button>
            <br>
            <button @click="exit">Go Back</button>
        </table>
    </div>
</template>

<style scoped>
    #wrapper {
        height: 100vh;
        padding: 46px 60px;
        width: 100vw;
    }

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

    input {
        font-size: 1em;
    }
</style>

<script>
  export default {
    data () {
      return {
        name: 'styles',
        styles: []
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
    },
    methods: {
      newTag () {
        this.$db.insert('INSERT INTO styles (name, type, element) VALUES (?, ?, ?)', ['', 'block', 'p'])
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
          [style.name, type, style.element, style.class_name, style.style, style.style_id])
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
      exit () {
        this.$router.go(-1)
      }
    }
  }
</script>
