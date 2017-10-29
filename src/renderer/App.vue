<template>
    <div id="app">
        <router-view></router-view>
    </div>
</template>

<script>
  export default {
    name: 'epic-journal'
  }
</script>

<style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    body, p, button, input {
        font-family: 'Segoe UI', sans-serif;
    }

    body {
        background: #FDFDFD;
    }

    button {
        background: white;
        border: 1px solid #569FF7;
        color: #5388dd;
        font-size: 1em;
        padding: 4px 8px;
        margin: 0 6px 10px 0;
        white-space: nowrap;
    }

    button:hover {
        background: #569FF7;
        color: white;
        cursor: pointer;
    }
</style>
