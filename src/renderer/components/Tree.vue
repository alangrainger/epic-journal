<template>
    <div class="tree-item">
        <div @click="click">
            <span :class="isSelected"><i v-if="isFolder" :class="{ 'fa-minus-square-o': open, 'fa-plus-square-o': !open }" class="fa plus"></i>
            <i :class="icon" :style="colour" class="fa icon"></i>
            {{model.label}}</span>
        </div>
        <Tree
                v-if="isFolder"
                v-show="open"
                v-for="model in model.children"
                :model="model"
                :selected="selected"
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
    .tree-item {
        /* font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; */
        padding-left: 30px;
        font-size: 16px;
    }

    span {
        padding: 1px 3px;
        cursor: pointer;
    }

    .plus {
        font-size: 14px;
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
      model: Object,
      selected: Number
    },
    watch: {
      'model.isOpen': function () {
        this.open = this.model.isOpen
      }
    },
    computed: {
      isFolder: function () {
        return this.model.hasOwnProperty('children')
      },
      hasChildren: function () {
        return this.isFolder && this.model.children.length
      },
      isOpen: function () {
        return this.open && this.hasChildren()
      },
      isSelected: function () {
        return (this.selected === this.model.id) ? 'selected' : null
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
        if (this.isFolder) {
          if (this.open) {
            this.model.close()
          } else {
            this.model.open()
          }
        } else {
          this.model.action()
        }
      }
    }
  }
</script>