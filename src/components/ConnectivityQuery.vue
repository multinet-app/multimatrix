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
          <v-list-item-content>
            <v-list-item-title
              v-if="i % 2 !== 0"
            >
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
          </v-list-item-content>
          <v-list-item-content>
            <v-list-item-title
              v-if="i % 2 === 0"
            >
              Edge
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import store from '@/store';
import { Node } from '@/types';

export default Vue.extend({
  data() {
    return {
      hopsSelection: [1, 2, 3, 4, 5],
      nodeQueryOptions: ['contains', 'matches exactly'],
      nodeCategory: '',
    };
  },
  computed: {
    selectedHops: {
      get() {
        return store.state.selectedHops;
      },
      set(value: number) {
        store.commit.setSelectedHops(value);
      },
    },
    displayedHops() {
      if (store.state.selectedHops % 2 !== 0) { return store.state.selectedHops + 2; } return store.state.selectedHops + 3;
    },
    nodeCategories() {
      if (store.state.network) { return Object.keys(store.state.network.nodes[0]); } return 'No network';
    },
    nodeCategoryOptions() {
      if (store.state.network) { return store.state.network.nodes.map((n: Node) => n.nodeCategory); } return 'No network';
    },
  },

});
</script>
