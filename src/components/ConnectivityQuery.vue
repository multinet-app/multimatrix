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
        v-for="i in displayedHops"
        :key="i"
        class="pa-0"
      >
        <v-list-item-content v-if="i % 2 !== 0">
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeVariable[(i-1)/2]"
                :items="nodeVariableItems"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeQuerySelection[(i-1)/2]"
                :items="nodeQueryOptions"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="nodeQuerySelection[(i-1)/2] === 'is (exact)'"
                v-model="nodeVariableValue[(i-1)/2]"
                :items="nodeVariableOptions[(i-1)/2]"
                dense
              />
              <v-text-field
                v-else
                v-model="nodeVariableValue[(i-1)/2]"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
        <v-list-item-content v-else>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Edge
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeVariable[(i-2)/2]"
                :items="edgeVariableItems"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeVariableValue[(i-2)/2]"
                :items="edgeVariableOptions[(i-2)/2]"
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
  computed, ref, Ref, watchEffect,
} from '@vue/composition-api';
import api from '@/api';

export default {
  name: 'ConnectivityQuery',

  setup() {
    const hopsSelection = [1, 2, 3, 4, 5];
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => 2 * selectedHops.value + 1);
    const nodeQueryOptions = ['is (exact)', 'contains'];
    const nodeVariable: Ref<string[]> = ref([]);
    const edgeVariable: Ref<string[]> = ref([]);
    const nodeVariableValue: Ref<string[]> = ref([]);
    const edgeVariableValue: Ref<string[]> = ref([]);
    const nodeQuerySelection: Ref<string[]> = ref([]);
    const nodeVariableItems = computed(() => (store.state.network ? Object.keys(store.state.network.nodes[0]) : ['No network']));
    const edgeVariableItems = computed(() => (store.state.network ? Object.keys(store.state.network.edges[0]) : ['No network']));
    const nodeVariableOptions: string[][] = [];
    const edgeVariableOptions: string[][] = [];
    const displayedHopsLoop = Array(displayedHops.value).fill(1).map((_, i) => i + 1);

    displayedHopsLoop.forEach(() => {
      nodeVariable.value.push(store.state.workspaceName === 'marclab' ? 'Label' : '');
      edgeVariable.value.push(store.state.workspaceName === 'marclab' ? 'Type' : '');
      nodeVariableValue.value.push('');
      edgeVariableValue.value.push('');
      nodeQuerySelection.value.push('contains');
    });

    // For each selected node variable, fill in possible values for autocomplete
    watchEffect(() => {
      nodeVariable.value.forEach((variable: string, i: number) => {
        nodeVariableOptions[i] = store.state.network !== null ? store.state.network.nodes.map((n: Node) => `${n[variable]}`).sort() : ['No attribute selected'];
      });
    });

    // For each selected edge variable, fill in possible values for autocomplete
    watchEffect(() => {
      edgeVariable.value.forEach((variable: string, i: number) => {
        edgeVariableOptions[i] = store.state.network !== null ? store.state.network.edges.map((n: Edge) => `${n[variable]}`).sort() : ['No attribute selected'];
      });
    });

    function submitQuery() {
      let pathQueryText = '';
      for (let i = 0; i < selectedHops.value + 1; i += 1) {
        const queryOperator = nodeQuerySelection.value[i] === 'is (exact)' ? '==' : '=~';
        if (i === 0) {
          pathQueryText += `FILTER UPPER(p.vertices[${i}].${nodeVariable.value[i]}) ${queryOperator} UPPER('${nodeVariableValue.value[i]}')`;
        } else if (nodeVariableValue.value[i] !== '') {
          pathQueryText += ` AND UPPER(p.vertices[${i}].${nodeVariable.value[i]}) ${queryOperator} UPPER('${nodeVariableValue.value[i]}')`;
        }
      }
      for (let i = 0; i < selectedHops.value; i += 1) {
        if (i === 0 && edgeVariableValue.value[i] !== '') {
          pathQueryText += ` FILTER p.edges[${i}].${edgeVariable.value[i]} == '${edgeVariableValue.value[i]}'`;
        } else if (edgeVariableValue.value[i] !== '') {
          pathQueryText += ` AND p.edges[${i}].${edgeVariable.value[i]} == '${edgeVariableValue.value[i]}'`;
        }
      }
      const queryOperator = nodeQuerySelection.value[0] === 'is (exact)' ? '==' : '=~';
      const aqlQuery = `
        let startNodes = (FOR n in [${store.state.nodeTableNames}][**] FILTER UPPER(n.${nodeVariable.value[0]}) ${queryOperator} UPPER('${nodeVariableValue.value[0]}') RETURN n)
        let paths = (FOR n IN startNodes FOR v, e, p IN 1..${selectedHops.value} ANY n GRAPH '${store.state.networkName}' ${pathQueryText} RETURN {paths: p})
        let path = (for p in paths RETURN p.paths)
        RETURN {paths: path}
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
            const nodesSet = new Set();

            aqlResults.paths.forEach((path: { edges: Edge[]; vertices: Node[] }, val: number) => {
              const newPath: Edge = {
                _from: '', _to: '', _key: '', _id: '',
              };

              for (let i = 0; i < selectedHops.value + 1; i += 1) {
                if (i === 0) {
                  newPath._from = path.vertices[i]._id;
                  if (!nodesSet.has(path.vertices[i]._id)) { newNetwork.nodes.push(path.vertices[i]); }
                  nodesSet.add(path.vertices[i]._id);
                }
                if (i === (selectedHops.value)) {
                  newPath._to = path.vertices[i]._id;
                  if (!nodesSet.has(path.vertices[i]._id)) { newNetwork.nodes.push(path.vertices[i]); }
                  nodesSet.add(path.vertices[i]._id);
                }
              }

              // generate _key and _id
              newPath._key = val.toString();
              newPath._id = val.toString();
              newNetwork.edges.push(newPath);
            });

            // Update state with new network
            store.dispatch.updateNetwork({ network: newNetwork });
          }
        });
      }
    }
    return {
      hopsSelection,
      selectedHops,
      displayedHops,
      nodeQueryOptions,
      nodeVariable,
      edgeVariable,
      nodeVariableValue,
      edgeVariableValue,
      nodeQuerySelection,
      nodeVariableItems,
      nodeVariableOptions,
      edgeVariableItems,
      edgeVariableOptions,
      submitQuery,
    };
  },
};
</script>
