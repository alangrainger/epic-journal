<template>
    <div id="tree" class="scrollbar">
        <Tree v-for="model in tree" :model="model"></Tree>
    </div>
</template>

<script>
  import Tree from './Tree.vue'

  export default {
    name: 'EntriesTree',
    components: {
      Tree
    },
    data () {
      return {
        tree: []
      }
    },
    props: {},
    mounted: function () {
      this.createTree()
        .then(() => {
          this.$set(this.findYear(2017), 'open', true)
          this.findYear(2017).update()
        })
    },
    methods: {
      template (type, id) {
        id = parseInt(id)
        switch (type) {
          case 'year':
            return {
              id: id,
              label: id.toString(),
              icon: 'archive',
              children: []
            }
          case 'month':
            return {
              id: id,
              label: this.$moment(id, 'M').format('MMMM'), // convert month to word format,
              icon: 'calendar',
              children: []
            }
        }
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
      updateYear (obj) {
        let year = obj.id
        // Get months for that year
        this.$db.all('SELECT DISTINCT strftime(\'%m\', date) as month FROM entries WHERE DATE(date) BETWEEN DATE(\'' + year + '-01-01\') AND date(\'' + year + '-12-31\') AND folder_id = 1 ORDER BY date ASC')
          .then(rows => {
            rows.forEach(row => {
              this.findMonth(obj.children, row.month)
            })
          })
      },
      findYear (year) {
        year = parseInt(year)
        let index = this.tree.findIndex(e => {
          // Find existing index for that year
          return e.id === year
        })
        if (index === -1) {
          // If no existing element, create a new one
          index = this.tree.findIndex(e => {
            return e.id > year
          })
          if (index === -1) index = this.tree.length // no element found, add to end
          this.tree.splice(index, 0, this.template('year', year))
          let obj = this.tree[index]
          this.$set(obj, 'update', () => { this.updateYear(obj) })
        }

        // Return the year object
        return this.tree[index]
      },
      findMonth (array, month) {
        // Find existing index for that month, or create new index
        month = parseInt(month)

        let index = array.findIndex((e) => {
          return e.id === month
        })
        if (index !== -1) {
          return array[index]
        } else {
          let nextIndex = array.findIndex(e => {
            return e.id > month
          })
          if (nextIndex === -1) nextIndex = array.length // no element found, add to end
          array.splice(nextIndex, 0, this.template('month', month))
          return array[nextIndex]
        }
      },
      addMonths (date) {
        date = date || this.date
        let year = this.$moment(date).format('YYYY')
        console.log(this.tree)
        let index = this.tree.findIndex((e) => {
          console.log(e)
          return e.id === 2017
        })
        console.log('i ' + index)
        this.$db.all('SELECT DISTINCT strftime(\'%m\', date) as month FROM entries WHERE DATE(date) BETWEEN DATE(\'' + year + '-01-01\') AND date(\'' + year + '-12-31\') AND folder_id = 1 ORDER BY date ASC')
          .then(rows => {
            for (let i = 0; i < rows.length; i++) {
              let month = this.$moment(rows[i].month, 'MM').format('MMMM') // convert month to word format
              this.tree[index].children.push({
                id: rows[i].month,
                label: month,
                icon: 'calendar',
                children: []
              })
            }
            console.log(this.tree)
          })
      },
      addEntries (date) {
        date = date || this.date
        let year = this.$moment(date).format('YYYY')
        let month = this.$moment(date).format('MM')
        let start = this.$moment(date).startOf('month').format('YYYY-MM-DD')
        let end = this.$moment(date).endOf('month').format('YYYY-MM-DD')
        this.$db.all('SELECT * FROM entries WHERE DATE(date) BETWEEN DATE(\'' + start + '\') AND date(\'' + end + '\') AND folder_id = 1 ORDER BY date ASC')
          .then(rows => {
            for (let i = 0; i < rows.length; i++) {
              let label = this.$moment(rows[i].date).format('DD - dddd')
              this.$set(this.tree[year].children[month].children, rows[i].date, {
                label: label,
                icon: 'file-text-o'
              })
            }
          })
      }
    }
  }
</script>
