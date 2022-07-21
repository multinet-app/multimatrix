<script lang="ts">
import { select } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import { Node, Edge, ArangoPath } from '@/types';
import store from '@/store';
import AboutDialog from '@/components/AboutDialog.vue';
import LoginMenu from '@/components/LoginMenu.vue';
import ConnectivityQuery from '@/components/ConnectivityQuery.vue';
import EdgeSlicing from '@/components/EdgeSlicing.vue';
import {
  computed, defineComponent, Ref, ref, watch, watchEffect,
} from '@vue/composition-api';

export default defineComponent({
  components: {
    AboutDialog,
    LoginMenu,
    ConnectivityQuery,
    EdgeSlicing,
  },

  setup() {
    // Template objects
    const showMenu = ref(false);
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
    const showTable = computed({
      get() {
        return store.state.showPathTable;
      },
      set(value: boolean) {
        store.commit.setShowPathTable(value);
      },
    });
    const aggregated = computed(() => store.state.aggregated);
    const filtered = computed(() => store.state.filteredNetwork);
    const cellColorScale = computed(() => store.getters.cellColorScale);
    const parentColorScale = computed(() => store.getters.parentColorScale);
    const nodeVariableItems = computed(() => store.getters.nodeVariableItems);
    const aggregationItems = computed(() => {
      // Rebuild column types but just for node columns
      const nodeColumnTypes = store.state.columnTypes !== null ? Object.fromEntries(Object.entries(store.state.columnTypes).filter(([tableName]) => store.getters.nodeTableNames.includes(tableName))) : {};

      // Get the varName of all node variables that are type category
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return Object.values(nodeColumnTypes).map((colTypes) => Object.entries(colTypes).filter(([_, colType]) => colType === 'category').map(([varName, _]) => varName)).flat();
    });
    const maxConnections = computed(() => store.state.maxConnections);
    const maxDegree = computed(() => store.state.maxDegree);
    const degreeRange = ref([0, maxDegree.value]);

    watch([maxDegree], () => {
      degreeRange.value = [0, maxDegree.value];
    });

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
    const networkOnLoad = computed(() => store.state.networkOnLoad);

    const searchTerm = ref('');
    const searchErrors: Ref<string[]> = ref([]);
    const searchItems = computed(() => {
      if (network.value !== null && labelVariable.value !== undefined) {
        return network.value.nodes.map((node) => (node[labelVariable.value || '']));
      }
      if (network.value !== null && labelVariable.value === undefined) {
        return network.value.nodes.map((node) => (node._key));
      }
      return [];
    });

    function exportNetwork() {
      if (network.value === null) {
        return;
      }

      const networkToExport = {
        nodes: network.value.nodes.map((node) => {
          const newNode = { ...node };
          newNode.id = newNode._key;

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

    function displayCSVBuilder() {
      const reconstructedPaths: ArangoPath[] = [];

      if (network.value !== null) {
        network.value.edges.forEach((edge) => {
          const reconstructedPath: ArangoPath = {
            vertices: [],
            edges: [],
          };

          reconstructedPath.edges.push(edge as Edge);
          if (network.value !== null) {
            const node0index = network.value.nodes.findIndex((node) => (node === null ? false : node._id === edge._from));
            const node1index = network.value.nodes.findIndex((node) => (node === null ? false : node._id === edge._to));
            reconstructedPath.vertices.push(network.value.nodes[node0index] as Node);
            reconstructedPath.vertices.push(network.value.nodes[node1index] as Node);
          }
          reconstructedPaths.push(reconstructedPath);
        });
      }

      store.commit.setConnectivityMatrixPaths({ nodes: [], paths: reconstructedPaths });
      store.commit.setSelectedConnectivityPaths([...Array(reconstructedPaths.length).keys()]);
      showTable.value = true;
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
      }
    });
    watch(aggregateBy, () => {
      labelVariable.value = aggregateBy.value;
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
      if (filtered.value) {
        store.commit.setFilteredNetwork(false);
        if (networkOnLoad.value !== null) {
          store.dispatch.updateNetwork({ network: networkOnLoad.value });
        }
        degreeRange.value = [0, maxDegree.value];
        store.commit.setDegreeNetwork(degreeRange.value);
      }
      store.dispatch.aggregateNetwork(varName);
    }

    function search() {
      searchErrors.value = [];
      if (network.value !== null) {
        const nodeIDsToSelect = network.value.nodes
          .filter((node) => (labelVariable.value !== undefined ? node[labelVariable.value] === searchTerm.value : node._key === searchTerm.value))
          .map((node) => node._id);

        if (nodeIDsToSelect.length > 0) {
          store.commit.addSelectedNode(nodeIDsToSelect);
        } else {
          searchErrors.value.push('Enter a valid node to search');
        }
      }
    }

    function removeByDegree() {
      store.commit.setDegreeNetwork(degreeRange.value);
    }

    return {
      aggregateBy,
      directionalEdges,
      selectNeighbors,
      showGridLines,
      cellSize,
      aggregated,
      filtered,
      cellColorScale,
      parentColorScale,
      nodeVariableItems,
      aggregationItems,
      maxConnections,
      showIntNodeVis,
      intAggregatedBy,
      maxIntConnections,
      exportNetwork,
      updateLegend,
      toggleProvVis,
      aggregateNetwork,
      labelVariable,
      showMenu,
      search,
      searchTerm,
      searchErrors,
      searchItems,
      degreeRange,
      maxDegree,
      removeByDegree,
      displayCSVBuilder,
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
        <v-subheader class="grey darken-3 py-0 pr-0 white--text">
          Visualization Options

          <v-spacer />

          <v-btn
            :min-width="40"
            :height="48"
            depressed
            tile
            class="grey darken-3 pa-0"
            @click="showMenu = !showMenu"
          >
            <v-icon color="white">
              {{ showMenu ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </v-btn>
        </v-subheader>

        <v-card
          v-if="showMenu"
          dark
          tile
          flat
          color="grey darken-3"
          class="pb-4 pt-0"
        >
          <v-list-item>
            <v-autocomplete
              v-model="labelVariable"
              label="Label Variable"
              :items="nodeVariableItems"
              :hide-details="true"
              class="mt-3"
              clearable
              outlined
              dense
            />
          </v-list-item>
          <v-list-item>
            <v-autocomplete
              v-model="aggregateBy"
              label="Aggregation Variable"
              :items="aggregationItems"
              :hide-details="true"
              class="mt-3"
              clearable
              outlined
              dense
              @change="aggregateNetwork"
            />
          </v-list-item>

          <!-- Auto-Select Neighbors List Item -->
          <v-list-item>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="selectNeighbors"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <!-- Gridline Toggle List Item -->
          <v-list-item>
            <v-list-item-content> Show GridLines </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="showGridLines"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <!-- Directional Edges Toggle Card -->
          <v-list-item>
            <v-list-item-content> Directional Edges </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="directionalEdges"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <v-list-item>
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

          <v-list-item>
            <v-list-item-content> Degree </v-list-item-content>
            <v-range-slider
              v-model="degreeRange"
              :max="maxDegree"
              min="0"
              hide-details
              class="align-center"
              color="blue darken-1"
              :disabled="aggregated"
              @change="removeByDegree"
            >
              <template #prepend>
                <p
                  class="pa-0 ma-0 text-center"
                  style="min-width: 25px; color: rgba(255, 255, 255, 0.7);"
                >
                  {{ degreeRange[0] }}
                </p>
              </template>
              <template #append>
                <p
                  class="pa-0 ma-0 text-center"
                  style="min-width: 25px; color: rgba(255, 255, 255, 0.7);"
                >
                  {{ degreeRange[1] }}
                </p>
              </template>
            </v-range-slider>
          </v-list-item>

          <v-list-item>
            <v-btn
              color="primary"
              block
              depressed
              @click="toggleProvVis"
            >
              Provenance Vis
            </v-btn>
          </v-list-item>

          <v-list-item>
            <v-btn
              block
              color="grey darken-2 white--text"
              depressed
              @click="exportNetwork"
            >
              Export Network
            </v-btn>
          </v-list-item>
          <!-- Download Network As CSV-->
          <v-list-item>
            <v-btn
              block
              color="grey darken-2 white--text"
              depressed
              @click="displayCSVBuilder()"
            >
              Create CSV
            </v-btn>
          </v-list-item>
        </v-card>

        <div class="px-4">
          <v-list-item class="px-0">
            <v-autocomplete
              v-model="searchTerm"
              label="Search for Node"
              :items="searchItems"
              :error-messages="searchErrors"
              no-data-text="Select a label variable"
              class="pt-4"
              auto-select-first
              outlined
              dense
              @input="search"
            />
          </v-list-item>
        </div>

        <v-subheader class="grey darken-3 py-0 white--text">
          Color Scale Legend
        </v-subheader>

        <div class="pa-4">
          <!-- Aggregated Matrix Legend -->
          <v-list-item
            v-if="aggregated || filtered"
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            {{ aggregated ? 'Aggregate Legend' : 'Filtered Legend' }}
            <svg
              id="parent-matrix-legend"
              height="50"
            >
              <g
                class="legendLinear"
                transform="translate(10, 10)"
              />
            </svg>
          </v-list-item>

          <!-- Matrix Legend -->
          <v-list-item
            class="pb-0 px-0"
            :style="`display: flex; max-height: 50px; opacity: ${maxConnections.unAggr > 0 ? 1 : 0}`"
          >
            {{ aggregated ? 'Child Legend' : 'Matrix Legend' }}
            <svg
              id="matrix-legend"
              height="50"
            >
              <g
                class="legendLinear"
                transform="translate(10, 10)"
              />
            </svg>
          </v-list-item>
        </div>

        <!-- Int Table Controls + Legend -->
        <div v-if="showIntNodeVis">
          <v-subheader class="grey darken-3 py-0 white--text">
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
              <svg
                id="int-matrix-legend"
                height="50"
              >
                <g
                  class="legendLinear"
                  transform="translate(10, 10)"
                />
              </svg>
            </v-list-item>
          </div>
        </div>
        <!-- Edge Slicing -->
        <EdgeSlicing />

        <!-- Connectivity Query -->
        <connectivity-query />
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.app-logo {
  width: 36px;
}
</style>
