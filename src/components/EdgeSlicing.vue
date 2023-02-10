<script setup lang="ts">
import { formatShortDate } from '@/lib/utils';
import { useStore } from '@/store';
import { Edge, SlicedNetwork } from '@/types';
import { computed, ref, watch } from 'vue';
import { scaleLinear, scaleTime } from 'd3';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  network,
  networkOnLoad,
  slicedNetwork,
  isDate,
  edgeVariableItems,
  networkName,
} = storeToRefs(store);

const showMenu = ref(false);
const sliceRules = (value: string) => !Number.isNaN(parseFloat(value)) || 'Please type a number';
const calMenu = ref([false, false]);
const isSliced = computed(() => slicedNetwork.value.length === 0);
const startEdgeVar = ref('');
const endEdgeVar = ref('');
const edgeSliceNumber = ref(1);
const inputRange = ref<(Date | number | string)[]>([]);
const isTime = ref(false);
const isNumeric = ref(true);
const isValidRange = ref(true);

// Check if selected variable is numeric
function checkType() {
  // eslint-disable-next-line no-unused-expressions
  if (networkOnLoad.value !== null) {
    isNumeric.value = !Number.isNaN(
      parseFloat(`${networkOnLoad.value.edges[0][startEdgeVar.value]}`),
    );
  }
}

function formatDate(date: Date) {
  const dateString = formatShortDate(date);
  const [month, day, year] = dateString.split('/');
  return `${year}-${month}-${day}`;
}

// Assume start var + end are the same
watch([startEdgeVar], () => {
  if (isNumeric.value) {
    endEdgeVar.value = startEdgeVar.value;
    // if new start variable is categorical, reset values
  } else {
    endEdgeVar.value = '';
    isDate.value = false;
    edgeSliceNumber.value = 1;
    isTime.value = false;
    isValidRange.value = true;
  }
});

// Compute the min and max times for numbers or date
const validRange = computed(() => {
  const range: (Date | number | string)[] = [0, 0];
  if (
    startEdgeVar.value !== null
          && endEdgeVar.value !== null
          && networkOnLoad.value !== null
  ) {
    // Loop through all edges, return min and max time values
    networkOnLoad.value.edges.forEach((edge: Edge, i: number) => {
      // Check for dates
      let startVar: number = parseFloat(`${edge[startEdgeVar.value]}`);
      let endVar: number = parseFloat(`${edge[endEdgeVar.value]}`);
      if (isDate.value) {
        startVar = Date.parse(`${edge[startEdgeVar.value]}`);
        endVar = Date.parse(`${edge[endEdgeVar.value]}`);
      }
      if (i === 0) {
        range[0] = startVar;
        range[1] = endVar;
      }
      if (startVar < range[0]) {
        range[0] = startVar;
      }
      if (endVar > range[1]) {
        range[1] = endVar;
      }
    });
  }
  // Format date
  if (isDate.value) {
    range[0] = formatDate(new Date(range[0]));
    range[1] = formatDate(new Date(range[1]));
  }
  return range;
});
const minRules = (value: number) => value >= validRange.value[0] || `Must be >= ${validRange.value[0]}`;
const maxRules = (value: number) => value <= validRange.value[1] || `Must be >= ${validRange.value[1]}`;

// Update input values when start or end variable updates
watch([validRange], () => {
  inputRange.value = [...validRange.value];
});

// Check if input is valid

watch([inputRange], () => {
  if (!isDate.value) {
    isValidRange.value = parseFloat(inputRange.value[0].toString()) >= validRange.value[0]
        && parseFloat(inputRange.value[1].toString()) <= validRange.value[1];
  }
});

