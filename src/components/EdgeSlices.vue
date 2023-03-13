<script setup lang="ts">
import { useStore } from '@/store';
import { computed, getCurrentInstance, ref } from 'vue';
import { max, format, scaleLinear } from 'd3';
import { formatLongDate, formatShortDate } from '@/lib/utils';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  slicedNetwork,
  isDate,
  sliceIndex,
} = storeToRefs(store);

const isNumeric = computed(() => (slicedNetwork.value[0].category === ''));
const currentInstance = getCurrentInstance();
const svgWidth = computed(() => (currentInstance !== null ? currentInstance.proxy.$vuetify.breakpoint.width : 0));
const rectHeight = ref(20);

const currentSlice = computed(() => {
  const slices: { timeRanges: {[key: number]: number[] | Date[]} ; current: number ; slices: number; sumEdges: number[]; categories: {[key: number]: string} } = {
    timeRanges: {}, current: 0, slices: 0, sumEdges: [], categories: {},
  };
  slicedNetwork.value.forEach((slice, i) => {
    slices.slices = i + 1;
    slices.sumEdges[i] = slice.network.edges.length;
    if (isNumeric.value) {
      slices.timeRanges[i] = slice.time;
    } else {
      slices.categories[i] = slice.category;
    }
  });
  return slices;
});
const textSpacer = ref(70);

const timeRangesLength = computed(() => currentSlice.value.slices);

// Heightscale for numeric attributes
const heightScale = computed(() => scaleLinear<number, number>().domain([0, max(currentSlice.value.sumEdges) || 0]).range([0, rectHeight.value]));
// Width of rect
const rectWidth = computed(() => (svgWidth.value - (textSpacer.value * 2) - ((timeRangesLength.value - 1) * 4)) / timeRangesLength.value);

// Tooltip
const tooltipMessage = ref('');
const toggleTooltip = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipStyle = computed(() => `left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px; white-space: pre-line;`);

function showTooltip(key: number, event: MouseEvent) {
  tooltipPosition.value = {
    x: event.clientX - 20,
    y: event.clientY + 20,
  };
  if (isNumeric.value) {
    if (isDate.value) {
      tooltipMessage.value = `Slice: ${key}
      Range: ${formatLongDate(`${currentSlice.value.timeRanges[key][0]}`)} - ${formatLongDate(`${currentSlice.value.timeRanges[key][1]}`)}
      Total Edges: ${currentSlice.value.sumEdges[key]}`;
      toggleTooltip.value = true;
    } else {
      tooltipMessage.value = `Slice: ${key}
      Range: ${format('.2s')(currentSlice.value.timeRanges[key][0])} - ${format('.2s')(currentSlice.value.timeRanges[key][1])}
      Total Edges: ${currentSlice.value.sumEdges[key]}`;
      toggleTooltip.value = true;
    }
  } else {
    tooltipMessage.value = `Category: ${currentSlice.value.categories[key]}
      Total Edges: ${currentSlice.value.sumEdges[key]}`;
    toggleTooltip.value = true;
  }
}

function hideTooltip() {
  tooltipMessage.value = '';
  toggleTooltip.value = false;
}
</script>

<template>
  <div>
    <h4 class="pl-2 pt-2">
      Edge Slices {{ sliceIndex }} {{ sliceIndex === 0 }}
    </h4>
    <svg
      :width="svgWidth"
      :height="50"
    >
      <!-- Numeric + Date Visualization -->
      <g
        v-if="isNumeric"
        id="edgeslices"
        transform="translate(0,2)"
      >
        <g
          v-for="(slice, key, index) of currentSlice.timeRanges"
          :key="`edgeSlice_${key}`"
          class="edgeSliceGroup"
          @mouseover="showTooltip(key, $event)"
          @mouseout="hideTooltip"
          @click="sliceIndex = index"
        >
          <rect
            :id="`edgeSlice_${key}`"
            :class="index === sliceIndex ? 'edgeSliceRectClass selected' : 'edgeSliceRectClass'"
            :width="rectWidth"
            :height="rectHeight"
            y="0"
            fill="lightgrey"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
          <rect
            :width="rectWidth"
            :height="rectHeight - heightScale(currentSlice.sumEdges[key])"
            class="edgeSliceRectClass"
            y="0"
            fill="white"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
          <foreignObject
            class="sliceLabels"
            :width="rectWidth"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
            y="30"
            height="20"
          >
            {{ isDate ? `${formatShortDate(slice[0])} - ${formatShortDate(slice[1])}` : `${format('.2s')(slice[0])} - ${format('.2s')(slice[1])}` }}
          </foreignObject>
        </g>
      </g>
      <!-- Categorical Visualization -->
      <g
        v-else
        id="edgeSlices"
        transform="translate(0,2)"
      >
        <g
          v-for="(slice, key, index) of currentSlice.categories"
          :key="`edgeSlice_${key}`"
          class="edgeSliceGroup"
          @mouseover="showTooltip(key, $event)"
          @mouseout="hideTooltip"
          @click="sliceIndex = index"
        >
          <rect
            :id="`edgeSlice_${key}`"
            :class="index === sliceIndex ? 'edgeSliceRectClass selected' : 'edgeSliceRectClass'"
            :width="rectWidth"
            :height="rectHeight"
            y="0"
            fill="lightgrey"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
          <rect
            :width="rectWidth"
            :height="rectHeight - heightScale(currentSlice.sumEdges[key])"
            class="edgeSliceRectClass"
            y="0"
            fill="white"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
          <foreignObject
            class="sliceLabels"
            :width="rectWidth"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
            y="30"
            height="20"
          >
            {{ slice }}
          </foreignObject>
        </g>
      </g>
    </svg>

    <div
      v-if="toggleTooltip"
      class="tooltip"
      :style="tooltipStyle"
    >
      {{ tooltipMessage }}
    </div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  background-color: white;
  font-size: 12.5px;
  color: #000;
  border-radius: 5px;
  padding: 5px;
  pointer-events: none;
  -webkit-box-shadow: 0 4px 8px 0 rgba(0,0,0,.2);
  box-shadow: 0 4px 8px 0 rgba(0,0,0,.2);
  max-width: 400px
}

.edgeSliceGroup {
  cursor: pointer;
}

.edgeSliceRectClass {
  stroke: darkgray;
  stroke-width: 1px;
  position: absolute;
}

.selected {
  stroke: black;
  fill: #f99f31;
  stroke-width: 2px;
}

svg:deep(.sliceLabels) {
  text-overflow: ellipsis;
  overflow: hidden;
  z-index: 100;
  margin: 0;
  fill: black !important;
  text-align: center;
}
</style>
