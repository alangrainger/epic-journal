<template>
    <div id="wrapper">
        <table>
            <tr>
                <th>Name</th>
                <th style="width:40%">Style</th>
                <th style="width:30%">Preview</th>
                <th></th>
            </tr>
            <tr v-for="(tag, i) in tags" @keyup="tag.saved = false">
                <td>
                    <input style="width: 120px" type="text" v-model="tag.name"><br>
                </td>
                <td><textarea v-model="tag.style"></textarea></td>
                <td>This is an <span :title="tag.name" :style="tag.style">example of how your final style will look</span>
                    when it appears in your journal.</td>
                <td>
                    <button v-if="!tag.saved" @click="saveTag(tag)">Save</button>
                    <button @click="deleteTag(tag.tag_id, $event)">Delete</button>
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
        tags: []
      }
    },
    mounted: function () {
      // Get tags from DB
      this.$db.all('SELECT * FROM tags ORDER BY name ASC')
        .then((rows) => {
          rows.forEach((row) => {
            this.tags.push({
              tag_id: row.tag_id,
              name: row.name,
              type: 'inline',
              style: row.style,
              saved: true
            })
          })
        })
    },
    methods: {
      newTag () {
        this.$db.insert('INSERT INTO tags (name) VALUES (?)', [''])
          .then((id) => {
            this.tags.push({
              tag_id: id,
              name: '',
              type: 'inline',
              style: '',
              saved: true
            })
          })
          .catch((error) => {
            console.log(error)
          })
      },
      saveTag (tag) {
        this.$db.run('UPDATE tags SET name = ?, type = ?, style = ? WHERE tag_id = ?', [tag.name, tag.type, tag.style, tag.tag_id])
          .then(() => {
            tag.saved = true
          })
      },
      deleteTag (id, event) {
        let confirm = 'Are you sure?'
        if (event.target.innerText === confirm) {
          this.$db.run('DELETE FROM tags WHERE tag_id = ?', [id])
            .then((ret) => {
              if (ret.changes) {
                this.tags = this.tags.filter(tag => {
                  return tag.tag_id !== id
                })
              }
            })
            .catch((error) => {
              console.log(error)
            })
        } else {
          event.target.innerText = confirm
          setTimeout(() => {
            event.target.innerText = 'Delete'
          }, 3000)
        }
      },
      exit () {
        this.$router.go(-1)
      }
    }
  }
</script>
