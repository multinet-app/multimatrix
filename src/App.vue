<script setup lang="ts">
import AlertBanner from '@/components/AlertBanner.vue';
import ProvVis from '@/components/ProvVis.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiMatrix from '@/components/MultiMatrix.vue';
import { useStore } from '@/store';
import 'multinet-components/dist/style.css';
import { storeToRefs } from 'pinia';
import { undoRedoKeyHandler } from '@/lib/provenanceUtils';
import { ref, computed } from 'vue';
import { ToolBar } from 'multinet-components';
import oauthClient from '@/oauth';
import { isInternalField } from './lib/typeUtils';

const store = useStore();
const {
  network,
  loadError,
  showProvenanceVis,
  labelVariable,
  selectedNodes,
  userInfo,
} = storeToRefs(store);

store.fetchNetwork();

// Set up provenance undo and redo, provenance is not a ref here
const { provenance } = store;
document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, provenance));

const showControlPanel = ref(false);

const searchItems = computed(() => {
  if (labelVariable.value !== undefined) {
    const allCombinations = network.value.nodes.map((node) => Object.entries(node).map(([key, value]) => (isInternalField(key) ? null : ({ text: `${key}: ${value}`, value: { [key]: value } })))).flat();
    return [...new Map(allCombinations.filter((combo) => combo !== null).map((combo) => [combo?.text, combo])).values()];
  }
  return [];
});

function search(searchTerm: Record<string, unknown>) {
  const nodeIDsToSelect = network.value.nodes
    .filter((node) => Object.entries(searchTerm).every(([key, value]) => node[key] === value))
    .map((node) => node._id);

  if (nodeIDsToSelect.length > 0) {
    selectedNodes.value.push(...nodeIDsToSelect);
  }
}

function exportNetwork() {
  const networkToExport = {
    nodes: network.value.nodes.map((node) => {
      const newNode = { ...node };
      newNode.id = newNode._key;

      return newNode;
    }),
    edges: network.value.edges.map((edge) => {
      const newEdge = { ...edge };
      newEdge.source = `${edge._from.split('/')[1]}`;
      newEdge.target = `${edge._to.split('/')[1]}`;
      return newEdge;
    }),
  };

  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(networkToExport)], {
      type: 'text/json',
    }),
  );
  a.download = `${store.networkName}.json`;
  a.click();
}
</script>

<template>
  <v-app>
    <v-main>
      <tool-bar
        app-name="MultiMatrix"
        :clear-selection="() => selectedNodes = []"
        :prov-undo="() => provenance.undo()"
        :prov-redo="() => provenance.redo()"
        :search="search"
        :search-items="searchItems"
        :export-network="exportNetwork"
        :show-trrack-vis="() => showProvenanceVis = true"
        :toggle-side-bar="() => showControlPanel = !showControlPanel"
        :user-info="userInfo"
        :oauth-client="oauthClient"
        :logout="store.logout"
        :fetch-user-info="store.fetchUserInfo"
      />

      <control-panel v-show="showControlPanel" />

      <multi-matrix v-if="network.nodes.length > 0" :style="{ marginLeft: showControlPanel ? '256px' : 0 }" />

      <alert-banner v-if="loadError.message !== ''" />
    </v-main>

    <prov-vis v-if="showProvenanceVis" />
  </v-app>
</template>

<style>
#app {
  font-family: Blinker, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
