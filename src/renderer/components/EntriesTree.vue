<template>
  <div id="tree" class="scrollbar">
    <pre>{{ $moment().format('Do') }}</pre>
    <Tree
      v-for="model in tree"
      :key="model.id"
      :model="model"
      :selected="selected"
      @scrollHeight="updateScroll"
      @bus="bus"
    />
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

const { remote, clipboard } = require('electron')
const { Menu, MenuItem } = remote

export default {
  name: 'EntriesTree',
  components: {
    Tree
  },
  props: {
    selected: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      tree: []
    }
  },
  watch: {
    /**
     * Watch for selected entry ID to change, then expand calendar to that date
     */
    selected: {
      async handler () {
        this.expandToDate(this.$moment(this.selected).format(this.$db.DATE_SQL))
      },
      immediate: true
    }
  },
  async mounted () {
    await this.createTree()
    this.expandToDate(this.$moment().format('YYYY-MM-DD'))

    this.$on('bus', section => {
      console.log(section)
    })
  },
  methods: {
    bus (data) {
      if (data.contextMenu && data.contextMenu.model.type === 'entry') {
        let item = data.contextMenu
        let vm = this
        item.highlight = true

        // Add right-click handler
        const menu = new Menu()
        menu.append(new MenuItem({
          label: 'Copy entry link',
          click () {
            // Send new ID to router
            vm.$db.getById('entries', item.model.id)
              .then((row) => {
                let date = vm.$moment(row.date).format('dddd Do MMMM')
                clipboard.writeHTML('<a href="entry://' + item.model.id + '">' + date + '</a>')
              })
          }
        }))
        this.$nextTick(() => {
          // For some reason, the setTimeout is required for the above highlight to update, even with nextTick
          setTimeout(() => {
            menu.popup(remote.getCurrentWindow())
            // Process is blocked until menu is closed
            item.highlight = false
          }, 0)
        })
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
    async createTree () {
      try {
        // Get all root years
        let rows = await this.$db.all('SELECT DISTINCT strftime(\'%Y\', date) as year FROM entries WHERE folder_id = 1 ORDER BY date ASC')
        rows.forEach(row => {
          this.findYear(row.year)
        })
      } catch (e) {
        console.log(e)
      }
    },
    async updateYear (yearObj) {
      let year = yearObj.year
      // Get months for that year
      try {
        let rows = await this.$db.all('SELECT DISTINCT strftime(\'%m\', date) as month FROM entries WHERE DATE(date) BETWEEN DATE(\'' + year + '-01-01\') AND date(\'' + year + '-12-31\') AND folder_id = 1 ORDER BY date ASC')
        rows.forEach(row => {
          this.findMonth(yearObj, row.month)
        })
      } catch (e) {
        console.log(e)
      }
    },
    async updateMonth (monthObj) {
      let yearObj = monthObj.parent
      let start = this.$moment(yearObj.year + '-' + monthObj.month, 'YYYY-M').startOf('month').format('YYYY-MM-DD')
      let end = this.$moment(yearObj.year + '-' + monthObj.month, 'YYYY-M').endOf('month').format('YYYY-MM-DD')
      // Get entries for that month
      try {
        let rows = await this.$db.all(`SELECT * FROM entries WHERE DATE(date) BETWEEN DATE('${start}') AND date('${end}') AND folder_id = 1 ORDER BY date ASC`)
        let children = []
        for (let i = 0; i < rows.length; i++) {
          let row = rows[i]
          let label = this.$moment(row.date, 'YYYY-MM-DD').format('DD - dddd')
          children.push({
            id: row.id,
            date: row.date,
            label: label,
            type: 'entry',
            parent: monthObj,
            icon: 'file-text-o',
            action: () => {
              if (this.$route.params.date !== row.date) this.$router.push({ name: 'home', params: { date: row.date } })
            }
          })
        }
        console.debug('Updating ' + monthObj.label)
        this.$set(monthObj, 'children', children)
      } catch (e) {
        console.log(e)
      }
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
