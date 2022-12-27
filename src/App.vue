<script setup lang="ts">
import AlertBanner from '@/components/AlertBanner.vue';
import ProvVis from '@/components/ProvVis.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiMatrix from '@/components/MultiMatrix.vue';
import EdgeSlices from '@/components/EdgeSlices.vue';
import { getUrlVars } from '@/lib/utils';
import { useStore } from '@/store';
import 'multinet-components/dist/style.css';
import { storeToRefs } from 'pinia';

const store = useStore();

const urlVars = getUrlVars();

store.fetchNetwork(
  urlVars.workspace,
  urlVars.network,
).then(() => {
  store.createProvenance();
});

const {
  network,
  loadError,
  showProvenanceVis,
  slicedNetwork,
} = storeToRefs(store);
</script>

<template>
  <v-app>
    <v-main>
      <control-panel />

      <edge-slices v-if="slicedNetwork.length > 0" />

      <multi-matrix v-if="network.nodes.length > 0" />

      <alert-banner v-if="loadError.message !== ''" />
    </v-main>

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
