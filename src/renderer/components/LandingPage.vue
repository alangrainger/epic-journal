<template>
	<div id="wrapper">
		<main>
			<div id="sidebar">
				<flat-pickr v-model="date" :config="calConfig"></flat-pickr>
				<p>{{ date }}</p>
				<button @click="save">Save</button>
				<p>ID: {{ entryId }}</p>
				<button @click="createTree">Tree</button>
				<button @click="getCSS">get CSS</button>
				&nbsp;
				<button @click="setCSS">Set CSS styles</button>
				<Tree :tree="tree" @update="updateDate"></Tree>
			</div>
			<div id="content">
				<vue-editor id="editor" v-model="content"></vue-editor>
				<div v-html="'<style>' + customStyles + '</style>'"></div>
			</div>
		</main>
	</div>
</template>
<script>
  import { VueEditor } from 'vue2-editor'
  import flatPickr from 'vue-flatpickr-component'
  import 'flatpickr/dist/flatpickr.css'
  import Tree from './Tree.vue'

  export default {
    name: 'landing-page',
    components: {
      VueEditor,
      flatPickr,
      Tree
    },
    mounted: function () {
      var vm = this

      // Load CSS
      this.$db.getOption('css', function (result) {
        vm.customStyles = result
      })

      // Load existing entry if there is one
      this.$db.getEntryByDate(this.date, function (row) {
        if (row) {
          vm.content = row.content
          vm.entryId = row.entry_id
        }
      })
    },
    data () {
      return {
        date: this.moment().format(this.$db.DATE_DAY),
        content: '',
        entryId: null,
        calConfig: {
          inline: true
        },
        customStyles: '',
        tree: {}
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
      updateDate (date) {
        this.date = date
      },
      getEntryById (entryId) {
        var vm = this
        this.$db.getEntryById(entryId, function (row) {
          if (row) {
            // There is an existing entry for that date
            vm.content = row.content
            vm.entryId = row.entry_id
          } else {
            vm.content = ''
            vm.entryId = null
          }
        })
      },
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
        var vm = this
        this.$db.getEntryTree(function (tree) {
          console.log(tree)
          vm.tree = tree
        })
      },
      getCSS () {
        var vm = this
        this.$db.getOption('css', function (result) {
          vm.customStyles = result
          vm.content = result
        })
      },
      setCSS () {
        // TODO: write a proper editor
        // stripping the HTML tags out for now, need to write a proper CSS editor page
        var css = this.content.replace(/<\/?[^>]+(>|$)/g, '')
        this.customStyles = css
        this.$db.setOption('css', css)
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
		height: 100%;
		justify-content: stretch;
	}

	#sidebar {
		display: flex;
		flex-direction: column;
		margin-right: 40px;
	}

	#content {
		display: flex;
		flex-grow: 1;
	}

	.quillWrapper {
		display: flex;
		flex-grow: 1;
		flex-direction: column;
	}

	#editor {
		display: flex;
		flex-grow: 1;
		flex-direction: row;
	}

	.ql-editor {
		width: 100%;
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

	#editor p {
		color: black;
		font-size: 14pt;
		margin-bottom: 0.7em;
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
