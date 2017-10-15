<template>
    <div id="wrapper">
        <main>
            <div class="left-side">
                <flat-pickr v-model="date" :config="calConfig"></flat-pickr>
                <p>{{ date }}</p>
                <button @click="save">Save</button>
                <p>ID: {{ entryId }}</p>
                <button @click="createTree">Tree</button>
            </div>

            <div class="right-side">
                <vue-editor v-model="content"></vue-editor>
            </div>
        </main>
    </div>
</template>

<script>
  import { VueEditor } from 'vue2-editor'
  import flatPickr from 'vue-flatpickr-component'
  import 'flatpickr/dist/flatpickr.css'

  export default {
    name: 'landing-page',
    components: {
      VueEditor,
      flatPickr
    },
    data () {
      return {
        date: this.moment().format(this.$db.DATE_DAY),
        content: '',
        calConfig: {
          inline: true
        },
        entryId: null
      }
    },
    watch: {
      date: function () {
        /*
        Watch for when a new calendar date is picked, and then select the entry for that day.
        If no entry, then create a new blank one.
         */
        var vm = this
        this.$db.getEntryByDate(this.date, function (row) {
          if (row) {
            // There is an existing entry for that date
            vm.content = row.content
            vm.entryId = row.entry_id
          } else {
            vm.content = ''
            vm.entryId = null
          }
        })
      }
    },
    methods: {
      save () {
        if (this.entryId) {
          // Entry ID already exists, update existing entry
          this.$db.updateEntry(this, function (result) {
            if (result) {
              console.log(result)
            } else {
              console.log('Update failed')
            }
          })
        } else {
          // No existing entry, so create new entry
          this.$db.createNewEntry(this)
        }
      },
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      createTree () {
        var tree = this.$db.getEntryTree()
        console.log(tree)
      }
    }
  }
</script>

<style>
    /* @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro'); */

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    .flatpickr-input {
        display: none;
    }

    .flatpickr-calendar {
        margin-bottom: 20px;
    }

    body {
        font-family: sans-serif;
    }

    #wrapper {
        height: 100vh;
        padding: 60px 80px;
        width: 100vw;
    }

    main {
        display: flex;
        justify-content: space-between;
    }

    .left-side {
        display: flex;
        flex-direction: column;
        margin-right: 20px;
    }

    .welcome {
        color: #555;
        font-size: 23px;
        margin-bottom: 10px;
    }

    .title {
        color: #2c3e50;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 6px;
    }

    .title.alt {
        font-size: 18px;
        margin-bottom: 10px;
    }

    #quill-container p {
        color: black;
        font-size: 14pt;
        margin-bottom: 10px;
    }

    .doc button {
        font-size: .8em;
        cursor: pointer;
        outline: none;
        padding: 0.75em 2em;
        border-radius: 2em;
        display: inline-block;
        color: #fff;
        background-color: #4fc08d;
        transition: all 0.15s ease;
        box-sizing: border-box;
        border: 1px solid #4fc08d;
    }

    .doc button.alt {
        color: #42b983;
        background-color: transparent;
    }
</style>
