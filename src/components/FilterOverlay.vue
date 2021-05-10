<template>
  <div>
    <v-row
      align="center"
      justify="center"
    >
      <v-overlay
        absolute
      >
        <v-card>
          <v-card-title>Action Needed</v-card-title>
          <v-card-text>
            The network you are loading is too large and additional
            parameters are required to visualize. Consider one of the
            following:
          </v-card-text>
          <v-card>
            <v-divider />
            <v-card-text>
              <div>Choose a random subset of nodes</div>
              <v-slider
                v-model="subsetAmount"
                :max="100"
                :min="10"
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
            tile
            @click="filterNetwork"
          >
            Filter Network
          </v-btn>
        </v-card>
      </v-overlay>
    </v-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import api from '@/api';
import { Network, Node } from '@/types';
import store from '@/store';

export default Vue.extend({
  data: () => ({
    subsetAmount: 0,
  }),

  computed: {
    nodeTables() {
      return store.state.nodeTableNames;
    },
    workspace() {
      return store.state.workspaceName;
    },
  },

  methods: {
    filterNetwork() {
      if (this.workspace === null) {
        return;
      }

      const aqlQuery = `let nodes = (FOR n in ${store.state.nodeTableNames}[**] LIMIT ${this.subsetAmount} RETURN n) let edges = (FOR e in ${store.state.edgeTableName} filter e._from in nodes[**]._id && e._to in nodes[**]._id RETURN e) 
      RETURN {"nodes": nodes[**], edges}`;

      const newTablePromise = api.aql(this.workspace, aqlQuery);

      newTablePromise.then((promise) => {
        const aqlNetwork: Network = Object.assign(promise)[0];

        if (aqlNetwork.nodes.length !== 0) {
          // Update state with new network
          store.commit.setNetwork(aqlNetwork);
          store.commit.setLoadError({
            message: '',
            href: '',
          });
        } else {
          store.commit.setLoadError({
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          });
        }
      });
    },
  },
});
</script>
