<template>
  <div class="pa-0">
    <v-subheader class="grey darken-3 py-0 pr-0 white--text">
      Connectivity Query

      <v-spacer />

      <v-btn
        :min-width="40"
        :height="48"
        depressed
        tile
        class="grey darken-3 pa-0"
        @click="showMenu = !showMenu"
      >
        <v-icon color="white">
          {{ showMenu ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
      </v-btn>
    </v-subheader>

    <v-card
      v-if="showMenu"
      flat
      tile
    >
      <v-card
        color="grey lighten-3"
        flat
        tile
      >
        <v-card-text class="pt-2 pb-1">
          <v-select
            v-model="selectedHops"
            label="Hops"
            :items="hopsSelection"
          />
        </v-card-text>
      </v-card>
      <v-list dense>
        <v-list-item
          v-for="(_, i) in displayedHops"
          :key="i"
          class="pa-0"
        >
          <v-list-item-avatar class="mr-0">
            <v-icon size="18">
              {{ i % 2 ? 'mdi-swap-vertical' : `mdi-numeric-${(i+2)/2}-circle` }}
            </v-icon>
          </v-list-item-avatar>
          <v-list-item-content class="pa-0 pr-1">
            <v-row no-gutters>
              <v-col
                cols="12"
                sm="5"
                class="pa-1"
              >
                <v-autocomplete
                  v-model="selectedVariables[i]"
                  :items="i % 2 ? edgeVariableItems : nodeVariableItems"
                  dense
                />
              </v-col>
              <v-col
                cols="12"
                sm="3"
                class="pa-1"
              >
                <v-autocomplete
                  v-model="selectedQueryOptions[i]"
                  :items="queryOptionItems"
                  dense
                />
              </v-col>
              <v-col
                cols="12"
                sm="4"
                class="pa-1"
              >
                <v-autocomplete
                  v-if="selectedQueryOptions[i] === '=='"
                  v-model="selectedVariableValue[i]"
                  :items="variableValueItems[i]"
                  dense
                />
                <v-text-field
                  v-else
                  v-model="selectedVariableValue[i]"
                  dense
                />
              </v-col>
            </v-row>
          </v-list-item-content>
        </v-list-item>

        <v-list-item>
          <v-btn
            block
            class="ml-0 mt-4"
            color="primary"
            depressed
            :loading="loading"
            @click="submitQuery"
          >
            Submit Query
          </v-btn>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<script lang="ts">
import store from '@/store';
import { Node, Edge, Network } from '@/types';
import {
  computed, defineComponent, ref, Ref, watchEffect,
} from '@vue/composition-api';
import api from '@/api';

export default defineComponent({
  name: 'ConnectivityQuery',

  setup() {
    const showMenu = ref(false);
    const hopsSelection = [1, 2, 3, 4, 5];
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => 2 * selectedHops.value + 1);
    const loading: Ref<boolean> = ref(false);

    const selectedVariables: Ref<string[]> = ref([]);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const edgeVariableItems = computed(() => store.getters.edgeVariableItems);

    const selectedQueryOptions: Ref<string[]> = ref([]);
    const queryOptionItems = ['==', '=~', '!=', '<', '<=', '>', '>='];

    const selectedVariableValue: Ref<string[]> = ref([]);
    const variableValueItems: Ref<string[][]> = ref([]);

    // 21 = 2n + 1 for n = 5 (max number of hops allowed above)
    Array(21).fill(1).forEach(() => {
      selectedVariables.value.push(store.state.workspaceName === 'marclab' ? 'Label' : '');
      selectedQueryOptions.value.push('=~');
    });

    // For each selected node variable, fill in possible values for autocomplete
    watchEffect(() => {
      selectedVariables.value.forEach((variable: string, i: number) => {
        if (store.state.network !== null) {
          const currentData = i % 2 ? store.state.edgeAttributes : store.state.nodeAttributes;
          if (variable && Object.keys(currentData).length > 0) {
            variableValueItems.value[i] = currentData[variable].map((value) => `${value}`);
          }
        }
      });
    });

    function isTextComparison(operator: string) {
      return ['==', '=~'].includes(operator);
    }
    function submitQuery() {
      loading.value = true;
      let pathQueryText = '';

      // If we're doing a text comparison use UPPER('...') else, just the value
      const valueInQuery = selectedVariableValue.value.map((value, index) => (isTextComparison(selectedQueryOptions.value[index]) ? `UPPER('${value}')` : `TO_NUMBER(${value})`));

      pathQueryText += 'FILTER 1==1';
      for (let i = 0; i < displayedHops.value; i += 1) {
        const queryOperator = selectedQueryOptions.value[i];

        if (selectedVariableValue.value[i] !== undefined) {
          if (i % 2 === 0) {
            // Nodes
            const variableinQuery = valueInQuery[i].startsWith('UPPER')
              ? `UPPER(p.vertices[${i / 2}].${selectedVariables.value[i]})`
              : `TO_NUMBER(p.vertices[${i / 2}].${selectedVariables.value[i]})`;
            pathQueryText += ` AND ${variableinQuery} ${queryOperator} ${valueInQuery[i]}`;
          } else {
            // Edges
            const variableinQuery = valueInQuery[i].startsWith('UPPER')
              ? `UPPER(p.edges[${(i - 1) / 2}].${selectedVariables.value[i]})`
              : `TO_NUMBER(p.edges[${(i - 1) / 2}].${selectedVariables.value[i]})`;
            pathQueryText += ` AND ${variableinQuery} ${queryOperator} ${valueInQuery[i]}`;
          }
        }
      }

      const startNode = isTextComparison(selectedQueryOptions.value[0]) ? `UPPER(n.${selectedVariables.value[0]})` : `TO_NUMBER(n.${selectedVariables.value[0]})`;
      const aqlQuery = `
        let startNodes = (FOR n in [${store.getters.nodeTableNames}][**] FILTER ${startNode} ${selectedQueryOptions.value[0]} ${valueInQuery[0]} RETURN n)
        let paths = (FOR n IN startNodes FOR v, e, p IN 1..${selectedHops.value} ANY n GRAPH '${store.state.networkName}' ${pathQueryText} RETURN {paths: p})
        RETURN {paths: paths[**].paths}
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let newAQLNetwork: Promise<any[]> | undefined;
      try {
        newAQLNetwork = api.aql(store.state.workspaceName || '', aqlQuery);
      } catch (error) {
        // Add error message for user
        if (error.status === 400) {
          store.commit.setLoadError({
            message: error.statusText,
            href: 'https://multinet.app',
          });
        }
      }
      if (newAQLNetwork !== undefined) {
        newAQLNetwork.then((promise) => {
          const aqlResults = promise[0];
          if (aqlResults.paths.length !== 0) {
            // some data manipulation to show only start + end nodes
            const newNetwork: Network = { nodes: [], edges: [] };
            const endsNodesSet = new Set();
            const middleNodesSet = new Set();
            const middleNodesList: Node[] = [];

            aqlResults.paths.forEach((path: { edges: Edge[]; vertices: Node[] }, val: number) => {
              const newPath: Edge = {
                _from: '', _to: '', _key: '', _id: '', _rev: '',
              };

              for (let i = 0; i < selectedHops.value + 1; i += 1) {
                if (i === 0) {
                  newPath._from = path.vertices[i]._id;
                  if (!endsNodesSet.has(path.vertices[i]._id)) { newNetwork.nodes.push(path.vertices[i]); }
                  endsNodesSet.add(path.vertices[i]._id);
                } else if (i > 0 && i < selectedHops.value) {
                  if (!middleNodesSet.has(path.vertices[i]._id)) { middleNodesList.push(path.vertices[i]); }
                  middleNodesSet.add(path.vertices[i]._id);
                } else {
                  newPath._to = path.vertices[i]._id;
                  if (!endsNodesSet.has(path.vertices[i]._id)) { newNetwork.nodes.push(path.vertices[i]); }
                  endsNodesSet.add(path.vertices[i]._id);
                }
              }

              // generate _key and _id
              newPath._key = val.toString();
              newPath._id = val.toString();
              newNetwork.edges.push(newPath);
            });

            // Update state for use in intermediate node vis
            store.commit.setConnectivityMatrixPaths({ nodes: middleNodesList, paths: aqlResults.paths });

            // Update state for showing intermediate node vis
            if (selectedHops.value > 1) store.commit.toggleShowIntNodeVis(true);

            // Update state with new network
            store.dispatch.aggregateNetwork(undefined);
            store.dispatch.updateNetwork({ network: newNetwork });
            loading.value = false;
            store.commit.setDirectionalEdges(true);
            // remove sliced network
            store.commit.setSlicedNetwork([]);
          }
        });
      }
    }
    return {
      showMenu,
      hopsSelection,
      selectedHops,
      displayedHops,
      queryOptionItems,
      selectedVariables,
      selectedQueryOptions,
      selectedVariableValue,
      nodeVariableItems,
      edgeVariableItems,
      variableValueItems,
      submitQuery,
      loading,
    };
  },
});
</script>
