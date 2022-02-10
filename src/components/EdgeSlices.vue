<script lang="ts">
import { select, selectAll } from 'd3-selection';
import store from '@/store';
import {
  computed, defineComponent, ref,
} from '@vue/composition-api';
import { extent } from 'd3-array';
import { formatLongDate, formatShortDate } from '@/lib/utils';

export default defineComponent({
  name: 'EdgeSlices',

  setup() {
    const slicedNetwork = computed(() => store.state.slicedNetwork);
    const isDate = computed(() => store.state.isDate);
    const svgWidth = computed(() => parseFloat(select('svg#matrix').attr('width')));

    const currentTime = computed(() => {
      const times: { timeRanges: {[key: number]: number[] | Date[]} ; current: number ; slices: number } = { timeRanges: {}, current: 0, slices: 0 };
      slicedNetwork.value.forEach((slice, i) => {
        times.timeRanges[i] = slice.time;
        times.slices = i + 1;
      });
      return times;
    });
    const timeExtent = computed(() => extent(Object.values(currentTime.value.timeRanges).flat()));
    const textSpacer = ref(50);

    const timeRangesLength = computed(() => currentTime.value.slices);

    // Tooltip
    const tooltipMessage = ref('');
    const toggleTooltip = ref(false);
    const tooltipPosition = ref({ x: 0, y: 0 });
    const tooltipStyle = computed(() => `left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px; white-space: pre-line;`);
    const controlsWidth = computed(() => store.state.controlsWidth);

    function showTooltip(slice: number[], key: number, event: MouseEvent) {
      tooltipPosition.value = {
        x: event.clientX - controlsWidth.value,
        y: event.clientY + 20,
      };
      if (isDate.value) {
        tooltipMessage.value = `Slice: ${key}
      Slice: ${formatLongDate(slice[0])} - ${formatLongDate(slice[1])}`;
        toggleTooltip.value = true;
      } else {
        tooltipMessage.value = `Slice: ${key}
      Slice: ${Math.floor(slice[0])} - ${Math.floor(slice[1])}`;
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
        <rect
          v-for="(slice, key, index) of currentTime.timeRanges"
          :id="`edgeSlice_${key}`"
          :key="`edgeSlice_${key}`"
          class="edgeSliceRectClass"
          :width="(svgWidth - (textSpacer * 2)) / timeRangesLength"
          height="20"
          y="0"
          :x="textSpacer + (((svgWidth - (textSpacer * 2)) / timeRangesLength) * index)"
          @mouseover="showTooltip(slice, key, $event)"
          @mouseout="hideTooltip"
          @click="updateSlice(key)"
        />
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

.edgeSliceRectClass {
  stroke: black;
  stroke-width: 1px;
  cursor: pointer;
  fill: lightgray
}

.selected {
  fill: #F8CF91;
  stroke-width: 1px;
}

</style>
