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
    attributeVariables: string[],
  } {
    return {
      network: {
        nodes: [],
        links: [],
      },
      workspace: '',
      graph: '',
      selectNeighbors: true,
      attributeVariables: [],
    };
  },
  computed: {
    variableList(this: any) {
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
    createConnectivity() {
      console.log(this.network)
      this.network = {'nodes':[],'links':[]}
      console.log(this.network)
    }
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
              v-model="attributeVariables"
              :items="variableList"
              label="Node Variables"
              multiple
              chips
              deletable-chips
              hint="Choose the node variables you'd like to visualize"
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

          <v-container fluid class="pt-0 pb-0">
            <v-row class="flex-nowrap">
                <v-card>

                  <v-card-title class="pb-6">Connectivity Matrix Controls</v-card-title>
                    <v-card-text>
                      <v-card-subtitle class="pb-0 px-0" style="display: flex; align-items: center; justify-content: space-between">
                        <v-row class="flex-nowrap">
                          <v-col>
                            <v-select
                              :items="['M','F']"
                              label="Start"
                              chips
                              deletable-chips
                            />
                          </v-col>

                          <v-col>
                            <v-select
                              :items="['3']"
                              label="Hops"
                              chips
                              deletable-chips
                            />
                          </v-col>

                          <v-col>
                            <v-select
                              :items="['M']"
                              label="End"
                              chips
                              deletable-chips
                            />
                          </v-col>
                        </v-row>
                      </v-card-subtitle>
                    </v-card-text>

                    <v-card-actions>
                  <!-- Fix button action -->
                      <v-btn small @click="createConnectivity">Create Connectivity Matrix</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-row>
              </v-container>

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
              attributeVariables,
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
