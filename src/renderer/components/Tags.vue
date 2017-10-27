<template>
    <div id="wrapper">
        <main>
            <p>asdf</p>
            <button @click="exit">Go Back</button>
        </main>
    </div>
</template>

<style scoped>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    #wrapper {
        height: 100vh;
        padding: 46px 60px;
        width: 100vw;
    }

    main {
        display: flex;
        height: 100%;
        justify-content: stretch;
    }
</style>

<script>
  export default {
    data () {
      return {
      }
    },
    mounted: function () {
    },
    methods: {
      exit: function () {
        this.$router.go(-1)
      }
    }
  }
</script>
