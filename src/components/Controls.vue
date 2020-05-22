<script lang='ts'>
import Vue from 'vue';
import AdjMatrix from '@/components/AdjMatrix/AdjMatrix.vue';

import { getUrlVars } from '@/lib/utils';
import { loadData } from '@/lib/multinet';
import { Network } from '@/types';

export default Vue.extend({
  components: {
    AdjMatrix,
  },

  data(): {
    network: Network,
    workspace: string,
    graph: string,
    selectNeighbors: boolean,
    visualizedAttributes: string[],
  } {
    return {
      network: {
        nodes: [],
        links: [],
      },
      workspace: '',
      graph: '',
      selectNeighbors: true,
      visualizedAttributes: [],
    };
  },

  computed: {
    attributeList(this: any) {
      if (typeof this.network.nodes[0] !== 'undefined') {
        return Object.keys(this.network.nodes[0]);
      } else {
        return [];
      }
    },
  },

  async mounted() {
    const { workspace, graph } = getUrlVars();
    if (!workspace || !graph) {
      throw new Error(
        `Workspace and graph must be set! workspace=${workspace} graph=${graph}`,
      );
    }
    this.network = await loadData(workspace, graph);
    this.workspace = workspace;
    this.graph = graph;
  },

  methods: {
    exportGraph() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.network)], {
        type: `text/json`,
      }));
      a.download = 'graph.json';
      a.click();
    },
  },
});
</script>

<template>
  <v-container fluid class="pt-0 pb-0">
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col cols="3">
        <v-card>
          <v-card-title class="pb-6">MultiNet Adjacency Matrix Controls</v-card-title>
          <v-card-text>

            <v-select
              v-model="visualizedAttributes"
              :items="attributeList"
              label="Node Attributes"
              multiple
              chips
              deletable-chips
              hint="Choose the node attributes you'd like to visualize"
              persistent-hint
            />

            <v-card-subtitle class="pb-0 px-0" style="display: flex; align-items: center; justify-content: space-between">
              Autoselect neighbors
              <v-switch
                class="ma-0"
                v-model="selectNeighbors"
                hide-details
              />
            </v-card-subtitle>
          </v-card-text>

          <v-card-actions>
            <v-btn small @click="exportGraph">Export Graph</v-btn>
          </v-card-actions>
        </v-card>

      </v-col>

      <!-- AdjMatrix component -->
      <v-col>
        <v-row row wrap class="ma-0 pa-0">
          <adj-matrix
            ref="adjmatrix"
            v-if="workspace"
            v-bind="{
              network,
              selectNeighbors,
              visualizedAttributes,
            }"
            @restart-simulation="hello()"
            />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .v-card {
    max-height: calc(100vh - 24px);
  }
</style>
