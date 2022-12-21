<template>
  <div>
    <v-alert
      v-if="loadError.message !== 'The network you are loading is too large'"
      type="warning"
      border="left"
      prominent
      tile
    >
      <v-row align="center">
        <v-col class="grow">
          {{ loadError.message }}

          <br>

          <small v-if="loadError.message === 'You are not authorized to view this workspace'">
            If you are already logged in, please check with the workspace owner to verify your permissions.
          </small>

          <small v-else>
            Select a workspace and network you'd like to view.
          </small>
        </v-col>

        <v-col
          v-if="buttonText !== 'Refresh the page' && buttonText !== 'Subset the network'"
          class="grow, py-0"
        >
          <v-row>
            <v-col class="py-0">
              <v-select
                v-model="workspace"
                label="Workspace"
                :items="workspaceOptions"
              />
            </v-col>

            <v-col class="py-0">
              <v-select
                v-model="network"
                label="Network"
                :items="networkOptions"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col class="shrink">
          <v-btn
            :href="buttonHref"
            depressed
            dark
            color="grey darken-3"
          >
            {{ buttonText }}
          </v-btn>
        </v-col>
      </v-row>
    </v-alert>

    <network-subsetter
      v-if="loadError.message === 'The network you are loading is too large' && edgeTableName !== null"
      :workspace-name="workspaceName"
      :min-subset-size="10"
      :max-subset-size="100"
      :node-table-names="nodeTableNames"
      :edge-table-name="edgeTableName"
      :load-error="loadError"
      :set-load-error="store.commit.setLoadError"
      :network-name="networkName"
      :api="api"
      @networkUpdated="replaceNetworkWithSubset"
    />
  </div>
</template>

<script setup lang="ts">
import store from '@/store';
import {
  computed, Ref, ref, watchEffect,
} from 'vue';
import api from '@/api';
import { NetworkSubsetter } from 'multinet-components';
import { defineNeighbors, setNodeDegreeDict } from '@/lib/utils';
import { ArangoAttributes, Network } from '../types';

const edgeTableName = computed(() => store.getters.edgeTableName);
const nodeTableNames = computed(() => store.getters.nodeTableNames);
const workspaceName = computed(() => (store.state.workspaceName === null ? '' : store.state.workspaceName));
const networkName = computed(() => store.state.networkName);

function getAttributes() {
  const aqlQuery = `
      let nodeValues = (FOR doc IN [\`${store.getters.nodeTableNames}\`][**] RETURN VALUES(doc))
      let edgeValues = (FOR doc IN \`${store.getters.edgeTableName}\` RETURN VALUES(doc))
      let nodeAttr = (FOR doc IN [\`${store.getters.nodeTableNames}\`][**] LIMIT 1 RETURN doc)
      let edgeAttr = (FOR doc IN \`${store.getters.edgeTableName}\` LIMIT 1 RETURN doc)
      RETURN {nodeAttributes: nodeAttr, nodeValues: nodeValues, edgeAttributes: edgeAttr, edgeValues: edgeValues}
      `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodeAndEdgeQuery: Promise<any[]> | undefined;
  try {
    nodeAndEdgeQuery = api.aql(store.state.workspaceName || '', { query: aqlQuery, bind_vars: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Add error message for user
    if (error.status === 400) {
      store.commit.setLoadError({
        message: error.statusText,
        href: 'https://multinet.app',
      });
    }
  }
  if (nodeAndEdgeQuery !== undefined) {
    nodeAndEdgeQuery.then((promise) => {
      const aqlResults = promise[0];

      const nodeAttrDict: {[key: string]: number} = {};
      const edgeAttrDict: {[key: string]: number} = {};
      const nodeAttributes: ArangoAttributes = {};
      const edgeAttributes: ArangoAttributes = {};

      const getKeyByValue = (obj: {[key: string]: string | number | boolean }, value: string | number | boolean) => Object.keys(obj)[Object.values(obj).indexOf(value)];

      Array(aqlResults.nodeValues[0].length).fill(1).forEach((_, i) => {
        const attrKey: string = getKeyByValue(aqlResults.nodeAttributes[0], aqlResults.nodeValues[0][i]);
        nodeAttrDict[attrKey] = i;
      });
      Object.entries(nodeAttrDict).forEach(([key, value]) => {
        nodeAttributes[key] = [...new Set(aqlResults.nodeValues.map((vals: string[]) => `${vals[value]}`).sort())];
      });

      Array(aqlResults.edgeValues[0].length).fill(1).forEach((_, i) => {
        const attrKey: string = getKeyByValue(aqlResults.edgeAttributes[0], aqlResults.edgeValues[0][i]);
        edgeAttrDict[attrKey] = i;
      });
      Object.entries(edgeAttrDict).forEach(([key, value]) => {
        edgeAttributes[key] = [...new Set(aqlResults.edgeValues.map((vals: string[]) => `${vals[value]}`).sort())];
      });
      store.commit.setLargeNetworkAttributeValues({ nodeAttributes, edgeAttributes });
    });
  }
}

function replaceNetworkWithSubset(newNetwork: Network) {
  if (newNetwork.nodes.length !== 0) {
    const nodes = defineNeighbors(newNetwork.nodes, newNetwork.edges);

    // Build the network object and set it as the network in the store
    const aqlNetworkElements: Network = {
      nodes,
      edges: newNetwork.edges,
    };

    // Update state with new network
    store.dispatch.updateNetwork({ network: aqlNetworkElements });
    store.commit.setNetworkOnLoad(aqlNetworkElements);
    store.commit.setDegreeEntries(setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.queriedNetwork, store.state.directionalEdges));
    store.commit.setLoadError({
      message: '',
      href: '',
    });
  }
  getAttributes();
}

const loadError = computed(() => store.state.loadError);

// Vars to store the selected choices in
const workspace: Ref<string | null> = ref(null);
const network: Ref<string | null> = ref(null);

// Compute the workspace/network options
const workspaceOptions: Ref<string[]> = ref([]);
watchEffect(async () => {
  workspaceOptions.value = (await api.workspaces()).results.map((workspaceObj) => workspaceObj.name);
});

const networkOptions: Ref<string[]> = ref([]);
watchEffect(async () => {
  if (workspace.value !== null) {
    networkOptions.value = (await api.networks(workspace.value)).results.map((networkObj) => networkObj.name);
  }
});

// Add button
const buttonHref: Ref<string> = ref(loadError.value.href);
const buttonText: Ref<string> = ref('');
watchEffect(async () => {
  if (workspace.value !== null && network.value !== null) {
    buttonHref.value = `./?workspace=${workspace.value}&network=${network.value}`;
    buttonText.value = 'Go To Network';
  } else if (loadError.value.message === 'There was a network issue when getting data') {
    buttonHref.value = loadError.value.href;
    buttonText.value = 'Refresh the page';
  } else {
    buttonHref.value = loadError.value.href;
    buttonText.value = 'Back to MultiNet';
  }
});
</script>

<style>
#app {
  font-family: "Blinker", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}

.v-btn__content {
  padding-bottom: 2px;
}
</style>
