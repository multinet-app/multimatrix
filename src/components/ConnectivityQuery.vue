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
                v-model="nodeCategory[i]"
                :items="nodeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeQuerySelection[i]"
                :items="nodeQueryOptions"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="nodeQuerySelection[i] === 'is (exact)'"
                v-model="nodeCategorySelection[i]"
                :items="nodeCategoryOptions[i]"
                dense
              />
              <v-text-field
                v-else
                v-model="nodeCategorySelection[i]"
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
                v-model="edgeCategory[i]"
                :items="edgeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeCategorySelection[i]"
                :items="edgeCategoryOptions[i]"
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
  computed, ref, Ref, reactive,
} from '@vue/composition-api';
import api from '@/api';

export default {
  name: 'ConnectivityQuery',

  setup() {
    const hopsSelection = [1, 2, 3, 4, 5];
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => ((selectedHops.value % 2 === 0) ? (selectedHops.value + 3) : (selectedHops.value + 2)));
    const nodeQueryOptions = ['is (exact)', 'contains'];
    const edgeQueryOptions: Ref<string[]> = ref([]);
    const nodeCategory = reactive({
      1: store.state.workspaceName === 'marclab' ? 'Label' : '', 2: store.state.workspaceName === 'marclab' ? 'Label' : '', 3: store.state.workspaceName === 'marclab' ? 'Label' : '', 4: store.state.workspaceName === 'marclab' ? 'Label' : '', 5: store.state.workspaceName === 'marclab' ? 'Label' : '', 6: store.state.workspaceName === 'marclab' ? 'Label' : '',
    });
    const edgeCategory = reactive({
      1: '', 2: '', 3: '', 4: '', 5: '',
    });
    const nodeCategorySelection = reactive({
      1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
    });
    const edgeCategorySelection = reactive({
      1: '', 2: '', 3: '', 4: '', 5: '',
    });
    const nodeQuerySelection = reactive({
      1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
    });

    const nodeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.nodes[0]) : ['No network']));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeCategoryOptions: any = reactive({
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    });
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, values] of Object.entries(nodeCategory)) {
      nodeCategoryOptions[key] = computed(() => ((store.state.network && values) ? store.state.network.nodes.map((n: Node) => n[values]).sort() : ['No attribute selected']));
    }

    const edgeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.edges[0]) : ['No network']));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edgeCategoryOptions: any = reactive({
      1: [], 2: [], 3: [], 4: [], 5: [],
    });
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, values] of Object.entries(edgeCategory)) {
      edgeCategoryOptions[key] = computed(() => ((store.state.network && values) ? store.state.network.edges.map((n: Edge) => n[values]).sort() : ['No attribute selected']));
    }

    function submitQuery() {
      let pathQueryText = '';
      for (let i = 0; i < selectedHops.value + 1; i += 1) {
        if (i === 0) {
          pathQueryText += `FILTER p.vertices[${i}].${nodeCategory[i + 1]} =~ '${nodeCategorySelection[i + 1]}'`;
        } else {
          pathQueryText += ` AND p.vertices[${i}].${nodeCategory[i + 1]} =~ '${nodeCategorySelection[i + 1]}'`;
        }
      }

      const aqlQuery = `let startNodes = (FOR n in [${store.state.nodeTableNames}][**] FILTER n.${nodeCategory[1]} =~ '${nodeCategory[1]}' RETURN n) let paths = (FOR n IN startNodes FOR v, e, p IN 1..${selectedHops.value} ANY n GRAPH '${store.state.networkName}' ${pathQueryText} RETURN {nodes: p.vertices[*], edges: p.edges[*]}) let nodes = (for p in paths RETURN MERGE(p.nodes)) let edges = (for p in paths RETURN MERGE(p.edges)) RETURN {nodes: nodes, edges: edges}`;

      console.log(aqlQuery);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let newAQLNetwork: Promise<any[]> | undefined;
      try {
        newAQLNetwork = api.aql(store.state.workspaceName, aqlQuery);
      } catch (error) {
        if (error.status === 400) {
          store.commit.setLoadError({
            message: error.statusText,
            href: 'https://multinet.app',
          });
        }
      }
      if (newAQLNetwork !== undefined) {
        newAQLNetwork.then((promise) => {
          const aqlNetwork: Network = promise[0];
          console.log(aqlNetwork);
          if (aqlNetwork.nodes.length !== 0) {
          // Update state with new network
            store.commit.setNetwork(aqlNetwork);
          }
        });
      }
    }
    return {
      hopsSelection,
      selectedHops,
      displayedHops,
      nodeQueryOptions,
      edgeQueryOptions,
      nodeCategory,
      edgeCategory,
      nodeCategorySelection,
      edgeCategorySelection,
      nodeQuerySelection,
      nodeCategories,
      nodeCategoryOptions,
      edgeCategories,
      edgeCategoryOptions,
      submitQuery,
    };
  },
};
</script>
