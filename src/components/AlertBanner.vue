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
      :edge-table-name="edgeTableName || ''"
      :load-error="loadError"
      :set-load-error="setLoadError"
      :network-name="networkName"
      :api="api"
      @networkUpdated="replaceNetworkWithSubset"
    />
  </div>
</template>

<script setup lang="ts">
import { useStore } from '@/store';
import { ref, watchEffect } from 'vue';
import api from '@/api';
import { NetworkSubsetter } from 'multinet-components';
import { defineNeighbors, calculateNodeDegrees } from '@/lib/utils';
import { storeToRefs } from 'pinia';
import { ArangoAttributes, LoadError, Network } from '../types';

const store = useStore();
const {
  edgeTableName,
  nodeTableNames,
  workspaceName,
  networkName,
  loadError,
  networkOnLoad,
  degreeRange,
  directionalEdges,
  nodeAttributes,
  edgeAttributes,
} = storeToRefs(store);

function setLoadError(newError: LoadError) {
  loadError.value = newError;
}

function getAttributes() {
  const aqlQuery = `
      let nodeValues = (FOR doc IN [\`${nodeTableNames.value}\`][**] RETURN VALUES(doc))
      let edgeValues = (FOR doc IN \`${edgeTableName.value}\` RETURN VALUES(doc))
      let nodeAttr = (FOR doc IN [\`${nodeTableNames.value}\`][**] LIMIT 1 RETURN doc)
      let edgeAttr = (FOR doc IN \`${edgeTableName.value}\` LIMIT 1 RETURN doc)
      RETURN {nodeAttributes: nodeAttr, nodeValues: nodeValues, edgeAttributes: edgeAttr, edgeValues: edgeValues}
      `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodeAndEdgeQuery: Promise<any[]> | undefined;
  try {
    nodeAndEdgeQuery = api.aql(workspaceName.value || '', { query: aqlQuery, bind_vars: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Add error message for user
    if (error.status === 400) {
      loadError.value = {
        message: error.statusText,
        href: 'https://multinet.app',
      };
    }
  }
  if (nodeAndEdgeQuery !== undefined) {
    nodeAndEdgeQuery.then((promise) => {
      const aqlResults = promise[0];

      const nodeAttrDict: {[key: string]: number} = {};
      const edgeAttrDict: {[key: string]: number} = {};
      const nodeAttributesLocal: ArangoAttributes = {};
      const edgeAttributesLocal: ArangoAttributes = {};

      const getKeyByValue = (obj: {[key: string]: string | number | boolean }, value: string | number | boolean) => Object.keys(obj)[Object.values(obj).indexOf(value)];

      Array(aqlResults.nodeValues[0].length).fill(1).forEach((_, i) => {
        const attrKey: string = getKeyByValue(aqlResults.nodeAttributes[0], aqlResults.nodeValues[0][i]);
        nodeAttrDict[attrKey] = i;
      });
      Object.entries(nodeAttrDict).forEach(([key, value]) => {
        nodeAttributesLocal[key] = [...new Set(aqlResults.nodeValues.map((vals: string[]) => `${vals[value]}`).sort())];
      });

      Array(aqlResults.edgeValues[0].length).fill(1).forEach((_, i) => {
        const attrKey: string = getKeyByValue(aqlResults.edgeAttributes[0], aqlResults.edgeValues[0][i]);
        edgeAttrDict[attrKey] = i;
      });
      Object.entries(edgeAttrDict).forEach(([key, value]) => {
        edgeAttributesLocal[key] = [...new Set(aqlResults.edgeValues.map((vals: string[]) => `${vals[value]}`).sort())];
      });
      nodeAttributes.value = nodeAttributesLocal;
      edgeAttributes.value = edgeAttributesLocal;
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
    networkOnLoad.value = aqlNetworkElements;
    degreeRange.value = [0, calculateNodeDegrees(aqlNetworkElements, directionalEdges.value)[1]];

    loadError.value = {
      message: '',
      href: '',
    };
  }
  getAttributes();
}

// Vars to store the selected choices in
const workspace = ref<string | null>(null);
const network = ref<string | null>(null);

// Compute the workspace/network options
const workspaceOptions = ref<string[]>([]);
watchEffect(async () => {
  workspaceOptions.value = (await api.workspaces()).results.map((workspaceObj) => workspaceObj.name);
});

const networkOptions = ref<string[]>([]);
watchEffect(async () => {
  if (workspace.value !== null) {
    networkOptions.value = (await api.networks(workspace.value)).results.map((networkObj) => networkObj.name);
  }
});

// Add button
const buttonHref = ref(loadError.value.href);
const buttonText = ref('');
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
