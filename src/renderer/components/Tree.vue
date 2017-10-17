<template>
 	<ul class="tree-year">
		<li v-for="(year, name) in tree" >
			<span @click="year.show = !year.show"><i v-if="year.show" class="fa fa-minus-square-o"></i><i v-if="!year.show" class="fa fa-plus-square-o"></i> {{ name }}</span>
			<ul class="tree-month" v-show="year.show">
				<li v-for="(month, name) in year.months">
					<span @click="month.show = !month.show"><i v-if="month.show" class="fa fa-minus-square-o"></i><i v-if="!month.show" class="fa fa-plus-square-o"></i> {{ name }}</span>

					<ul class="tree-entry" v-show="month.show">
						<li
								v-for="entry in month.entries"
								@click="$emit('update', entry.date)"
						><span>{{ entry.value }}</span></li>
					</ul>
				</li>
			</ul>
		</li>
	</ul>
</template>

<style>
	ul {
		list-style: none;
	}
	ul span {
		cursor: pointer;
	}
	ul i {
		font-size: 14px !important;
	}
	.tree-year {
		margin-left: 0px;
	}
	.tree-month, .tree-entry {
		margin-left: 30px;
	}
</style>

<script>
  export default {
    props: {
      tree: {
        type: Object,
        required: true
      }
    }
  }
</script>