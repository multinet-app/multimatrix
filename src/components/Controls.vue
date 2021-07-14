<script lang="ts">
import { select } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import store from '@/store';
import AboutDialog from '@/components/AboutDialog.vue';
import LoginMenu from '@/components/LoginMenu.vue';
import ConnectivityQuery from '@/components/ConnectivityQuery.vue';
import { computed, ref, watchEffect } from '@vue/composition-api';

export default {
  components: {
    AboutDialog,
    LoginMenu,
    ConnectivityQuery,
  },

  setup() {
    // Template objects
    const connectivityQueryToggle = ref(false);
    const aggregateBy = ref('none');
    const directionalEdges = computed({
      get() {
        return store.state.directionalEdges;
      },
      set(value: boolean) {
        store.commit.setDirectionalEdges(value);
      },
    });
    const selectNeighbors = computed({
      get() {
        return store.state.selectNeighbors;
      },
      set(value: boolean) {
        store.commit.setSelectNeighbors(value);
      },
    });
    const showGridLines = computed({
      get() {
        return store.state.showGridLines;
      },
      set(value: boolean) {
        store.commit.setShowGridlines(value);
      },
    });
    const aggregated = computed(() => store.state.aggregated);
    const cellColorScale = computed(() => store.getters.cellColorScale);
    const parentColorScale = computed(() => store.getters.parentColorScale);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const maxConnections = computed(() => store.state.maxConnections);

    // Non-template objects
    const network = computed(() => store.state.network);

    function exportNetwork() {
      if (network.value === null) {
        return;
      }

      const networkToExport = {
        nodes: network.value.nodes.map((node) => {
          const newNode = { ...node };
          newNode.id = newNode._key;
          delete newNode._key;

          return newNode;
        }),
        links: network.value.edges.map((edge) => {
          const newEdge = { ...edge };
          newEdge.source = `${edge._from.split('/')[1]}`;
          newEdge.target = `${edge._to.split('/')[1]}`;
          return newEdge;
        }),
      };

      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(networkToExport)], {
          type: 'text/json',
        }),
      );
      a.download = `${store.state.networkName}.json`;
      a.click();
    }

    function updateLegend(colorScale: ScaleLinear<string, number>, legendName: 'parent' | 'unAggr') {
      let legendSVG;
      if (legendName === 'parent') {
        legendSVG = select('#parent-matrix-legend');
      } else {
        legendSVG = select('#matrix-legend');
      }

      // construct the legend and format the labels to have 0 decimal places
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legendLinear = (legendColor() as any)
        .shapeWidth(20)
        .cells(colorScale.domain()[1] >= 5 ? 5 : colorScale.domain()[1] + 1)
        .orient('horizontal')
        .scale(colorScale)
        .labelFormat(format('.0f'));

      legendSVG.select('.legendLinear').call(legendLinear);
    }

    watchEffect(() => updateLegend(cellColorScale.value, 'unAggr'));
    watchEffect(() => updateLegend(parentColorScale.value, 'parent'));
    watchEffect(() => {
      console.log('triggered');
      if (!aggregated.value) {
        aggregateBy.value = 'none';
      }
    });

    function toggleProvVis() {
      store.commit.toggleShowProvenanceVis();
    }

    function aggregateNetwork(varName: string) {
      store.dispatch.aggregateNetwork(varName);
    }

    return {
      connectivityQueryToggle,
      aggregateBy,
      directionalEdges,
      selectNeighbors,
      showGridLines,
      aggregated,
      cellColorScale,
      parentColorScale,
      nodeVariableItems,
      maxConnections,
      exportNetwork,
      updateLegend,
      toggleProvVis,
      aggregateNetwork,
    };
  },
};
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
      <v-toolbar color="grey lighten-2">
        <v-toolbar-title
          class="d-flex align-center"
          flat
        >
          <div>
            <v-row class="mx-0 align-center">
              <v-col class="pb-0 pt-2 px-0">
                <img
                  class="app-logo"
                  src="../assets/logo/app_logo.svg"
                  alt="Multinet"
                  width="100%"
                >
              </v-col>
              <v-col class="text-left">
                MultiMatrix
              </v-col>
              <v-col class="pa-0">
                <about-dialog />
              </v-col>
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <login-menu />
      </v-toolbar>

      <v-list class="pa-0">
        <v-subheader class="grey darken-3 py-0 white--text">
          Controls
        </v-subheader>

        <div class="pa-4">
          <!-- Auto-Select Neighbors List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="selectNeighbors"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
          </v-list-item>

          <!-- Gridline Toggle List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="showGridLines"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Show GridLines </v-list-item-content>
          </v-list-item>

          <!-- Directional Edges Toggle Card -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="directionalEdges"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Directional Edges </v-list-item-content>
          </v-list-item>

          <!-- Connectivity Query List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="connectivityQueryToggle"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Enable Connectivity Query </v-list-item-content>
          </v-list-item>

          <!-- Aggregation Variable Selection -->
          <v-list-item
            class="pa-0 ma-0"
          >
            <v-list-item-content class="pa-0 ma-0">
              <v-autocomplete
                v-model="aggregateBy"
                class="pa-0 ma-0"
                :items="['none', ...nodeVariableItems]"
                hint="Variable to aggregate by"
                persistent-hint
                @change="aggregateNetwork"
              />
            </v-list-item-content>
          </v-list-item>

          <v-list-item class="px-0">
            <v-btn
              block
              class="ml-0 mt-4"
              color="primary"
              depressed
              @click="exportNetwork"
            >
              Export Network
            </v-btn>
          </v-list-item>

          <v-list-item class="px-0">
            <v-btn
              block
              class="ml-0 mt-4"
              color="primary"
              depressed
              @click="toggleProvVis"
            >
              Provenance Vis
            </v-btn>
          </v-list-item>
        </div>

        <v-subheader class="grey darken-3 mt-6 py-0 white--text">
          Color Scale Legend
        </v-subheader>

        <div class="pa-4">
          <!-- Aggregated Matrix Legend -->
          <v-list-item
            v-if="aggregated"
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            Aggregate Legend
            <svg id="parent-matrix-legend">
              <g
                class="legendLinear"
                transform="translate(10, 60)"
              />
            </svg>
          </v-list-item>

          <!-- Matrix Legend -->
          <v-list-item
            class="pb-0 px-0"
            :style="`display: flex; max-height: 50px; opacity: ${maxConnections.unAggr > 0 ? 1 : 0}`"
          >
            {{ aggregated ? 'Child Legend' : 'Matrix Legend' }}
            <svg id="matrix-legend">
              <g
                class="legendLinear"
                transform="translate(10, 60)"
              />
            </svg>
          </v-list-item>
        </div>
        <div v-if="connectivityQueryToggle">
          <v-subheader class="grey darken-3 mt-6 py-0 white--text">
            Connectivity Query
          </v-subheader>

          <div class="pa-4">
            <connectivity-query />
          </div>
        </div>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.app-logo {
  width: 36px;
}
</style>
