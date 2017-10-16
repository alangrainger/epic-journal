<template>
	<ul class="tree-year">
		<li v-for="(months, year) in tree">
			{{ year }}
			<ul class="tree-month">
				<li v-for="(entries, month) in months">
					{{ month }}
					<ul class="tree-entry">
						<li
								v-for="entry in entries"
								@click="$emit('update', entry.date)"
						>{{ entry.value }}</li>
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
	.tree-year {
		margin-left: 0px;
	}
	.tree-month {
		margin-left: 20px;
	}
	.tree-entry {
		margin-left: 20px;
		cursor: pointer;
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