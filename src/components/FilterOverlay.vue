<template>
  <div>
    <v-row
      align="center"
      justify="center"
    >
      <v-overlay
        absolute
      >
        <v-card>
          <v-card-title>Action Needed</v-card-title>
          <v-card-text>
            The network you are loading is too large and additional
            parameters are required to visualize. Consider one of the
            following:
          </v-card-text>
          <v-card>
            <v-divider />
            <v-card-text>
              <div>Choose a random subset of nodes</div>
              <v-slider
                v-model="subsetAmount"
                :max="100"
                :min="10"
                step="10"
                ticks
                thumb-label
                thumb-color="primary"
              >
                <v-text-field
                  v-model="subsetAmount"
                  class="mt-0 pt-0"
                  hide-details
                  single-line
                  type="number"
                  style="width: 60px"
                />
              </v-slider>
            </v-card-text>
            <v-divider />
          </v-card>

          <v-btn
            class="white--text"
            color="primary"
            tile
            @click="filterNetwork"
          >
            Filter Network
          </v-btn>
        </v-card>
      </v-overlay>
    </v-row>
  </div>
</template>

<script lang="ts">
import api from '@/api';
import {
  ArangoAttributes, Edge, Network, Node,
} from '@/types';
import store from '@/store';
import { computed, defineComponent, ref } from '@vue/composition-api';
import { defineNeighbors, setNodeDegreeDict } from '@/lib/utils';

export default defineComponent({
  setup() {
    const subsetAmount = ref(0);
    const workspace = computed(() => store.state.workspaceName);

    function getAttributes() {
      const aqlQuery = `
      let nodeValues = (FOR doc IN [${store.getters.nodeTableNames}][**] RETURN VALUES(doc))
      let edgeValues = (FOR doc IN ${store.getters.edgeTableName} RETURN VALUES(doc))
      let nodeAttr = (FOR doc IN [${store.getters.nodeTableNames}][**] LIMIT 1 RETURN doc)
      let edgeAttr = (FOR doc IN ${store.getters.edgeTableName} LIMIT 1 RETURN doc)
      RETURN {nodeAttributes: nodeAttr, nodeValues: nodeValues, edgeAttributes: edgeAttr, edgeValues: edgeValues}
      `;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nodeAndEdgeQuery: Promise<any[]> | undefined;
      try {
        nodeAndEdgeQuery = api.aql(store.state.workspaceName || '', aqlQuery);
      } catch (error) {
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
          // eslint-disable-next-line no-restricted-syntax
          for (const [key, value] of Object.entries(nodeAttrDict)) {
            nodeAttributes[key] = [...new Set(aqlResults.nodeValues.map((vals: string[]) => `${vals[value]}`).sort())];
          }

          Array(aqlResults.edgeValues[0].length).fill(1).forEach((_, i) => {
            const attrKey: string = getKeyByValue(aqlResults.edgeAttributes[0], aqlResults.edgeValues[0][i]);
            edgeAttrDict[attrKey] = i;
          });
          // eslint-disable-next-line no-restricted-syntax
          for (const [key, value] of Object.entries(edgeAttrDict)) {
            edgeAttributes[key] = [...new Set(aqlResults.edgeValues.map((vals: string[]) => `${vals[value]}`).sort())];
          }
          store.commit.setLargeNetworkAttributeValues({ nodeAttributes, edgeAttributes });
        });
      }
    }

    function filterNetwork() {
      if (workspace.value === null) {
        return;
      }

      const aqlQuery = `let nodes = (FOR n in [${store.getters.nodeTableNames}][**] LIMIT ${subsetAmount.value} RETURN n) let edges = (FOR e in ${store.getters.edgeTableName} filter e._from in nodes[**]._id && e._to in nodes[**]._id RETURN e)
      RETURN {"nodes": nodes[**], edges}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let newAQLNetwork: Promise<any[]> | undefined;

      try {
        newAQLNetwork = api.aql(workspace.value, aqlQuery);
      } catch (error) {
        if (error.status === 400) {
          store.commit.setLoadError({
            message: error.statusText,
            href: 'https://multinet.app',
          });
        } else {
          store.commit.setLoadError({
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          });
        }
      } finally {
        if (store.state.loadError.message === 'The network you are loading is too large' && typeof newAQLNetwork === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          store.commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${store.state.workspaceName}&network=${store.state.networkName}`,
          });
        }
      }

      if (newAQLNetwork !== undefined) {
        newAQLNetwork.then((promise) => {
          const aqlNetwork: Network = promise[0];

          if (aqlNetwork.nodes.length !== 0) {
            const nodes = defineNeighbors(aqlNetwork.nodes, aqlNetwork.edges as Edge[]);

            // Build the network object and set it as the network in the store
            const aqlNetworkElements: Network = {
              nodes: nodes as Node[],
              edges: aqlNetwork.edges as Edge[],
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
        });
        getAttributes();
      }
    }

    return {
      subsetAmount,
      workspace,
      filterNetwork,
      getAttributes,
    };
  },
});
</script>
