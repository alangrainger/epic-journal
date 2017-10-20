<template>
    <div id="app">
        <h1>Something has gone wrong:</h1>
        <p v-for="message in failMessages">{{ message }}</p>
    </div>
</template>

<script>
  export default {
    name: 'epic-journal'
  }
</script>

<style scoped>
    * {
        font-size: 16pt;
        font-family: sans-serif;
    }
</style>
