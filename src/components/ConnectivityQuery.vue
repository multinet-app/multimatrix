<template>
  <div class="pa-0">
    <v-row>
      <v-col>
        <v-subheader> Hops</v-subheader>
      </v-col>
      <v-col>
        <v-select
          v-model="selectedHops"
          :items="hopsSelection"
        />
      </v-col>
    </v-row>
    <v-list dense>
      <v-list-item
        v-for="(_, i) in displayedHops"
        :key="i"
        class="pa-0"
      >
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                {{ i % 2 ? 'Edge' : 'Node' }}
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="selectedVariables[i]"
                :items="i % 2 ? edgeVariableItems : nodeVariableItems"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="selectedQueryOptions[i]"
                :items="queryOptionItems"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="selectedQueryOptions[i] === 'is (exact)'"
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

      <v-list-item class="px-0">
        <v-btn
          block
          class="ml-0 mt-4"
          color="primary"
          depressed
          @click="submitQuery"
        >
          Submit Query
        </v-btn>
      </v-list-item>
    </v-list>
  </div>
</template>

<script lang="ts">
import store from '@/store';
import { Node, Edge, Network } from '@/types';
import {
  computed, defineComponent, ref, Ref, watchEffect,
} from '@vue/composition-api';
import api from '@/api';
import { isInternalField } from '@/lib/typeUtils';

export default defineComponent({
  name: 'ConnectivityQuery',

  setup() {
    const hopsSelection = [1, 2, 3, 4, 5];
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => 2 * selectedHops.value + 1);

    const selectedVariables: Ref<string[]> = ref([]);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const edgeVariableItems = computed(() => (store.state.network ? Object.keys(store.state.edgeAttributes).filter((varName) => !isInternalField(varName)) : ['No network']));

    const selectedQueryOptions: Ref<string[]> = ref([]);
    const queryOptionItems = ['is (exact)', 'contains'];

    const selectedVariableValue: Ref<string[]> = ref([]);
    const variableValueItems: Ref<string[][]> = ref([]);

    // 21 = 2n + 1 for n = 5 (max number of hops allowed above)
    Array(21).fill(1).forEach(() => {
      selectedVariables.value.push(store.state.workspaceName === 'marclab' ? 'Label' : '');
      selectedQueryOptions.value.push('contains');
    });

    // For each selected node variable, fill in possible values for autocomplete
    watchEffect(() => {
      selectedVariables.value.forEach((variable: string, i: number) => {
        if (store.state.network !== null) {
          const currentData = i % 2 ? store.state.edgeAttributes : store.state.nodeAttributes;
          if (variable) {
            variableValueItems.value[i] = currentData[variable].map((value) => `${value}`);
          }
        }
      });
    });

    function submitQuery() {
      let pathQueryText = '';

      for (let i = 0; i < displayedHops.value; i += 1) {
        const queryOperator = selectedQueryOptions.value[i] === 'is (exact)' ? '==' : '=~';

        if (i === 0) {
          pathQueryText += `FILTER UPPER(p.vertices[${i / 2}].${selectedVariables.value[i]}) ${queryOperator} UPPER('${selectedVariableValue.value[i]}')`;
        } else if (selectedVariableValue.value[i] !== undefined) {
          if (i % 2 === 0) {
            // Nodes
            pathQueryText += ` AND UPPER(p.vertices[${i / 2}].${selectedVariables.value[i]}) ${queryOperator} UPPER('${selectedVariableValue.value[i]}')`;
          } else {
            // Edges
            pathQueryText += ` AND p.edges[${(i - 1) / 2}].${selectedVariables.value[i]} ${queryOperator} '${selectedVariableValue.value[i]}'`;
          }
        }
      }

      const queryOperator = selectedQueryOptions.value[0] === 'is (exact)' ? '==' : '=~';
      const aqlQuery = `
        let startNodes = (FOR n in [${store.state.nodeTableNames}][**] FILTER UPPER(n.${selectedVariables.value[0]}) ${queryOperator} UPPER('${selectedVariableValue.value[0]}') RETURN n)
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
                _from: '', _to: '', _key: '', _id: '',
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
            store.dispatch.aggregateNetwork('none');
            store.dispatch.updateNetwork({ network: newNetwork });
          }
        });
      }
    }
    return {
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
    };
  },
});
</script>
