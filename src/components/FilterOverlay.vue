<template>
  <div>
    <v-app>
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
                  :max="300"
                  :min="100"
                  step="10"
                  ticks
                  thumb-label
                  thumb-color="primary"
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
              color="primary"
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
import api from '@/api';
import {
  Network, Link, Node,
} from '@/types';
import store from '@/store';

export default {
  data: () => ({
    overlay: true,
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
        const nodeChecker: Set<string> = new Set();
        promise.forEach((path) => {
          path.vertices.forEach((node: Node) => {
            nodeChecker.add(node._id);
          });
        });

        // create network in json format
        promise.forEach((path) => {
          path.vertices.forEach((node: Node) => {
            if (nodeChecker.has(node._id)) {
              aqlNetwork.nodes.push(node);
              nodeChecker.delete(node._id);
            }
          });
          path.edges.map((edge: Link) => aqlNetwork.edges.push(edge));
        });

        // Update state with new network
        store.commit.setNetwork(aqlNetwork);
      });
    },
  },
};

</script>
