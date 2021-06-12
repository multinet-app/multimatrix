<template>
  <div class="pa-4">
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
    <v-list class="pa-0">
      <v-list-item-group>
        <v-list-item
          v-for="i in displayedHops"
          :key="i"
        >
          <v-list-item-content
            v-if="i % 2 !== 0"
          >
            <v-row>
              <v-list-item-title>
                Node
              </v-list-item-title>
              <v-autocomplete
                v-model="nodeCategory"
                :items="nodeCategories"
                dense
              />
              <v-autocomplete
                :items="nodeCategoryOptions"
                dense
              />
            </v-row>
          </v-list-item-content>
          <v-list-item-content
            v-else
          >
            <v-row>
              <v-list-item-title>
                Edge
              </v-list-item-title>
              <v-autocomplete
                v-model="edgeCategory"
                :items="edgeCategories"
                dense
              />
              <v-autocomplete
                :items="edgeCategoryOptions"
                dense
              />
            </v-row>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import store from '@/store';
import { Node, Edge } from '@/types';
import { computed, ref, Ref } from '@vue/composition-api';

export default {
  name: 'ConnectivityQuery',

  setup() {
    const hopsSelection = [1, 2, 3, 4, 5];
    const nodeQueryOptions: Ref<string[]> = ref([]);
    const edgeQueryOptions: Ref<string[]> = ref([]);
    const nodeCategory: Ref<string> = ref('');
    const edgeCategory: Ref<string> = ref('');
    const selectedHops: Ref<number> = ref(1);
    const displayedHops = computed(() => (selectedHops.value % 2 !== 0 ? selectedHops.value + 2 : selectedHops.value + 3));

    const nodeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.nodes[0]) : 'No attribute selected'));
    const nodeCategoryOptions = computed(() => ((store.state.network && nodeCategory.value) ? store.state.network.nodes.map((n: Node) => n[nodeCategory.value]).sort() : 'No network'));

    const edgeCategories = computed(() => (store.state.network ? Object.keys(store.state.network.edges[0]) : 'No attribute selected'));
    const edgeCategoryOptions = computed(() => ((store.state.network && edgeCategory.value) ? store.state.network.edges.map((n: Edge) => n[edgeCategory.value]).sort() : 'No network'));

    return {
      hopsSelection,
      nodeQueryOptions,
      edgeQueryOptions,
      nodeCategory,
      edgeCategory,
      displayedHops,
      nodeCategories,
      nodeCategoryOptions,
      edgeCategories,
      edgeCategoryOptions,
    };
  },
};
</script>
