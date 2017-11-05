<template>
    <div id="wrapper">
        <div class="info"><h1>Tags</h1></div>
        <table>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th style="width:40%">Style</th>
                <th style="width:30%">Preview</th>
                <th></th>
            </tr>
            <tr v-for="(tag, i) in tags" @keyup="tag.saved = false">
                <td>
                    <input style="width: 120px" type="text" v-model="tag.name"><br>
                </td>
                <td @change="tag.saved = false">
                    <div style="white-space: nowrap"><input type="radio" :id="'inline' + tag.tag_id" value="inline" v-model="tag.type">&nbsp;<label :for="'inline' + tag.tag_id">Inline</label></div>
                    <div style="white-space: nowrap"><input type="radio" :id="'block' + tag.tag_id" value="block" v-model="tag.type">&nbsp;<label :for="'block' + tag.tag_id">Block</label></div>
                </td>
                <td><textarea v-model="tag.style"></textarea></td>
                <td v-if="tag.type === 'block'"><div :title="tag.name" :style="tag.style">This is an example of how your final style will look when it appears in your journal.</div></td>
                <td v-else>This is an <span :title="tag.name" :style="tag.style">example of how your final style will look</span> when it appears in your journal.</td>
                <td>
                    <button :class="{disabled: tag.saved}" :disabled="tag.saved" @click="saveTag(tag)">Save</button>
                    <button @click="deleteTag(tag.tag_id, $event)">Delete</button>
                </td>
            </tr>
        </table>
        <button @click="newTag">Add New</button>
        <button @click="exit">Go Back</button>
        <div class="info">
        <h2>Note:</h2>
        <p>Tags work by applying a custom class to a section of text. By default they are inline and work using a &lt;span&gt;.
        Be careful about using block-type tags. They are limited to &lt;p&gt; elements and can have unintended consequences.</p>
        <p>If you create a tag as an inline style, and later switch it to block, it can cause a bit of formatting havoc in your existing entries.
        I have included them for completeness, and for people who really wish to customise the visual style of their journal.</p>
        </div>
    </div>
</template>

<style scoped>
    #wrapper {
        height: 100vh;
        padding: 46px 60px;
        width: 100vw;
    }

    h1, h2, h3 {
        margin: 0.5em 0;
    }

    .info {
        max-width: 760px;
        margin: 0 0 1.5em 0;
        padding: 0;
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

    button.disabled {
        color: #d5d5d5;
        border-color: #d5d5d5;
        cursor: default;
    }
    button.disabled:hover {
        background: white;
        color: #d5d5d5;
    }

    p { margin-bottom: 0.8em; }
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
              type: row.type,
              style: row.style,
              saved: true
            })
          })
        })
    },
    methods: {
      newTag () {
        this.$db.insert('tags', { name: '' })
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
