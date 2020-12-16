<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'EpicJournal'
}
</script>

<style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    #app {
        width: 100vw;
        height: 100vh;
        overflow-y: auto;
    }

    #main {
        padding: 46px 60px;
        background: #FDFDFD;
    }

    body, p, button, input {
        font-family: Segoe UI, sans-serif;
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

    /* Scrollbars */
    ::-webkit-scrollbar-track
    {
        -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.1);
        background-color: #FEFEFE;
    }

    ::-webkit-scrollbar
    {
        width: 6px;
        background-color: #FEFEFE;
    }

    ::-webkit-scrollbar-thumb
    {
        background-color: #E0E0E0;
    }
</style>
