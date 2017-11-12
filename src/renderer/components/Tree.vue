<template>
    <div class="tree-item">
        <div @click="click">
            <i v-if="isFolder" :class="{ 'fa-minus-square-o': open, 'fa-plus-square-o': !open }" class="fa branch"></i>
            <i :class="icon" :style="colour" class="fa icon"></i>
            {{model.label}}
        </div>
        <Tree
                v-if="isFolder"
                v-show="open"
                v-for="model in model.children"
                :model="model"
        >
        </Tree>
    </div>
</template>

<!--
         <span @click="year.show = toggle(year.show)"><i v-if="year.show" class="fa fa-minus-square-o branch"></i><i
                    v-if="!year.show" class="fa fa-plus-square-o branch"></i> <i class="fa fa-archive icon-year"></i> {{ name }}</span>
                <ul class="tree-month" v-show="year.show">
                    <li v-for="(month, name) in year.months">
                    <span @click="month.show = toggle(month.show)"><i v-if="month.show"
                                                               class="fa fa-minus-square-o branch"></i><i
                            v-if="!month.show" class="fa fa-plus-square-o branch"></i> <i
                            class="fa fa-calendar icon"></i> {{ name }}</span>

                        <ul class="tree-entry" v-show="month.show">
                            <li
                                    v-for="entry in month.entries"
                                    @click="$emit('update', entry.date)"
                            ><span :class="isSelected(entry.date)" class="pointer"><i
                                    class="fa fa-file-text-o icon"></i> {{ entry.value }}</span>
                            </li>
-->
<style scoped>
    #container {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }

    .tree-item {
        padding-left: 30px;
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

    .fa-archive {
        color: #284971;
    }
</style>

<script>
  export default {
    name: 'Tree',
    data () {
      return {
        open: false
      }
    },
    props: {
      model: Object
    },
    watch: {
      'model.open': function () {
        this.open = this.model.open
      }
    },
    computed: {
      isFolder: function () {
        return this.model.hasOwnProperty('children')
      },
      hasChildren: function () {
        console.log(this.model)
        return this.isFolder && this.model.children.length
      },
      isOpen: function () {
        return this.open && this.hasChildren()
      },
      icon: function () {
        return (this.model.icon) ? 'fa-' + this.model.icon : ''
      },
      colour: function () {
        if (this.model.colour) return {color: this.model.colour}
      }
    },
    methods: {
      click: function () {
        if (this.hasChildren) {
          this.open = !this.open
        } else {
          console.log('entry')
        }
      }
    }
  }
</script>