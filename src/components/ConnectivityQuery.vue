<template>
  <div class="pa-0">
    <v-row>
      <v-col class="pa-0">
        <v-subheader> Hops</v-subheader>
      </v-col>
      <v-col class="pa-0">
        <v-select
          v-model="selectedHops"
          :items="hopsSelection"
        />
      </v-col>
    </v-row>
    <v-list dense>
      <v-list-item>
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeCategory1"
                :items="nodeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeCategorySelection1"
                :items="nodeCategoryOptions1"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-row class="pa-2">
            <v-col>
              <v-list-item-title>
                Edge
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeCategory1"
                :items="edgeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeCategorySelection1"
                :items="edgeCategoryOptions1"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeCategory2"
                :items="nodeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeCategorySelection2"
                :items="nodeCategoryOptions2"
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
import { computed, ref, Ref } from '@vue/composition-api';
import api from '@/api';

export default {
  name: 'ConnectivityQuery',

  setup() {
    const hopsSelection = [1, 2, 3, 4, 5];
    const nodeQueryOptions: Ref<string[]> = ref([]);
    const edgeQueryOptions: Ref<string[]> = ref([]);
    const nodeCategory1: Ref<string> = ref('');
    const nodeCategory2: Ref<string> = ref('');
    const edgeCategory1: Ref<string> = ref('');
    const nodeCategorySelection1: Ref<string> = ref('');
    const nodeCategorySelection2: Ref<string> = ref('');
    const edgeCategorySelection1: Ref<string> = ref('');
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => (selectedHops.value % 2 !== 0 ? selectedHops.value + 2 : selectedHops.value + 3));

    const nodeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.nodes[0]) : ['No attribute selected']));
    const nodeCategoryOptions1 = computed(() => ((store.state.network && nodeCategory1.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory1.value]).sort() : ['No network']));
    const nodeCategoryOptions2 = computed(() => ((store.state.network && nodeCategory2.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory2.value]).sort() : ['No network']));

    const edgeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.edges[0]) : ['No attribute selected']));
    const edgeCategoryOptions1 = computed(() => ((store.state.network && edgeCategory1.value) ? store.state.network.edges.map((n: Edge) => n[edgeCategory1.value]).sort() : ['No network']));

    function submitQuery() {
      // TODO: add ability to filter many nodes
      // Subsets network based on known nodes...
      const aqlQuery = `let nodes = (FOR n in [${store.state.nodeTableNames}][**] FILTER n.${nodeCategory1.value} == '${nodeCategorySelection1.value}'
      || n.${nodeCategory2.value} == '${nodeCategorySelection2.value}' RETURN n) let edges = (FOR e in ${store.state.edgeTableName} filter e._from in nodes[**]._id && e._to in nodes[**]._id RETURN e) 
      RETURN {"nodes": nodes[**], edges}`;
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
      nodeQueryOptions,
      edgeQueryOptions,
      nodeCategory1,
      nodeCategory2,
      edgeCategory1,
      selectedHops,
      nodeCategorySelection1,
      nodeCategorySelection2,
      edgeCategorySelection1,
      displayedHops,
      nodeCategories,
      nodeCategoryOptions1,
      nodeCategoryOptions2,
      edgeCategories,
      edgeCategoryOptions1,
      submitQuery,
    };
  },
};
</script>
