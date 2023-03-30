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
} = storeToRefs(store);

// Template objects
const showMenu = ref(false);
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
</script>

<template>
  <v-navigation-drawer
    id="app-sidebar"
    permanent
  >
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
            v-model="aggregatedBy"
            label="Aggregation Variable"
            :items="aggregationItems"
            :hide-details="true"
            class="mt-3"
            clearable
            outlined
            dense
            @change="store.aggregateNetwork"
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
      </v-card>

      <v-subheader class="grey darken-3 py-0 white--text">
        Edge Legend
      </v-subheader>

      <div class="pa-4">
        <!-- Aggregated Matrix Legend -->
        <color-scale-legend v-if="aggregated || degreeFiltered" :scale="parentColorScale" :label="aggregated ? 'Count of Aggregated Edges' : 'Count of Filtered Edges'" />

        <!-- Matrix Legend -->
        <color-scale-legend v-if="maxConnections.unAggr > 0" :scale="cellColorScale" :label="aggregated ? 'Count of Child Edges' : 'Count of Edges'" />
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
          <color-scale-legend v-if="maxIntConnections > 0" :scale="intTableColorScale" label="Legend" />
        </div>
      </div>
      <!-- Edge Slicing -->
      <EdgeSlicing />

      <!-- Connectivity Query -->
      <connectivity-query />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
#app-sidebar {
  position: absolute;
  top: 48px !important;
  height: calc(100% - 48px) !important;
}
</style>
