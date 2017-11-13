<template>
    <div class="branch">
        <div @click="click" class="item">
            <span :class="isSelected"><i v-if="isFolder"
                                         :class="{ 'fa-minus-square-o': open, 'fa-plus-square-o': !open }"
                                         class="fa plus"></i>
            <i :class="icon" :style="colour" class="fa icon"></i>
            {{model.label}}</span>
        </div>
        <Tree
                v-if="isFolder"
                v-show="open"
                v-for="model in model.children"
                :key="model.id"
                :model="model"
                :selected="selected"
                @scrollHeight="updateScroll"
        >
        </Tree>
    </div>
</template>

<style scoped>
    .branch {
        /* font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; */
        padding-left: 30px;
        font-size: 16px;
    }

    .item {
        margin: 2px 0;
    }

    span {
        padding: 1px 3px;
        cursor: pointer;
    }

    .plus {
        font-size: 14px;
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
      return {}
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
      open: {
        get: function () {
          return this.model.isOpen
        },
        set: function () { }
      },
      isFolder: function () {
        return this.model.hasOwnProperty('children')
      },
      isSelected: function () {
        if (this.selected === this.model.id) {
          if (this.$el) {
            this.updateScroll(this.$el.getBoundingClientRect())
          } else {
            setTimeout(() => {
              if (this.$el) this.updateScroll(this.$el.getBoundingClientRect())
            }, 100) // cleanup in case tree isn't updated in that time
            // TODO this needs to be changed to promises
          }
          return 'selected'
        }
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
      },
      updateScroll: function (bounds) {
        this.$emit('scrollHeight', bounds)
      }
    }
  }
</script>