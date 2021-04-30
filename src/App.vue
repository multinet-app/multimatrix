<script lang="ts">
import Alert from '@/components/Alert.vue';
import { computed } from '@vue/composition-api';
import Controls from './components/Controls.vue';
import { getUrlVars } from './lib/utils';
import store from './store';

export default {
  name: 'App',

  components: {
    Alert,
    Controls,
  },

  setup() {
    const { workspace, graph: networkName } = getUrlVars();

    store.dispatch.fetchNetwork({
      workspaceName: workspace,
      networkName,
    });

    const loadError = computed(() => store.state.loadError);

    return {
      loadError,
    };
  },
};
</script>

<template>
  <v-app>
    <v-content>
      <controls />

      <alert v-if="loadError.message !== ''" />
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
