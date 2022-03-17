<script lang="ts">
import Alert from '@/components/Alert.vue';
import { computed } from '@vue/composition-api';
import ProvVis from '@/components/ProvVis.vue';
import Controls from '@/components/Controls.vue';
import MultiMatrix from '@/components/MultiMatrix.vue';
import EdgeSlices from '@/components/EdgeSlices.vue';
import { getUrlVars } from '@/lib/utils';
import store from '@/store';

export default {
  name: 'App',

  components: {
    Alert,
    Controls,
    MultiMatrix,
    ProvVis,
    EdgeSlices,
  },

  setup() {
    const urlVars = getUrlVars();

    store.dispatch.fetchNetwork({
      workspaceName: urlVars.workspace,
      networkName: urlVars.network,
    }).then(() => {
      store.dispatch.createProvenance();
    });
    const network = computed(() => store.state.network);

    const loadError = computed(() => store.state.loadError);

    const showProvenanceVis = computed(() => store.state.showProvenanceVis);

    const slicedNetwork = computed(() => store.state.slicedNetwork.length > 1);

    return {
      loadError,
      network,
      showProvenanceVis,
      slicedNetwork,
    };
  },
};
</script>

<template>
  <v-app>
    <v-content>
      <controls />
      <edge-slices
        v-if="network !== null && slicedNetwork"
      />
      <multi-matrix v-if="network !== null" />

      <alert v-if="loadError.message !== ''" />
    </v-content>

    <prov-vis v-if="showProvenanceVis" />
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
