<script setup lang="ts">
import AlertBanner from '@/components/AlertBanner.vue';
import { computed } from 'vue';
import ProvVis from '@/components/ProvVis.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiMatrix from '@/components/MultiMatrix.vue';
import EdgeSlices from '@/components/EdgeSlices.vue';
import { getUrlVars } from '@/lib/utils';
import store from '@/store';

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

</script>

<template>
  <v-app>
    <v-content>
      <control-panel />
      <edge-slices
        v-if="network !== null && slicedNetwork"
      />
      <multi-matrix v-if="network !== null" />

      <alert-banner v-if="loadError.message !== ''" />
    </v-content>

    <prov-vis v-if="showProvenanceVis" />
  </v-app>
</template>

<style>
body {
  scrollbar-width: none;
}

::-webkit-scrollbar {
  display: none;
}

#app {
  font-family: Blinker, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}
</style>
