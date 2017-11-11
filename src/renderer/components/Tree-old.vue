<template>
    <div>
        <button @click="add">add</button>
        <TreeItem :model="tree"></TreeItem>
    </div>
</template>

<style scoped>
    #container {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }

    ul {
        list-style: none;
        padding-left: 15px;
    }

    ul span {
        padding: 1px 3px;
        cursor: default;
    }

    span.pointer {
        cursor: pointer;
    }

    li {
        line-height: 1.3em;
    }

    .branch {
        font-size: 14px;
        cursor: pointer;
    }

    .tree-year {
        margin-left: 0px;
    }

    .tree-month, .tree-entry {
        margin-left: 30px;
    }

    .selected {
        background-color: #D0E4FC;
        border-radius: 1px;
    }

    .icon {
        color: #888888;
    }

    .selected .icon {
        color: #333333;
    }

    .icon-year {
        color: #284971;
    }
</style>

<script>
  import TreeItem from './TreeItem.vue'

  export default {
    name: 'Tree',
    components: {
      TreeItem
    },
    data () {
      return {
        tree: {
          label: '2017',
          icon: 'archive',
          children: [
            {
              label: 'November',
              icon: 'calendar',
              children: [
                {
                  id: 101,
                  label: 'Entry',
                  icon: 'file-text-o'
                }
              ]
            },
            {name: 'wat'},
            {
              name: 'child folder',
              children: [
                {
                  name: 'child folder',
                  children: [
                    {name: 'hello'},
                    {name: 'wat'}
                  ]
                },
                {name: 'hello'},
                {name: 'wat'},
                {
                  name: 'child folder',
                  children: [
                    {name: 'hello'},
                    {name: 'wat'}
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    props: {},
    methods: {
      toggle: function () {
        if (this.isFolder) {
          this.open = !this.open
        }
      },
      add: function () {
        this.tree.children.push({
          label: 'October',
          icon: 'calendar',
          children: [
            {
              id: 102,
              label: 'Entry2',
              icon: 'file-text-o'
            }
          ]
        })
      }
    }
  }
</script>