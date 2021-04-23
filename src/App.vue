<script lang="ts">
import Controls from './components/Controls.vue';
import { getUrlVars } from './lib/utils';
import store from './store';

export default {
  name: 'App',

  components: {
    Controls,
  },

  async mounted() {
    const { workspace, graph: networkName } = getUrlVars();
    if (!workspace || !networkName) {
      throw new Error(
        `Workspace and network must be set! workspace=${workspace} network=${networkName}`,
      );
    }

    store.dispatch.fetchNetwork({
      workspaceName: workspace,
      networkName,
    });
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

<style scoped>
#app {
  font-family: Blinker, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}
</style>