function sliceNetwork() {
  // Resets to original network view when variable slice is 1
  if (
    (networkOnLoad.value !== null
          && edgeSliceNumber.value === 1
          && isNumeric.value)
        || (networkOnLoad.value !== null && startEdgeVar.value === undefined)
  ) {
    slicedNetwork.value = [];
    network.value = networkOnLoad.value;
  }
  if (
    (networkOnLoad.value !== null && edgeSliceNumber.value !== 1)
        || (networkOnLoad.value !== null && !isNumeric.value)
  ) {
    const newSlicedNetwork: SlicedNetwork[] = [];
    // Generates sliced networks based on time slices or numeric input
    if (isNumeric.value) {
      const slicedRange = [];
      if (isDate.value) {
        slicedRange[0] = new Date(inputRange.value[0]).getTime();
        slicedRange[1] = new Date(inputRange.value[1]).getTime();
      } else {
        slicedRange[0] = parseFloat(inputRange.value[0].toString());
        slicedRange[1] = parseFloat(inputRange.value[1].toString());
      }
      // Generate sliced network
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < edgeSliceNumber.value; i++) {
        const currentSlice: SlicedNetwork = {
          slice: i + 1,
          time: [],
          network: { nodes: networkOnLoad.value.nodes, edges: [] },
          category: '',
        };
        // Create slices for dates
        if (isDate.value) {
          const timeIntervals = scaleTime()
            .domain(slicedRange)
            .range([0, edgeSliceNumber.value]);
          currentSlice.time = [
            timeIntervals.invert(i),
            timeIntervals.invert(i + 1),
          ];
          networkOnLoad.value.edges.forEach((edge: Edge) => {
            if (
              timeIntervals(new Date(`${edge[startEdgeVar.value]}`)) >= i
                  && timeIntervals(new Date(`${edge[endEdgeVar.value]}`)) < i + 1
            ) {
              currentSlice.network.edges.push(edge);
            }
          });
        } else {
          const timeIntervals = scaleLinear()
            .domain(slicedRange)
            .range([0, edgeSliceNumber.value]);
          currentSlice.time = [
            timeIntervals.invert(i),
            timeIntervals.invert(i + 1),
          ];
          networkOnLoad.value.edges.forEach((edge: Edge) => {
            if (
              timeIntervals(parseFloat(`${edge[startEdgeVar.value]}`))
                    >= i
                  && timeIntervals(parseFloat(`${edge[endEdgeVar.value]}`)) < i + 1
            ) {
              currentSlice.network.edges.push(edge);
            }
          });
        }
        newSlicedNetwork.push(currentSlice);
      }
      // Create slicing for categories
    } else {
      const categoricalValues = new Set(
        networkOnLoad.value.edges.map(
          (edge: Edge) => `${edge[startEdgeVar.value]}`,
        ),
      );
      [...categoricalValues].forEach((attr, i) => {
        if (networkOnLoad.value !== null) {
          const currentSlice: SlicedNetwork = {
            slice: i + 1,
            time: [],
            network: { nodes: networkOnLoad.value.nodes, edges: [] },
            category: attr,
          };
          networkOnLoad.value.edges.forEach((edge: Edge) => {
            if (edge[startEdgeVar.value] === attr) {
              currentSlice.network.edges.push(edge);
            }
          });
          newSlicedNetwork.push(currentSlice);
        }
      });
    }
    slicedNetwork.value = newSlicedNetwork;
    network.value = slicedNetwork.value[0].network;
  }
}

function exportEdges() {
  if (network.value === null) {
    return;
  }
  // Slice network in case 'Generate Slices' button
  // not clicked or updated
  sliceNetwork();

  // Generate edge table data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edges: any[] = [];
  slicedNetwork.value.forEach((slice) => {
    const timeObj = {
      slice: slice.slice,
      timeStart: slice.time[0],
      timeFinish: slice.time[1],
    };
    slice.network.edges.forEach((edge) => {
      const rowObj = { ...edge, ...timeObj };
      edges.push(rowObj);
    });
  });

  // Formate edge data for CSV
  const separator = ',';
  const keys = Object.keys(edges[0]);
  const edgeTable = `${keys.join(separator)}\n${edges
    .map((edge) => keys
      .map((k) => {
        let cell = edge[k] === null || edge[k] === undefined ? '' : edge[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      })
      .join(separator))
    .join('\n')}`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([edgeTable], {
      type: 'text/csv',
    }),
  );
  a.download = `${networkName.value}_${edgeSliceNumber.value}-slices.csv`;
  a.click();
}

function resetNetwork() {
  // Reset network
  if (networkOnLoad.value !== null) {
    slicedNetwork.value = [];
    network.value = networkOnLoad.value;
  }
  // Reset form
  startEdgeVar.value = '';
  endEdgeVar.value = '';
  isDate.value = false;
  isNumeric.value = true;
  edgeSliceNumber.value = 1;
  isTime.value = false;
  inputRange.value = [];
}
</script>

