<script lang="ts">
import { select } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import store from '@/store';
import AboutDialog from '@/components/AboutDialog.vue';
import LoginMenu from '@/components/LoginMenu.vue';
import ConnectivityQuery from '@/components/ConnectivityQuery.vue';
import {
  computed, defineComponent, ref, watch, watchEffect,
} from '@vue/composition-api';
import { internalFieldNames, Node } from '@/types';

export default defineComponent({
  components: {
    AboutDialog,
    LoginMenu,
    ConnectivityQuery,
  },

  setup() {
    // Template objects
    const aggregateBy = ref(undefined);
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
    const cellSize = computed({
      get() {
        return store.state.cellSize;
      },
      set(value: number) {
        store.commit.setCellSize(value);
      },
    });
    const labelVariable = computed({
      get() {
        return store.state.labelVariable;
      },
      set(value: string | undefined) {
        store.commit.setLabelVariable(value);
      },
    });
    const aggregated = computed(() => store.state.aggregated);
    const cellColorScale = computed(() => store.getters.cellColorScale);
    const parentColorScale = computed(() => store.getters.parentColorScale);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const maxConnections = computed(() => store.state.maxConnections);

    // Intermediate node table template objects
    const showIntNodeVis = computed(() => store.state.showIntNodeVis);
    const intAggregatedBy = computed({
      get() {
        return store.state.intAggregatedBy;
      },
      set(value: string | undefined) {
        store.commit.setIntAggregatedBy(value);
      },
    });
    const maxIntConnections = computed(() => store.state.maxIntConnections);
    const intTableColorScale = computed(() => store.getters.intTableColorScale);

    // Non-template objects
    const network = computed(() => store.state.network);

    const multiVariableList = computed(() => {
      if (network.value !== null) {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        network.value.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
        allVars.delete('vx');
        allVars.delete('vy');
        allVars.delete('x');
        allVars.delete('y');
        allVars.delete('index');
        return allVars;
      }
      return new Set();
    });

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

    function updateLegend(colorScale: ScaleLinear<string, number>, legendName: 'parent' | 'unAggr' | 'intTable') {
      let legendSVG;
      if (legendName === 'parent') {
        legendSVG = select('#parent-matrix-legend');
      } else if (legendName === 'unAggr') {
        legendSVG = select('#matrix-legend');
      } else {
        legendSVG = select('#int-matrix-legend');
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
    watchEffect(() => updateLegend(intTableColorScale.value, 'intTable'));
    watchEffect(() => {
      if (!aggregated.value) {
        aggregateBy.value = undefined;
      }
    });
    watch(aggregated, () => {
      if (!aggregated.value) {
        labelVariable.value = '_key';
      } else {
        labelVariable.value = aggregateBy.value;
      }
    });
    watchEffect(() => {
      if (!showIntNodeVis.value) {
        intAggregatedBy.value = undefined;
      }
    });

    function toggleProvVis() {
      store.commit.toggleShowProvenanceVis();
    }

    function aggregateNetwork(varName: string) {
      store.dispatch.aggregateNetwork(varName);
    }

    return {
      aggregateBy,
      directionalEdges,
      selectNeighbors,
      showGridLines,
      cellSize,
      aggregated,
      cellColorScale,
      parentColorScale,
      nodeVariableItems,
      maxConnections,
      showIntNodeVis,
      intAggregatedBy,
      maxIntConnections,
      exportNetwork,
      updateLegend,
      toggleProvVis,
      aggregateNetwork,
      labelVariable,
      multiVariableList,
    };
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

          <v-list-item class="px-0">
            <v-select
              v-model="labelVariable"
              label="Label Variable"
              :items="Array.from(multiVariableList)"
              :hide-details="true"
              class="mt-2"
              clearable
              outlined
              dense
            />
          </v-list-item>

          <!-- Connectivity Query List Item -->
          <v-list-item class="px-0">
            Cell Size
            <v-slider
              v-model="cellSize"
              :min="10"
              :max="100"
              :label="String(cellSize)"
              class="px-2"
              inverse-label
              hide-details
              color="blue darken-1"
            />
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

        <!-- Int Table Controls + Legend -->
        <div v-if="showIntNodeVis">
          <v-subheader class="grey darken-3 mt-6 py-0 white--text">
            Intermediate Node Table
          </v-subheader>

          <div class="pa-4">
            <!-- Aggregation Variable Selection -->
            <v-list-item
              class="pa-0 ma-0"
            >
              <v-list-item-content class="pa-0 ma-0">
                <v-autocomplete
                  v-model="intAggregatedBy"
                  class="pa-0 ma-0"
                  :items="nodeVariableItems"
                  hint="Variable to aggregate by"
                  persistent-hint
                  clearable
                />
              </v-list-item-content>
            </v-list-item>

            <!-- Matrix Legend -->
            <v-list-item
              class="pb-0 px-0"
              :style="`display: flex; max-height: 50px; opacity: ${maxIntConnections > 0 ? 1 : 0}`"
            >
              {{ 'Legend' }}
              <svg id="int-matrix-legend">
                <g
                  class="legendLinear"
                  transform="translate(10, 60)"
                />
              </svg>
            </v-list-item>
          </div>
        </div>

        <!-- Connectivity Query -->
        <div>
          <v-subheader class="grey darken-3 mt-6 py-0 white--text">
            Connectivity Query
          </v-subheader>
          <connectivity-query />
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
