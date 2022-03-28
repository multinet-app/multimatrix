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

    <div v-if="showMenu">
      <v-card
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

      <v-card
        v-for="(inputs, i) in queryInput"
        :key="`input${i}`"
        flat
        color="white"
        class="p-0"
      >
        <v-list dense>
          <v-list-item
            v-for="(val, j) in inputs.value"
            :key="`val-${i}-${j}`"
            class="pa-0"
          >
            <v-list-item class="pa-0">
              <v-list-item-avatar
                v-if="j === 0"
                class="mr-0"
              >
                <v-icon size="18">
                  {{ i % 2 ? 'mdi-swap-vertical' : `mdi-numeric-${(i+2)/2}-circle` }}
                </v-icon>
              </v-list-item-avatar>
              <v-row no-gutters>
                <v-col
                  v-if="j > 0"
                  cols="12"
                  sm="2"
                  class="pt-3"
                >
                  <v-autocomplete
                    v-model="inputs.operator"
                    :items="operatorOptionItems"
                    dense
                  />
                </v-col>
                <v-list-item-content class="pa-0 pr-1">
                  <v-col
                    cols="12"
                    sm="3"
                    class="pa-1"
                  >
                    <v-autocomplete
                      v-model="val.label"
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
                      v-model="val.operator"
                      :items="queryOptionItems"
                      dense
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="3"
                    class="pa-1"
                  >
                    <v-autocomplete
                      v-if="val.operator === '=='"
                      v-model="val.input"
                      :items="i % 2 ? variableValueItems.edge[val.label] : variableValueItems.node[val.label]"
                      dense
                    />
                    <v-text-field
                      v-else
                      v-model="val.input"
                      dense
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    sm="1"
                    class="mt-3"
                  >
                    <!-- Add button -->
                    <v-btn
                      icon
                      x-small
                      color="primary"
                      @click="addField(i)"
                    >
                      <v-icon>
                        mdi-plus
                      </v-icon>
                    </v-btn>
                    <!-- Remove button -->
                    <v-btn
                      v-show="j > 0"
                      icon
                      x-small
                      color="red"
                      @click="removeField(i, j)"
                    >
                      <v-icon>
                        mdi-minus
                      </v-icon>
                    </v-btn>
                  </v-col>
                </v-list-item-content>
              </v-row>
            </v-list-item>
          </v-list-item>
        </v-list>
      </v-card>

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
    </div>
  </div>
</template>

<script lang="ts">
import store from '@/store';
import {
  Node, Edge, Network,
} from '@/types';
import {
  computed, defineComponent, onMounted, ref, Ref, watch,
} from '@vue/composition-api';
import api from '@/api';

export default defineComponent({
  name: 'ConnectivityQuery',

  setup() {
    const showMenu = ref(false);
    const hopsSelection = [1, 2, 3];
    const selectedHops = computed({
      get() {
        return store.state.selectedHops;
      },
      set(value: number) {
        store.commit.setSelectedHops(value);
      },
    });
    const displayedHops = computed(() => 2 * selectedHops.value + 1);
    const loading: Ref<boolean> = ref(false);

    const selectedVariables: Ref<string[]> = ref([]);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const edgeVariableItems = computed(() => store.getters.edgeVariableItems);

    const selectedQueryOptions: Ref<string[]> = ref([]);
    const queryOptionItems = ['==', '=~', '!=', '<', '<=', '>', '>='];
    const operatorOptionItems = ['AND', 'OR', 'NOT'];

    const selectedVariableValue: Ref<string[]> = ref([]);

    const variableValueItems = computed(() => {
      const variableItems = { node: [], edge: [] };
      if (store.state.network !== null) {
        nodeVariableItems.value.forEach((nodeVariable: string) => {
          variableItems.node[nodeVariable] = store.state.nodeAttributes[nodeVariable].map((value) => `${value}`);
        });
        edgeVariableItems.value.forEach((edgeVariable: string) => {
          variableItems.edge[edgeVariable] = store.state.edgeAttributes[edgeVariable].map((value) => `${value}`);
        });
      }
      return variableItems;
    });

    // Create the object for storing input data
    const queryInput: Ref<{ key: number; value: { label: string; operator: string; input: string }[]; logic: string }[]> = ref([{ key: 1, value: [{ label: '', operator: '', input: '' }], logic: '' }]);

    watch([displayedHops], () => {
      queryInput.value = [...Array(displayedHops.value).keys()].map((i: number) => {
        if (i % 2 && store.state.workspaceName === 'marclab') {
          return {
            key: i, value: [{ label: 'Type', operator: '', input: '' }], logic: '',
          };
        }
        return {
          key: i, value: [{ label: 'Label', operator: '', input: '' }], logic: '',
        };
      });
    });

    onMounted(() => {
      queryInput.value = [...Array(displayedHops.value).keys()].map((i: number) => {
        if (i % 2 && store.state.workspaceName === 'marclab') {
          return {
            key: i, value: [{ label: 'Type', operator: '', input: '' }], logic: '',
          };
        }
        return {
          key: i, value: [{ label: 'Label', operator: '', input: '' }], logic: '',
        };
      });
    });

    // 7 = 2n + 1 for n = 3 (max number of hops allowed above)
    Array(7).fill(1).forEach(() => {
      selectedVariables.value.push(store.state.workspaceName === 'marclab' ? 'Label' : '');
      selectedQueryOptions.value.push('=~');
    });

    function addField(index: number) {
      queryInput.value[index].value.push({ input: '', label: '', operator: 'AND' });
    }

    function removeField(index: number, field: number) {
      queryInput.value[index].value.splice(field, 1);
    }

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
          } else {
            // Update state with empty network
            store.dispatch.aggregateNetwork(undefined);
            store.dispatch.updateNetwork({ network: { nodes: [], edges: [] } });
            store.commit.toggleShowIntNodeVis(false);
          }

          loading.value = false;
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
      addField,
      removeField,
      queryInput,
      operatorOptionItems,
    };
  },
});
</script>
