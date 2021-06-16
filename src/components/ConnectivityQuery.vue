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
      <v-list-item class="pa-0">
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node 1
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
                v-model="nodeQuerySelection1"
                :items="nodeQueryOptions"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="nodeQuerySelection1 === 'is (exact)'"
                v-model="nodeCategorySelection1"
                :items="nodeCategoryOptions1"
                dense
              />
              <v-text-field
                v-else
                v-model="nodeCategorySelection1"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="pa-0">
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Edge 1
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
      <v-list-item class="pa-0">
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node 2
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
                v-model="nodeQuerySelection2"
                :items="nodeQueryOptions"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="nodeQuerySelection2 === 'is (exact)'"
                v-model="nodeCategorySelection2"
                :items="nodeCategoryOptions2"
                dense
              />
              <v-text-field
                v-else
                v-model="nodeCategorySelection2"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
      </v-list-item>
      <v-list-item
        v-if="selectedHops > 1"
        class="pa-0"
      >
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Edge 2
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeCategory2"
                :items="edgeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="edgeCategorySelection2"
                :items="edgeCategoryOptions2"
                dense
              />
            </v-col>
          </v-row>
        </v-list-item-content>
      </v-list-item>
      <v-list-item
        v-if="selectedHops > 1"
        class="pa-0"
      >
        <v-list-item-content>
          <v-row class="pa-0">
            <v-col>
              <v-list-item-title>
                Node 3
              </v-list-item-title>
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeCategory3"
                :items="nodeCategories"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-model="nodeQuerySelection3"
                :items="nodeQueryOptions"
                dense
              />
            </v-col>
            <v-col class="pa-2">
              <v-autocomplete
                v-if="nodeQuerySelection3 === 'is (exact)'"
                v-model="nodeCategorySelection3"
                :items="nodeCategoryOptions3"
                dense
              />
              <v-text-field
                v-else
                v-model="nodeCategorySelection3"
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
    const hopsSelection = [1, 2];
    const nodeQueryOptions = ['is (exact)', 'contains'];
    const edgeQueryOptions: Ref<string[]> = ref([]);
    const nodeCategory1: Ref<string> = ref('');
    const nodeCategory2: Ref<string> = ref('');
    const nodeCategory3: Ref<string> = ref('');
    const edgeCategory1: Ref<string> = ref('');
    const nodeCategorySelection1: Ref<string> = ref('');
    const nodeQuerySelection1: Ref<string> = ref('');
    const nodeCategorySelection2: Ref<string> = ref('');
    const nodeQuerySelection2: Ref<string> = ref('');
    const nodeCategorySelection3: Ref<string> = ref('');
    const nodeQuerySelection3: Ref<string> = ref('');
    const edgeCategorySelection1: Ref<string> = ref('');
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => (selectedHops.value % 2 !== 0 ? selectedHops.value + 2 : selectedHops.value + 3));

    const nodeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.nodes[0]) : ['No network']));
    const nodeCategoryOptions1 = computed(() => ((store.state.network && nodeCategory1.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory1.value]).sort() : ['No attribute selected']));
    const nodeCategoryOptions2 = computed(() => ((store.state.network && nodeCategory2.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory2.value]).sort() : ['No attribute selected']));
    const nodeCategoryOptions3 = computed(() => ((store.state.network && nodeCategory3.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory3.value]).sort() : ['No attribute selected']));

    const edgeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.edges[0]) : ['No network']));
    const edgeCategoryOptions1 = computed(() => ((store.state.network && edgeCategory1.value) ? store.state.network.edges.map((n: Edge) => n[edgeCategory1.value]).sort() : ['No attribute selected']));

    function submitQuery() {
      // TODO: add ability to filter many nodes
      // Subsets network based on known nodes...
      const aqlQuery = `let nodes = (FOR n in [${store.state.nodeTableNames}][**] FILTER n.${nodeCategory1.value} == '${nodeCategorySelection1.value}'
      || n.${nodeCategory2.value} == '${nodeCategorySelection2.value}' RETURN n) let edges = (FOR e in ${store.state.edgeTableName} FILTER e._from in nodes[**]._id && e._to in nodes[**]._id && e.${edgeCategory1.value} == '${edgeCategorySelection1.value}'  RETURN e) 
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
      nodeCategory3,
      edgeCategory1,
      selectedHops,
      nodeCategorySelection1,
      nodeQuerySelection1,
      nodeCategorySelection2,
      nodeQuerySelection2,
      nodeCategorySelection3,
      nodeQuerySelection3,
      edgeCategorySelection1,
      displayedHops,
      nodeCategories,
      nodeCategoryOptions1,
      nodeCategoryOptions2,
      nodeCategoryOptions3,
      edgeCategories,
      edgeCategoryOptions1,
      submitQuery,
    };
  },
};
</script>
