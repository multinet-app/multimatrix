<template>
  <div id="dialog">
    <v-app id="filterOverlayDialog">
      <v-row
        align="center"
        justify="center"
      >
        <v-overlay
          absolute
          :value="overlay"
        >
          <v-card>
            <v-list>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>Action Needed</v-list-item-title>
                  The network you are loading is too large and additional
                  parameters are required to visualize. Consider one of the
                  following:
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-card>
              <v-divider />
              <v-card-text>
                <div>Choose a random subset of edges</div>
                <v-slider
                  v-model="subsetAmount"
                  :max="max"
                  :min="min"
                  step="10"
                  :ticks="true"
                  thumb-label
                >
                  <v-text-field
                    v-model="subsetAmount"
                    class="mt-0 pt-0"
                    hide-details
                    single-line
                    type="number"
                    style="width: 60px"
                  />
                </v-slider>
              </v-card-text>
              <v-divider />
            </v-card>

            <v-btn
              class="white--text"
              color="teal"
              @click="filterNetwork"
            >
              Filter Network
            </v-btn>
          </v-card>
        </v-overlay>
      </v-row>
    </v-app>
  </div>
</template>

<script lang="ts">
/* eslint-disable no-restricted-syntax */
import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';
import api from '@/api';
import {
  Network, State, Link,
} from '@/types';
import store from '@/store';

Vue.use(Vuex);

export default Vue.extend({
  data: () => ({
    overlay: true,
    zIndex: 0,
    min: 10,
    max: 300,
    subsetAmount: 0,
  }),

  computed: {
    nodeTable() { return store.state.nodeTableName; },
    workspace() { return store.state.workspaceName; },
  },

  methods: {
    filterNetwork() {
      if (this.workspace === null) {
        return;
      }

      this.overlay = false;
      const aqlQuery = `FOR nodes in ${this.nodeTable} LIMIT ${this.subsetAmount} FOR v,e,p in 1..4 ANY nodes GRAPH '${this.workspace}' LIMIT ${this.subsetAmount} RETURN p`;

      const newTablePromise = api.aql(this.workspace, aqlQuery);

      newTablePromise.then((promise) => {
        const aqlNetwork: Network = { nodes: [], edges: [] };
        // check for duplicates
        const nodeChecker: string[] = [];
        for (const path of promise) {
          for (const arr of path.vertices) {
            if (!nodeChecker.includes(arr._key)) {
              nodeChecker.push(arr._key);
            }
          }
        }
        // create network in json format
        for (const path of promise) {
          for (const arr of path.vertices) {
            if (nodeChecker.includes(arr._key)) {
              arr.id = arr._id;
              aqlNetwork.nodes.push(arr);
              nodeChecker.splice(nodeChecker.indexOf(arr._key), 1);
            }
          }
          path.edges.map((arr: Link) => aqlNetwork.edges.push(arr));
        }
        // Update state with new network
        store.commit.setNetwork(aqlNetwork);
      });
    },
  },
});

</script>
