<template>
    <div id="container">
        <ul class="tree-year">
            <li v-for="(year, name) in tree">
            <span @click="year.show = !year.show"><i v-if="year.show" class="fa fa-minus-square-o branch"></i><i
                    v-if="!year.show" class="fa fa-plus-square-o branch"></i> <i class="fa fa-archive icon-year"></i> {{ name }}</span>
                <ul class="tree-month" v-show="year.show">
                    <li v-for="(month, name) in year.months">
                    <span @click="month.show = !month.show"><i v-if="month.show" class="fa fa-minus-square-o branch"></i><i
                            v-if="!month.show" class="fa fa-plus-square-o branch"></i> <i class="fa fa-calendar icon"></i> {{ name }}</span>

                        <ul class="tree-entry" v-show="month.show">
                            <li
                                    v-for="entry in month.entries"
                                    @click="$emit('update', entry.date)"
                            ><span :class="isSelected(entry.date)" class="pointer"><i class="fa fa-file-text-o icon"></i> {{ entry.value }}</span>
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<style scoped>
    #container {
        padding: 12px 30px;
    }
    ul {
        list-style: none;
    }

    ul span {
        padding: 1px 3px;
        cursor: default;
    }

    span.pointer {
        cursor: pointer;
    }

    li { line-height: 1.3em; }

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
  export default {
    props: {
      tree: {
        type: Object,
        required: true
      }
    },
    methods: {
      isSelected: function (date) {
        return (date === this.$parent.date) ? 'selected' : ''
      }
    }
  }
</script>