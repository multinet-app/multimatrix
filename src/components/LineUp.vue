<script setup lang="ts">
import { useStore } from '@/store';
import {
  computed, onMounted, ref, watch, watchEffect,
} from 'vue';
import LineUp, {
  Column, DataBuilder, IBuilderAdapterColumnDescProps, LocalDataProvider,
} from 'lineupjs';
import { select } from 'd3';
import { isInternalField } from '@/lib/typeUtils';
import vuetify from '@/plugins/vuetify';
import WindowInstanceMap from '@/lib/windowSizeUtils';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  network,
  selectedNodes,
  hoveredNodes,
  cellSize,
  sortOrder,
  lineupIsNested,
} = storeToRefs(store);

const lineup = ref<LineUp | null>(null);
const builder = ref<DataBuilder | null>(null);

const matrixWidth = ref(0);
const matrixResizeObserver = new ResizeObserver((a: ResizeObserverEntry[]) => { matrixWidth.value = a[0].target.parentElement?.clientWidth || 0; });
const matrixElement = document.getElementById('matrix');
if (matrixElement !== null) {
  matrixResizeObserver.observe(matrixElement);
}

const lineupWidth = computed(() => {
  const controlsElementWidth = vuetify.framework.application.left;
  const intermediaryElement = select<Element, Element>('#intNodeDiv').node();

  let availableSpace = WindowInstanceMap.innerWidth - controlsElementWidth - matrixWidth.value - 12; // 12 from the svg container padding
  if (intermediaryElement !== null) {
    availableSpace -= intermediaryElement.clientWidth;
  }
  return availableSpace < 280 ? 280 : availableSpace; // 280 is width of popover. clamping at 280 prevents ugly overlap
});

const lineupHeight = computed(() => {
  let possibleHeight = 500;
  if (network.value !== null && lineup.value !== null) {
    const tableHeader = lineup.value.node.getElementsByClassName('le-thead')[0];
    possibleHeight = tableHeader.clientHeight + (cellSize.value * network.value.nodes.length) + 34 + 24; // 34 padding-top, 24 is needed to remove scroll
  }

  return possibleHeight < 500 ? 500 : possibleHeight;
});

const lineupOrder = computed(() => {
  if (lineup.value === null || [...lineup.value.data.getFirstRanking().getOrder()].length === 0) {
    return [...Array(network.value?.nodes.length).keys()];
  }
  return [...lineup.value.data.getFirstRanking().getOrder()];
});

// If store order has changed, update lineup
let permutingMatrix = structuredClone(sortOrder.value);
watch(sortOrder, (newSortOrder) => {
  if (lineup.value !== null) {
    permutingMatrix = structuredClone(newSortOrder);
    lineup.value.data.getFirstRanking().setSortCriteria([]);
    const sortedData = newSortOrder.map((i) => (network.value !== null ? network.value.nodes[i] : {}));
    (lineup.value.data as LocalDataProvider).setData(sortedData);
  }
});

// If lineup order has changed, update matrix
watch(lineupOrder, () => {
  if (lineup.value !== null && network.value !== null) {
    lineup.value.data.getFirstRanking().setSortCriteria([]);
    const sortedData = sortOrder.value.map((i) => (network.value !== null ? network.value.nodes[i] : {}));
    (lineup.value.data as LocalDataProvider).setData(sortedData);
  }
});

// Helper functions
function idsToIndices(ids: string[]) {
  const sortedData = permutingMatrix.map((i) => (network.value !== null ? network.value.nodes[i] : null));

  return ids.map((nodeID) => sortedData.findIndex((node) => (node === null ? false : node._id === nodeID)));
}

// Update selection/hover from matrix
watchEffect(() => {
  // Convert the ids to indices
  const indices = [...new Set(idsToIndices([...selectedNodes.value.values(), ...hoveredNodes.value]))];

  if (lineup.value !== null) {
    lineup.value.setSelection(indices);
  }
});

function indicesToIDs(indices: number[]) {
  if (network.value !== null) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return indices.map((index) => network.value!.nodes[permutingMatrix[index]]._id);
  }
  return [];
}

function removeLineup() {
  const lineupDiv = document.getElementById('lineup');

  if (lineupDiv !== null) {
    lineupDiv.innerHTML = '';
  }

  lineup.value = null;
  builder.value = null;
}

function buildLineup() {
  const lineupDiv = document.getElementById('lineup');

  if (network.value !== null && lineupDiv !== null) {
    const columns = [...new Set(network.value.nodes.map((node) => Object.keys(node)).flat())].filter((column) => !isInternalField(column));

    builder.value = new DataBuilder(network.value.nodes);

    // Config adjustments
    builder.value
      .dynamicHeight(() => ({
        defaultHeight: cellSize.value - 2,
        padding: () => 2,
        height: () => cellSize.value - 2,
      }))
      .animated(false)
      .sidePanel(true, true); // enable: true, collapsed: true

    // Make the vis
    lineup.value = builder.value
      .deriveColumns(columns)
      .deriveColors()
      .defaultRanking()
      .build(lineupDiv);

    let lastHovered = '';

    // Add an event watcher to update highlighted nodes
    lineup.value.on('highlightChanged', (dataIndex: number) => {
      if (dataIndex === -1) {
        return;
      }

      // Transform data indices to multinet `_id`s
      const hoveredIDs: string[] = indicesToIDs([dataIndex]);

      // Remove previously hovered node and track what is now hovered
      hoveredNodes.value = hoveredNodes.value.filter((hoveredNode) => hoveredNode !== lastHovered);

      // Hover the elements that are different to add/remove them from the store
      hoveredIDs.forEach((nodeID) => hoveredNodes.value.push(nodeID));

      [lastHovered] = hoveredIDs;
    });

    lineup.value.data.getFirstRanking().on('groupsChanged', (oldSortOrder: number[], newSortOrder: number[], oldGroups: { name: string }[], newGroups: { name: string }[]) => {
      if (JSON.stringify(oldGroups.map((group) => group.name)) !== JSON.stringify(newGroups.map((group) => group.name))) {
        if (lineup.value !== null && lineup.value.data.getFirstRanking().getGroupCriteria().length > 0) {
          const columnDesc = lineup.value.data.getFirstRanking().getGroupCriteria()[0].desc as IBuilderAdapterColumnDescProps;
          store.aggregateNetwork(columnDesc.column);
        }
      }
    });
  }
}

watchEffect(() => {
  if (lineup.value !== null) {
    lineupIsNested.value = lineup.value.data.getFirstRanking().flatColumns.map((col: Column) => col.desc.type).includes('nested');
  }
});

onMounted(() => {
  buildLineup();
});

watch(network, () => {
  removeLineup();
  buildLineup();
});

watch(cellSize, () => {
  if (lineup.value !== null) {
    lineup.value.update();
  }
});

function removeHighlight() {
  hoveredNodes.value = [];
}
</script>

<template>
  <div
    id="lineup"
    :style="`width: ${lineupWidth}px; height: ${lineupHeight}px`"
    @mouseleave="removeHighlight"
  />
</template>

<style>
#lineup {
  padding-top: 34px;
}

.le-th {
  margin-bottom: 0 !important;
}

.le-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>
