<script setup lang="ts">
import store from '@/store';
import {
  computed, onMounted, Ref, ref, watch, watchEffect,
} from 'vue';
import LineUp, {
  Column, DataBuilder, IBuilderAdapterColumnDescProps, LocalDataProvider,
} from 'lineupjs';
import { select } from 'd3-selection';
import { isInternalField } from '@/lib/typeUtils';
import vuetify from '@/plugins/vuetify';
import WindowInstanceMap from '@/lib/windowSizeUtils';

const network = computed(() => store.state.network);
const selectedNodes = computed(() => store.state.selectedNodes);
const hoveredNodes = computed(() => store.state.hoveredNodes);
const cellSize = computed(() => store.state.cellSize);

const lineup: Ref<LineUp | null> = ref(null);
const builder: Ref<DataBuilder | null> = ref(null);

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

let lineupIsSorter = false;
const sortOrder = computed(() => store.state.sortOrder);
const lineupOrder = computed(() => {
  if (lineup.value === null || [...lineup.value.data.getFirstRanking().getOrder()].length === 0) {
    return [...Array(network.value?.nodes.length).keys()];
  }
  return [...lineup.value.data.getFirstRanking().getOrder()];
});

// If store order has changed, update lineup
let permutingMatrix = structuredClone(store.state.sortOrder);
watch(sortOrder, (newSortOrder) => {
  if (lineup.value !== null && !lineupIsSorter) {
    permutingMatrix = structuredClone(newSortOrder);
    lineup.value.data.getFirstRanking().setSortCriteria([]);
    const sortedData = newSortOrder.map((i) => (network.value !== null ? network.value.nodes[i] : {}));
    (lineup.value.data as LocalDataProvider).setData(sortedData);
  }

  lineupIsSorter = false;
});

// If lineup order has changed, update matrix
watch(lineupOrder, (newLineupOrder) => {
  // If sort order has less length than number of nodes, we've filtered sort those nodes to the top
  if (network.value !== null && newLineupOrder.length < network.value.nodes.length) {
    return;
  }

  if (lineup.value !== null && network.value !== null && lineupIsSorter) {
    const newSortOrder = newLineupOrder.map((i) => permutingMatrix[i]);
    store.commit.setSortOrder(newSortOrder);
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
      store.commit.removeHoveredNode(lastHovered);

      // Hover the elements that are different to add/remove them from the store
      hoveredIDs.forEach((nodeID) => store.commit.pushHoveredNode(nodeID));

      [lastHovered] = hoveredIDs;
    });

    lineup.value.data.getFirstRanking().on('orderChanged', (oldOrder, newOrder, _, __, eventType) => {
      if ((eventType as string[]).includes('sort_changed')) {
        lineupIsSorter = true;
      }
    });

    lineup.value.data.getFirstRanking().on('groupsChanged', (oldSortOrder: number[], newSortOrder: number[], oldGroups: { name: string }[], newGroups: { name: string }[]) => {
      if (JSON.stringify(oldGroups.map((group) => group.name)) !== JSON.stringify(newGroups.map((group) => group.name))) {
        if (lineup.value !== null && lineup.value.data.getFirstRanking().getGroupCriteria().length > 0) {
          const columnDesc = lineup.value.data.getFirstRanking().getGroupCriteria()[0].desc as IBuilderAdapterColumnDescProps;
          store.dispatch.aggregateNetwork(columnDesc.column);
        }
      }
    });
  }
}

watchEffect(() => {
  if (lineup.value !== null) {
    store.commit.setLineUpIsNested(lineup.value.data.getFirstRanking().flatColumns.map((col: Column) => col.desc.type).includes('nested'));
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
  store.commit.clearHoveredNodes();
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
  z-index: 1;
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
