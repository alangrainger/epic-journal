<template>
  <div id="container">
    <div id="inner">
      <div id="title">
        password
      </div>
      <input id="password" v-model="password" type="password" @keydown.enter="submit">
      <div id="message">
        {{ message }}
      </div>
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
        width: 260px;
    }
</style>

<script>
import { remote } from 'electron'

let db = remote.getGlobal('db')

export default {
  data () {
    return {
      message: '',
      password: ''
    }
  },
  mounted () {
    document.getElementById('password').focus()
    if (process.env.NODE_ENV === 'development') {
      this.password = 'test'
      this.submit()
    }
  },
  methods: {
    async submit () {
      let password = this.password
      this.password = ''
      this.message = 'loading...'
      try {
        await db.openDatabase(password)
        await this.$router.push({
          name: 'home',
          params: {
            date: this.$moment().format(this.$db.DATE_DAY)
          }
        })
      } catch (e) {
        let vm = this
        vm.message = 'Incorrect password. Please try again.'
        setTimeout(function () {
          vm.message = ''
        }, 3500)
        console.log(e)
      }
    }
  }
}
</script>
