<template>
  <!-- A recursive tree child component -->
  <div class="branch">
    <div class="item" @click="click">
      <span :class="isSelected" @contextmenu.prevent="contextMenu">
        <i v-if="isFolder" :class="{ 'fa-minus-square-o': open, 'fa-plus-square-o': !open }" class="fa plus" />
        <i :class="icon" :style="colour" class="fa icon" />
        {{ model.label }}</span>
    </div>
    <div v-if="isFolder">
      <Tree
        v-for="child in model.children"
        v-show="open"
        :key="child.id"
        :model="child"
        :selected="selected"
        @bus="bus"
        @scrollHeight="updateScroll"
      />
    </div>
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
  props: {
    model: {
      type: Object,
      required: true
    },
    selected: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      highlight: false
    }
  },
  computed: {
    open: {
      get: function () {
        return this.model.isOpen
      },
      set: function () { }
    },
    isFolder () {
      return this.model.hasOwnProperty('children')
    },
    isSelected () {
      if (this.selected === this.model.date) {
        if (this.$el) {
          this.updateScroll(this.$el.getBoundingClientRect())
        }
        return 'selected'
      } else if (this.highlight) {
        return 'selected'
      } else {
        return ''
      }
    },
    icon () {
      return this.model.icon ? 'fa-' + this.model.icon : ''
    },
    colour () {
      return this.model.colour ? `color:${this.model.colour};` : ''
    }
  },
  watch: {
    'model.isOpen': function () {
      this.open = this.model.isOpen
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
    },
    bus: function (model) {
      this.$emit('bus', model)
    },
    contextMenu: function () {
      this.$emit('bus', { contextMenu: this })
    },
    select: function () {
      this.highlight = true
      this.$forceUpdate()
    },
    deselect: function () {
      this.highlight = false
    }
  }
}
</script>
