<template>
    <div id="container">
        <div id="inner">
            <div id="title">password</div>
            <input id="password" type="password" v-model="password" v-on:keydown.enter="submit">
            <div id="message">{{ message }}</div>
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

    input, input:focus {
        font-size: 30pt;
        background-color: transparent;
        border: 0;
        outline: none;
        text-align: center;
        color: white;
        border-bottom: 1px solid white;
        margin: 0 0 0.5em 0;
        width: 300px;
    }
</style>

<script>
  import router from '../router'
  import db from '../datastore'

  export default {
    data () {
      return {
        message: '',
        password: ''
      }
    },
    mounted: function () {
      document.getElementById('password').focus()
    },
    methods: {
      submit: function (event) {
        let password = this.password
        this.password = ''
        this.message = 'loading...'
        db.openDatabase(password)
          .then(() => {
            router.push('main')
          })
          .catch((error) => {
            let vm = this
            vm.message = 'Incorrect password. Please try again.'
            setTimeout(function () {
              vm.message = ''
            }, 3500)
            console.log(error)
          })
      }
    }
  }
</script>