<template>
    <div id="wrapper">
        <table>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Style</th>
                <th></th>
            </tr>
            <tr v-for="(tag, i) in tags">
                <td><input type="text" v-model="tag.name"></td>
                <td>
                    <input type="radio" id="inline" value="inline" v-model="tag.type"><label for="inline">Inline</label><br>
                    <input type="radio" id="block" value="block" v-model="tag.type"><label for="block">Block</label>
                </td>
                <td><textarea v-model="tag.style"></textarea></td>
                <td>
                    <button @click="saveTag(tag)">Save</button>
                    <button @click="deleteTag(tag.tag_id)">Delete</button>
                    <div>{{ tag.message }}</div>
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
        width: 400px;
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
            row.message = ''
            this.tags.push(row)
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
              class: '',
              message: ''
            })
          })
          .catch((error) => {
            console.log(error)
          })
      },
      saveTag (tag) {
        this.$db.run('UPDATE tags SET name = ?, type = ?, style = ? WHERE tag_id = ?', [tag.name, tag.type, tag.style, tag.tag_id])
          .then(() => {
            tag.message = 'Tag saved'
            setTimeout(() => {
              tag.message = ''
            }, 1500)
          })
      },
      deleteTag (id) {
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
      },
      exit () {
        this.$router.go(-1)
      }
    }
  }
</script>
