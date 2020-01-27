<script lang='ts'>
import AdjMatrix from '@/components/AdjMatrix/AdjMatrix.vue';

import { setUpProvenance } from '@/lib/provenance';
import { getUrlVars } from '@/lib/utils';
import { loadData } from '@/lib/multinet';

export default {
  components: {
    AdjMatrix,
  },

  data(): {
    app: { currentState: () => {} }|undefined,
    provenance: any,
    graphStructure: any,
    workspace: any,
    graph: any,
    selectNeighbors: boolean,
    searchQuery: any,
  } {
    return {
      app: undefined,
      provenance: null,
      graphStructure: {
        nodes: [],
        links: [],
      },
      workspace: null,
      graph: null,
      selectNeighbors: true,
      searchQuery: null,
    };
  },

  computed: {
  },

  async mounted() {
    const { workspace, graph } = getUrlVars();
    if (!workspace || !graph) {
      throw new Error(
        `Workspace and graph must be set! workspace=${workspace} graph=${graph}`,
      );
    }
    this.graphStructure = await loadData(workspace, graph);
    const { provenance, app } = setUpProvenance(this.graphStructure.nodes);
    this.app = app;
    this.provenance = provenance;
    this.workspace = workspace;
    this.graph = graph;
  },

  methods: {
    exportGraph() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.graphStructure)], {
        type: `text/json`,
      }));
      a.download = 'graph.json';
      a.click();
    },
  },
};
</script>

<template>
  <v-container fluid>
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col class="mt-4" cols="3">
        <v-card>
          <v-card-title class="pb-6">MultiNet Adjacency Matrix Controls</v-card-title>
          <v-card-text>
              
            <v-text-field
              label="Search for a node"
              v-model="searchQuery"
            ></v-text-field>

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
              graphStructure,
              provenance,
              app,
              selectNeighbors,
            }"
            @restart-simulation="hello()"
            />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>
