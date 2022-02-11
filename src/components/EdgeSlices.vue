<script lang="ts">
import { select, selectAll } from 'd3-selection';
import store from '@/store';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, watch,
} from '@vue/composition-api';
import { extent } from 'd3-array';
import { formatLongDate, formatShortDate } from '@/lib/utils';
import { format } from 'd3-format';
import { scaleLinear } from 'd3-scale';

export default defineComponent({
  name: 'EdgeSlices',

  setup() {
    const slicedNetwork = computed(() => store.state.slicedNetwork);
    const isDate = computed(() => store.state.isDate);
    const currentInstance = getCurrentInstance();
    const svgWidth = computed(() => (currentInstance !== null ? currentInstance.proxy.$vuetify.breakpoint.width - store.state.controlsWidth : 0));
    const rectHeight = ref(20);

    const currentTime = computed(() => {
      const times: { timeRanges: {[key: number]: number[] | Date[]} ; current: number ; slices: number; sumEdges: number[] } = {
        timeRanges: {}, current: 0, slices: 0, sumEdges: [],
      };
      slicedNetwork.value.forEach((slice, i) => {
        times.timeRanges[i] = slice.time;
        times.slices = i + 1;
        times.sumEdges[i] = slice.network.edges.length;
      });
      return times;
    });
    const timeExtent = computed(() => extent(Object.values(currentTime.value.timeRanges).flat()));
    const textSpacer = ref(50);

    const timeRangesLength = computed(() => currentTime.value.slices);

    // Colorscale
    const colorScale = computed(() => scaleLinear<string, number>().domain(extent(currentTime.value.sumEdges)).range(['white', 'black']));

    // Heightscale
    const heightScale = computed(() => scaleLinear<number, number>().domain(extent(currentTime.value.sumEdges)).range([0, rectHeight.value]));
    // Width of rect
    const rectWidth = computed(() => (svgWidth.value - (textSpacer.value * 2) - ((timeRangesLength.value - 1) * 4)) / timeRangesLength.value);

    // Tooltip
    const tooltipMessage = ref('');
    const toggleTooltip = ref(false);
    const tooltipPosition = ref({ x: 0, y: 0 });
    const tooltipStyle = computed(() => `left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px; white-space: pre-line;`);
    const controlsWidth = computed(() => store.state.controlsWidth);

    function showTooltip(slice: number[], key: number, event: MouseEvent) {
      tooltipPosition.value = {
        x: event.clientX - controlsWidth.value - 20,
        y: event.clientY + 20,
      };
      if (isDate.value) {
        tooltipMessage.value = `Slice: ${key}
      Range: ${formatLongDate(slice[0])} - ${formatLongDate(slice[1])}
      Total Edges: ${currentTime.value.sumEdges[key]}`;
        toggleTooltip.value = true;
      } else {
        tooltipMessage.value = `Slice: ${key}
      Range: ${format('.2s')(slice[0])} - ${format('.2s')(slice[1])}
      Total Edges: ${currentTime.value.sumEdges[key]}`;
        toggleTooltip.value = true;
      }
    }

    function hideTooltip() {
      tooltipMessage.value = '';
      toggleTooltip.value = false;
    }

    // Update sliced view and network
    function updateSlice(selection: number) {
      currentTime.value.current = selection;
      selectAll('.edgeSliceRectClass').classed('selected', false);
      select(`#edgeSlice_${selection}`).classed('selected', true);

      store.commit.setNetwork(slicedNetwork.value[selection].network);
    }

    // Select the first slice on initial load
    onMounted(() => {
      select('#edgeSlice_0').classed('selected', true);
    });

    // Select the first slice on when slices are changed load
    watch([slicedNetwork], () => {
      selectAll('.edgeSliceRectClass').classed('selected', false);
      select('#edgeSlice_0').classed('selected', true);
    });

    return {
      svgWidth,
      currentTime,
      timeRangesLength,
      showTooltip,
      hideTooltip,
      tooltipStyle,
      toggleTooltip,
      tooltipMessage,
      timeExtent,
      textSpacer,
      updateSlice,
      isDate,
      formatShortDate,
      colorScale,
      heightScale,
      rectHeight,
      rectWidth,
    };
  },
});
</script>

<template>
  <div>
    <h3>
      Edge Slices
    </h3>
    <svg
      :width="svgWidth"
      :height="50"
    >
      <g
        id="edgeslices"
        transform="translate(0,2)"
      >
        <foreignObject
          fill="black"
          :x="isDate ? 0 : textSpacer / 2"
          y="0"
          :width="textSpacer"
          height="20"
        >
          {{ isDate ? formatShortDate(timeExtent[0]) : timeExtent[0] }}
        </foreignObject>
        <g
          v-for="(slice, key, index) of currentTime.timeRanges"
          :key="`edgeSlice_${key}`"
          class="edgeSliceGroup"
          @mouseover="showTooltip(slice, key, $event)"
          @mouseout="hideTooltip"
          @click="updateSlice(key)"
        >
          <rect
            :id="`edgeSlice_${key}`"
            class="edgeSliceRectClass"
            :width="rectWidth"
            :height="rectHeight"
            y="0"
            fill="lightgrey"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
          <rect
            :width="rectWidth"
            :height="rectHeight - heightScale(currentTime.sumEdges[key])"
            class="edgeSliceRectClass"
            y="0"
            fill="white"
            :x="textSpacer + (4 * index) + (rectWidth * index)"
          />
        </g>
        <foreignObject
          fill="black"
          :x="isDate ? svgWidth - (textSpacer) : svgWidth - (textSpacer / 2)"
          y="0"
          :width="textSpacer"
          height="20"
        >
          {{ isDate ? formatShortDate(timeExtent[1]) : timeExtent[1] }}
        </foreignObject>
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
  stroke: black;
  stroke-width: 1px;
  position: absolute;
}

.selected {
  fill: #f99f31;
  stroke-width: 2px;
}

</style>
