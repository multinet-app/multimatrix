<script setup lang="ts">
import { Node, Edge, ArangoPath } from '@/types';
import { useStore } from '@/store';
import ConnectivityQuery from '@/components/ConnectivityQuery.vue';
import EdgeSlicing from '@/components/EdgeSlicing.vue';
import {
  computed, ref, watch, watchEffect,
} from 'vue';
import { storeToRefs } from 'pinia';
import ColorScaleLegend from '@/components/ColorScaleLegend.vue';

const store = useStore();
const {
  aggregatedBy,
  directionalEdges,
  selectNeighbors,
  showGridLines,
  cellSize,
  labelVariable,
  showPathTable,
  aggregated,
  degreeFiltered,
  cellColorScale,
  parentColorScale,
  nodeVariableItems,
  maxConnections,
  maxDegree,
  columnTypes,
  nodeTableNames,
  showIntNodeVis,
  intAggregatedBy,
  maxIntConnections,
  intTableColorScale,
  network,
  connectivityMatrixPaths,
  degreeRange,
  sortBy,
} = storeToRefs(store);

// Template objects
const aggregationItems = computed(() => {
  // Rebuild column types but just for node columns
  const nodeColumnTypes = columnTypes.value !== null ? Object.fromEntries(Object.entries(columnTypes.value).filter(([tableName]) => nodeTableNames.value.includes(tableName))) : {};

  // Get the varName of all node variables that are type category
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Object.values(nodeColumnTypes).map((colTypes) => Object.entries(colTypes).filter(([_, colType]) => colType === 'category').map(([varName, _]) => varName)).flat();
});

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

  connectivityMatrixPaths.value = { nodes: [], paths: reconstructedPaths };
  store.setSelectedConnectivityPaths([...Array(reconstructedPaths.length).keys()]);
  showPathTable.value = true;
}

watchEffect(() => {
  if (!showIntNodeVis.value) {
    intAggregatedBy.value = undefined;
  }
});

const degreeRangeLocal = ref<[number, number]>(degreeRange.value);
watch(degreeRange, () => { degreeRangeLocal.value = degreeRange.value; });
function removeByDegree() {
  degreeRange.value = degreeRangeLocal.value;
}

const sortByItems = ['Alphabetically', 'Clusters', 'Neighborhoods'];

const expandedPanels = ref<number[]>([3]);
// Make it so the connectivity query cannot expand, but still opens the modal
watch(expandedPanels, () => {
  if (expandedPanels.value.includes(2)) {
    expandedPanels.value = expandedPanels.value.filter((panel) => panel !== 2);
  }
});
</script>

<template>
  <v-navigation-drawer
    id="app-sidebar"
  >
    <v-expansion-panels v-model="expandedPanels" accordion tile dark multiple>
      <v-expansion-panel>
        <v-expansion-panel-header color="grey darken-3">
          Visualization Options
        </v-expansion-panel-header>

        <v-expansion-panel-content color="grey darken-3">
          <v-list>
            <v-list-item>
              <v-autocomplete
                v-model="labelVariable"
                label="Label Variable"
                :items="nodeVariableItems"
                :hide-details="true"
                clearable
                outlined
                dense
              />
            </v-list-item>
            <v-list-item>
              <v-autocomplete
                v-model="aggregatedBy"
                label="Aggregation Variable"
                :items="aggregationItems"
                :hide-details="true"
                clearable
                outlined
                dense
                @change="store.aggregateNetwork"
              />
            </v-list-item>
            <v-list-item>
              <v-autocomplete
                v-model="sortBy.network"
                label="Sort By"
                :items="sortByItems"
                :hide-details="true"
                clearable
                outlined
                dense
                @change="sortBy = { ...sortBy, node: (sortBy.network === null ? sortBy.node : null), lineup: null }"
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
                :min="5"
                :max="100"
                :label="String(cellSize)"
                class="px-2 align-center"
                inverse-label
                hide-details
                color="blue darken-1"
              />
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Degree </v-list-item-content>
              <v-range-slider
                v-model="degreeRangeLocal"
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
                    {{ degreeRangeLocal[0] }}
                  </p>
                </template>
                <template #append>
                  <p
                    class="pa-0 ma-0 text-center"
                    style="min-width: 25px; color: rgba(255, 255, 255, 0.7);"
                  >
                    {{ degreeRangeLocal[1] }}
                  </p>
                </template>
              </v-range-slider>
            </v-list-item>

            <!-- Download Network As 1-Hop CSV-->
            <v-list-item>
              <v-btn
                block
                color="grey darken-2 white--text"
                depressed
                @click="displayCSVBuilder()"
              >
                Network as 1-hop (CSV)
              </v-btn>
            </v-list-item>
          </v-list>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <EdgeSlicing />

      <ConnectivityQuery />

      <v-expansion-panel>
        <v-expansion-panel-header color="grey darken-3">
          Edge Legend
        </v-expansion-panel-header>

        <v-expansion-panel-content color="grey darken-3">
          <div class="pa-4">
            <!-- Aggregated Matrix Legend -->
            <ColorScaleLegend v-if="aggregated || degreeFiltered" :scale="parentColorScale" :label="aggregated ? 'Count of Aggregated Edges' : 'Count of Filtered Edges'" />

            <!-- Matrix Legend -->
            <ColorScaleLegend v-if="maxConnections.unAggr > 0" :scale="cellColorScale" :label="aggregated ? 'Count of Child Edges' : 'Count of Edges'" />
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
              <ColorScaleLegend v-if="maxIntConnections > 0" :scale="intTableColorScale" label="Count of Edges" />
            </div>
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-navigation-drawer>
</template>

<style scoped>
#app-sidebar {
  position: absolute;
  top: 48px !important;
  height: calc(100% - 48px) !important;
}
</style>

<style>
.v-expansion-panel-content__wrap {
  padding: 0 6px 8px 6px;
}
</style>
