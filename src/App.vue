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
import { undoRedoKeyHandler } from '@/lib/provenanceUtils';

const store = useStore();
const {
  network,
  loadError,
  showProvenanceVis,
  slicedNetwork,
} = storeToRefs(store);

const urlVars = getUrlVars();
store.fetchNetwork(
  urlVars.workspace,
  urlVars.network,
);

// Set up provenance undo and redo, provenance is not a ref here
const { provenance } = store;
document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, provenance));
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
