<template>
    <div id="tree" class="scrollbar">
        <Tree v-for="model in tree" :key="model.id" :model="model" :selected="selected"
              @scrollHeight="updateScroll" @bus="bus"></Tree>
    </div>
</template>

<style scoped>
    #tree {
        overflow-y: auto;
        padding: 0 10px;
        margin-top: 20px;
        height: 100%;
    }
</style>

<script>
  import Tree from './Tree.vue'

  export default {
    name: 'EntriesTree',
    components: {
      Tree
    },
    data () {
      return {
        tree: [],
        selected: null
      }
    },
    props: {entry: Object},
    mounted: function () {
      this.createTree()
        .then(() => {
          this.expandToDate(this.$moment().format('YYYY-MM-DD'))
        })

      this.$on('bus', section => {
        console.log(section)
      })
    },
    watch: {
      'entry.id': function () {
        this.expandToDate(this.entry.date)
        this.selected = this.entry.id
      }
    },
    methods: {
      bus (data) {
        if (data.contextMenu) {
          // Add right-click handler
          const {remote} = require('electron')
          const {Menu, MenuItem} = remote

          const menu = new Menu()
          menu.append(new MenuItem({label: 'MenuItem1', click () { console.log('item 1 clicked') }}))
          menu.append(new MenuItem({type: 'separator'}))
          menu.append(new MenuItem({label: 'MenuItem2', type: 'checkbox', checked: true}))

          let model = data.contextMenu
          console.log(model)
          this.$set(model, 'highlight', true)
          model.highlight = true
          menu.popup(remote.getCurrentWindow())
        }
      },
      updateScroll (bounds) {
        // Get top of the tree element
        let top = this.$el.getBoundingClientRect().top
        let bottom = this.$el.getBoundingClientRect().bottom
        let scroll = this.$el.scrollTop
        let scrollDiff = 0
        if (bounds.top < top) {
          scrollDiff = bounds.top - top
        } else if (bounds.bottom > bottom) {
          scrollDiff = bounds.bottom - bottom
        }
        this.$el.scrollTop = scroll + scrollDiff
      },
      expandToDate (date) {
        // Expand to today
        let year = date.substring(0, 4)
        let month = date.substring(5, 7)
        let yearObj = this.findYear(year)
        let monthObj = this.findMonth(yearObj, month)
        monthObj.open()
      },
      open (obj) {
        if (!obj.isOpen) {
          obj.update()
          this.$set(obj, 'isOpen', true)
        }
        if (obj.parent) obj.parent.open()
      },
      close (obj) {
        if (obj.isOpen) this.$set(obj, 'isOpen', false)
      },
      createTree () {
        return new Promise((resolve, reject) => {
          // Get all root years
          this.$db.all('SELECT DISTINCT strftime(\'%Y\', date) as year FROM entries WHERE folder_id = 1 ORDER BY date ASC')
            .then(rows => {
              rows.forEach(row => {
                this.findYear(row.year)
              })
              resolve()
            })
            .catch(err => reject(err))
        })
      },
      updateYear (yearObj) {
        let year = yearObj.year
        // Get months for that year
        this.$db.all('SELECT DISTINCT strftime(\'%m\', date) as month FROM entries WHERE DATE(date) BETWEEN DATE(\'' + year + '-01-01\') AND date(\'' + year + '-12-31\') AND folder_id = 1 ORDER BY date ASC')
          .then(rows => {
            rows.forEach(row => {
              this.findMonth(yearObj, row.month)
            })
          })
      },
      updateMonth (monthObj) {
        let yearObj = monthObj.parent
        let start = this.$moment(yearObj.year + '-' + monthObj.month, 'YYYY-M').startOf('month').format('YYYY-MM-DD')
        let end = this.$moment(yearObj.year + '-' + monthObj.month, 'YYYY-M').endOf('month').format('YYYY-MM-DD')
        // Get entries for that month
        this.$db.all('SELECT * FROM entries WHERE DATE(date) BETWEEN DATE(\'' + start + '\') AND date(\'' + end + '\') AND folder_id = 1 ORDER BY date ASC')
          .then(rows => {
            let children = []
            for (let i = 0; i < rows.length; i++) {
              let row = rows[i]
              let label = this.$moment(row.date, 'YYYY-MM-DD').format('DD - dddd')
              children.push({
                id: row.entry_id,
                date: row.date,
                label: label,
                type: 'entry',
                parent: monthObj,
                icon: 'file-text-o',
                action: () => {
                  this.$emit('update', row.date)
                  this.selected = row.entry_id
                }
              })
            }
            console.debug('Updating ' + monthObj.label)
            this.$set(monthObj, 'children', children)
          })
      },
      findYear (year) {
        let vm = this
        year = parseInt(year)
        let index = this.tree.findIndex(e => {
          // Find existing index for that year
          return e.year === year
        })
        if (index === -1) {
          // If no existing element, create a new one
          index = this.tree.findIndex(e => {
            return e.year > year
          })
          if (index === -1) index = this.tree.length // no element found, add to end
          this.tree.splice(index, 0, {
            id: 'date' + year,
            year: year,
            label: year.toString(),
            icon: 'archive',
            children: [],
            isOpen: false,
            update: function () { vm.updateYear(this) },
            open: function () { vm.open(this) },
            close: function () { vm.close(this) }
          })
        }

        // Return the year object
        return this.tree[index]
      },
      findMonth (yearOrObj, month) {
        let vm = this

        // Find existing index for that month, or create new index
        let yearObj
        if (yearOrObj === null || isNaN(month)) {
          return // return if no year set
        } else if (typeof yearOrObj === 'object') {
          yearObj = yearOrObj
        } else {
          yearObj = this.findYear(yearOrObj)
        }
        month = parseInt(month)
        let array = yearObj.children

        let index = array.findIndex((e) => {
          return e.month === month
        })
        if (index === -1) {
          index = array.findIndex(e => {
            return e.month > month
          })
          if (index === -1) index = array.length // no element found, add to end
          array.splice(index, 0, {
            id: 'date' + yearObj.year + month,
            month: month,
            label: this.$moment(month, 'M').format('MMMM'), // convert month to word format,
            icon: 'calendar',
            children: [],
            update: function () { vm.updateMonth(this) },
            open: function () { vm.open(this) },
            close: function () { vm.close(this) },
            parent: yearObj
          })
        }
        return array[index]
      }
    }
  }
</script>
