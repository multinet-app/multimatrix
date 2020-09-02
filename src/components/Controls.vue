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
    networkName: string,
    selectNeighbors: boolean,
    visualizedAttributes: string[],
    nodeEditor: boolean,
    connectivity: any,
  } {
    return {
      network: {
        nodes: [],
        links: [],
      },
      workspace: '',
      networkName: '',
      selectNeighbors: true,
      visualizedAttributes: [],
      nodeEditor: false,
      connectivity: {
        node1: {
          type: '',
          value: '',
        },
        hop: {
          type: '',
          operator: '',
          value: '',
        },
        node2: {
          type: '',
          value: '',
        },
      },
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
    const { workspace, networkName, host } = getUrlVars();
    if (!workspace || !networkName) {
      throw new Error(
        `Workspace and network must be set! workspace=${workspace} network=${networkName}`,
      );
    }
    this.network = await loadData(workspace, networkName, host);
    this.workspace = workspace;
    this.networkName = networkName;
  },

  methods: {
    exportNetwork() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.network)], {
        type: `text/json`,
      }));
      a.download = `${this.networkName}.json`;
      a.click();
    },
  },
});
</script>

<template>
  <div>
    <v-navigation-drawer
      app
      class="app-sidebar"
      fixed
      permanent
      stateless
      value="true"
    >
      <v-toolbar
        color="grey lighten-2"
      >
        <v-toolbar-title class="d-flex align-center">
          <div>
            <v-row class="mx-0 align-center">
              <v-col
                class="app-logo pb-0 pt-2 px-0"
                cols="3"
              >
                <img
                  src="../assets/logo/app_logo.svg"
                  alt="Multinet"
                  width="100%"
                >
              </v-col>
              <v-col class="multinet-title text-left" cols="3">
                Multinet<br>
                <small>Adjacency Matrix</small>
              </v-col>
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <!-- login-menu / -->
      </v-toolbar>
      <v-list class="pa-0">
        <v-subheader class="grey darken-3 py-0 white--text">
          Nodes
          <v-spacer />
          <template>
            <v-tooltip right>
              <template v-slot:activator="{ on }">
                <v-btn
                  dark
                  icon
                  small
                  @click="nodeEditor = !nodeEditor"
                  v-on="on"
                >
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
              </template>
              <span>Manage nodes/edges</span>
            </v-tooltip>

            <v-bottom-sheet
              attach=".app-sidebar"
              hide-overlay
              v-model="nodeEditor"
            >
              <v-card
                class="add-hops"
                tile
              >
                <v-card-title class="px-3 subtitle-2">
                  Manage Nodes/Edges
                </v-card-title>
                <v-card-text class="pt-2 px-0">
                  <div class="hops-number px-3">
                    <v-text-field
                      dense
                      hide-details
                      label="Number of Hops"
                      outlined
                      type="number"
                      value="1"
                    />
                  </div>
                  <v-expansion-panels
                    class="manage-panels pt-3"
                    flat
                  >
                    <v-expansion-panel class="ma-0">
                      <v-divider />
                      <v-expansion-panel-header>
                        Node 1
                        <v-spacer />
                        <div class="panel-icons">
                          <v-icon
                            class="float-right"
                            color="amber"
                            size="20"
                          >
                            mdi-alert
                          </v-icon>
                        </div>
                      </v-expansion-panel-header>
                      <v-expansion-panel-content>
                        <v-row class="py-0">
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.node1.type"
                              dense
                              hide-details
                              outlined
                              label="Node Type"
                              items="Origin"
                            ></v-select>
                          </v-col>
                        </v-row>
                        <v-row class="py-0">
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.node1.value"
                              dense
                              hide-details
                              outlined
                              label="Value"
                              :items="['Any', 'SLC']"
                            ></v-select>
                          </v-col>
                        </v-row>
                      </v-expansion-panel-content>
                    </v-expansion-panel>

                    <v-expansion-panel class="ma-0">
                      <v-divider />
                      <v-expansion-panel-header>
                        Hop 1-2
                        <v-spacer />
                        <div class="panel-icons">
                          <v-icon
                            class="float-right"
                            color="amber"
                            size="20"
                          >
                            mdi-alert
                          </v-icon>
                        </div>
                      </v-expansion-panel-header>
                      <v-expansion-panel-content>
                        <v-row class="py-0">
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.hop.type"
                              dense
                              hide-details
                              outlined
                              label="Edge Type"
                              :items="['Airline', 'Average Dep. Delay']"
                            ></v-select>
                          </v-col>
                        </v-row>
                        <v-row class="py-0">
                          <v-col
                            class="pa-2"
                            cols="5"
                          >
                            <v-select
                              v-model="connectivity.hop.operator"
                              dense
                              hide-details
                              outlined
                              label="<"
                              :items="['<', '=']"
                            ></v-select>
                          </v-col>
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.hop.value"
                              dense
                              hide-details
                              outlined
                              label="Value"
                              :items="['AA', '30']"
                            ></v-select>
                          </v-col>
                        </v-row>
                      </v-expansion-panel-content>
                    </v-expansion-panel>

                    <v-expansion-panel class="ma-0">
                      <v-divider />
                      <v-expansion-panel-header>
                        Node 2
                        <v-spacer />
                        <div class="panel-icons">
                          <v-icon
                            class="float-right"
                            color="amber"
                            size="20"
                          >
                            mdi-alert
                          </v-icon>
                        </div>
                      </v-expansion-panel-header>
                      <v-expansion-panel-content>
                        <v-row class="py-0">
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.node2.type"
                              dense
                              hide-details
                              outlined
                              label="Node Type"
                              items="Destination"
                            ></v-select>
                          </v-col>
                        </v-row>
                        <v-row class="py-0">
                          <v-col class="pa-2">
                            <v-select
                              v-model="connectivity.node2.value"
                              dense
                              hide-details
                              outlined
                              label="Value"
                              items="JFK"
                            ></v-select>
                          </v-col>
                        </v-row>
                      </v-expansion-panel-content>
                    </v-expansion-panel>
                  </v-expansion-panels>
                  <v-divider />
                </v-card-text>
                <v-card-actions class="pa-3">
                  <!-- DERYA -->
                  <v-btn
                    v-on:click="connectivityExample(connectivity)"
                    color="primary"
                    block
                    depressed
                    large
                  >
                    Save
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-bottom-sheet>
          </template>
        </v-subheader>
        <v-list-item class="node pb-2 pt-3">
          <v-list-item-icon class="mr-3">
            <span class="blue lighten-5 row-number blue--text text--darken-2">
              1
            </span>
          </v-list-item-icon>
          <v-list-item-content class="pt-2">
            <v-select
              dense
              hide-details
              outlined
              label="Rows"
            ></v-select>
          </v-list-item-content>
        </v-list-item>

        <v-divider />

        <v-list-item class="edge grey lighten-4">
          <v-list-item-content>
            All edges <small>Use node/edge manager to specify filters.</small>
          </v-list-item-content>
        </v-list-item>

        <v-divider />

        <v-list-item class="node pb-2 pt-3">
          <v-list-item-icon class="mr-3">
            <span class="blue lighten-5 row-number blue--text text--darken-2">
              2
            </span>
          </v-list-item-icon>
          <v-list-item-content class="pt-2">
            <v-select
              dense
              hide-details
              outlined
              label="Columns"
            ></v-select>
          </v-list-item-content>
        </v-list-item>

        <v-divider />

      </v-list>
      <v-overlay
        absolute
        v-if="nodeEditor"
      />
    </v-navigation-drawer>

    <!-- AdjMatrix component -->
    <v-col class="ma-0 pl-0 pr-0">
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
  </div>
</template>

<style scoped>
.app-logo {
  width: 48px;
}

.row-number {
  align-items: center;
  border-radius: 100px;
  display: flex;
  font-size: 12px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.workspaces {
  /* 171px = height of app-bar + workspace button + list subheader */
  height: calc(100vh - 171px);
  overflow-y:scroll;
}

.workspace-icon {
  opacity: .4;
}

sm {
  font-size: 10px;
  font-weight: 300;
  font-style: italic;
}

.v-card {
  max-height: calc(100vh - 24px);
}

.manage-panels {
  max-height: 450px;
  overflow-y: auto;
}

.manage-panels .v-expansion-panel:nth-child(odd) {
  background: #f7f7f7;
}

.panel-icons {
  width: 24px !important;
}

.multinet-title {
  line-height: .7em;
  padding-top: 16px;
}
</style>

<style>
.app-sidebar .v-navigation-drawer__content {
  overflow: hidden;
}
.add-hops {
  border-right: 1px solid #ccc !important;
}
</style>
