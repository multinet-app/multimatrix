<script lang="ts">
import Controls from './components/Controls.vue';

export default {
  name: 'app',

  components: {
    Controls,
  },
};
</script>

<template>
  <v-app>
    <v-content>
      <controls />
    </v-content>
  </v-app>
</template>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}
</style>