<template>
  <div id="edgeslicing">
    <v-list class="pa-0">
      <v-subheader class="grey darken-3 py-0 pr-0 white--text">
        Edge Slicing

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
            {{ showMenu ? "mdi-chevron-up" : "mdi-chevron-down" }}
          </v-icon>
        </v-btn>
      </v-subheader>

      <v-card
        v-if="showMenu"
        flat
        color="white"
        class="pb-4 pt-2"
      >
        <v-list-item>
          <v-select
            v-model="startEdgeVar"
            :label="isTime ? `Start Variable` : `Edge Variable`"
            :items="edgeVariableItems"
            :hide-details="true"
            class="mt-3"
            clearable
            outlined
            dense
            @change="checkType"
          />
        </v-list-item>
        <v-list-item v-if="isTime">
          <v-select
            v-model="endEdgeVar"
            label="End Variable"
            :items="edgeVariableItems"
            :hide-details="true"
            class="mt-3"
            clearable
            outlined
            dense
          />
        </v-list-item>
        <v-list-item v-if="isNumeric && startEdgeVar">
          <v-row>
            <v-col>
              <v-checkbox
                v-model="isTime"
                label="Time Variable"
              />
            </v-col>
            <v-col>
              <v-checkbox
                v-if="isTime"
                v-model="isDate"
                label="Date format"
              />
            </v-col>
          </v-row>
        </v-list-item>
        <!-- Date Picker -->
        <v-list-item v-if="isDate && isNumeric">
          <v-menu
            :ref="calMenu[0]"
            v-model="calMenu[0]"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="auto"
          >
            <template #activator="{ on, attrs }">
              <v-text-field
                v-model="inputRange[0]"
                label="Start Date"
                hint="YYYY-MM-DD"
                persistent-hint
                prepend-icon="mdi-calendar"
                v-bind="attrs"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="inputRange[0]"
              no-title
              :min="validRange[0]"
              :max="validRange[1]"
              @input="calMenu[0] = false"
            />
          </v-menu>
          <v-menu
            :ref="calMenu[1]"
            v-model="calMenu[1]"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="auto"
          >
            <template #activator="{ on, attrs }">
              <v-text-field
                v-model="inputRange[1]"
                label="End Date"
                hint="YYYY-MM-DD"
                persistent-hint
                prepend-icon="mdi-calendar"
                v-bind="attrs"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="inputRange[1]"
              :min="validRange[0]"
              :max="validRange[1]"
              no-title
              @input="calMenu[1] = false"
            />
          </v-menu>
        </v-list-item>
        <!-- Numeric Picker -->
        <v-list-item v-if="isNumeric && !isDate && startEdgeVar">
          <v-col>
            <v-text-field
              v-model="inputRange[0]"
              label="Min"
              :rules="[minRules]"
              hide-details="auto"
              outlined
            />
          </v-col>
          <v-col>
            <v-text-field
              v-model="inputRange[1]"
              :rules="[maxRules]"
              hide-details="auto"
              label="Max"
              outlined
            />
          </v-col>
        </v-list-item>
        <v-list-item v-if="isNumeric">
          <v-text-field
            v-model="edgeSliceNumber"
            label="Edge Slices"
            :rules="[sliceRules]"
            :hide-details="true"
            class="mt-3"
            clearable
            outlined
            dense
          />
        </v-list-item>

        <v-list-item>
          <v-row>
            <v-col>
              <v-btn
                color="primary"
                block
                depressed
                :disabled="!isValidRange && !isDate && isNumeric && !startEdgeVar"
                @click="sliceNetwork"
              >
                Generate Slices
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-btn
                color="primary"
                block
                depressed
                :disabled="isSliced"
                @click="exportEdges"
              >
                Export
                <v-icon right>
                  mdi-download
                </v-icon>
              </v-btn>
            </v-col>
            <v-col sm="6">
              <v-btn
                color="primary"
                block
                depressed
                :disabled="isSliced"
                @click="resetNetwork"
              >
                Reset
                <v-icon right>
                  mdi-refresh
                </v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-list-item>
      </v-card>
    </v-list>
  </div>
</template>
