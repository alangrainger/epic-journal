<template>
    <div id="container">
        <div id="inner">
            <h1>Welcome to Epic Journal</h1>
            <p>Click the Create button below to create a new journal. Choose a folder and then
                type the desired filename.
                You can also choose an existing journal.</p>
            <p>The next screen will come up with a password. Type any password you like and press
                Enter.</p>
            <button @click="create">CREATE</button>
            <button @click="open">OPEN EXISTING</button>
        </div>
    </div>
</template>

<style scoped>
    #container {
        height: 100%;
        width: 100%;
        background-color: #569FF7;
        position: absolute;
    }

    h1 {
        font-family: 'Segoe UI', sans-serif;
        font-weight: normal;
        margin-bottom: 1em;
    }

    p {
        font-family: 'Segoe UI', sans-serif;
        margin-bottom: 1em;
        text-align: left;
    }

    #inner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-family: "Lucida Console", "Consolas", monospace;
        font-weight: normal;
        font-size: 16pt;
        color: white;
    }

    #title {
        font-size: 30pt;
        margin-bottom: 0.5em;
        margin-top: 30px;
    }

    #message {
        height: 30px;
        padding-top: 10px;
        font-size: 18px;
        color: rgba(255, 255, 255, 0.8)
    }

    button {
        background: #569FF7;
        border: 2px solid white;
        color: white;
        font-size: 1em;
        line-height: 1em;
        padding: 0.4em 0.8em 0.6em 0.8em;
        margin: 1em 0;
        white-space: nowrap;
    }

    button:hover {
        background: white;
        color: #5388dd;
        cursor: pointer;
    }
</style>

<script>
import promiseIpc from 'electron-promise-ipc'
import router from '../router'

export default {
  data () {
    return {
      message: '',
      password: ''
    }
  },
  mounted: function () {
  },
  methods: {
    create () {
      promiseIpc
        .send('createJournal')
        .then(() => router.push('password'))
        .catch((e) => console.error(e))
    },
    open () {
      /* let result = ipcRenderer.sendSync('openJournal')
      if (result) {
        router.push('password')
      } */
    }
  }
}
</script>
