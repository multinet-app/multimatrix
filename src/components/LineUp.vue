<script setup lang="ts">
import { useStore } from '@/store';
import {
  computed, onMounted, ref, watch, watchEffect,
} from 'vue';
import LineUp, {
  Column, DataBuilder, IBuilderAdapterColumnDescProps, LocalDataProvider,
} from 'lineupjs';
import { isInternalField } from '@/lib/typeUtils';
import { storeToRefs } from 'pinia';
import { arraysAreEqual } from '@/lib/provenanceUtils';

const store = useStore();
const {
  network,
  selectedNodes,
  hoveredNodes,
  cellSize,
  sortOrder,
  lineupIsNested,
  sortBy,
} = storeToRefs(store);

const lineup = ref<LineUp | null>(null);
const builder = ref<DataBuilder | null>(null);

const matrixWidth = ref(0);
const matrixResizeObserver = new ResizeObserver((a: ResizeObserverEntry[]) => { matrixWidth.value = a[0].target.parentElement?.clientWidth || 0; });
const matrixElement = document.getElementById('matrix');
if (matrixElement !== null) {
  matrixResizeObserver.observe(matrixElement);
}

const lineupOrder = ref<number[]>(Array.from({ length: network.value !== null ? network.value.nodes.length : 0 }, (_, i) => i));

function hideIndexColumn(lineupDiv: HTMLElement) {
  const colNumber = [...lineupDiv.getElementsByClassName('lu-th-label')]
    .filter((label) => (label as HTMLElement).innerText === '_index')[0]
    .parentElement?.getAttribute('data-id');
  const elements = document.querySelectorAll(`[data-id="${colNumber}"]:not(.hidden)`);

  if (elements.length > 2) {
    elements.forEach((element) => {
      element.classList.add('hidden');
    });
  } else {
    // Retry after 100ms
    setTimeout(() => {
      hideIndexColumn(lineupDiv);
    }, 200);
  }
}

// If store order has changed, update lineup
watch(sortOrder, (newSortOrder) => {
  if (
    lineup.value !== null
    && newSortOrder.row.length === lineupOrder.value.length
    && !arraysAreEqual(newSortOrder.row, lineupOrder.value)
  ) {
    // Update the index column
    newSortOrder.row.forEach((sortIndex, i) => {
      (lineup.value?.data as LocalDataProvider).data[sortIndex]._index = i;
    });

    // Sort the index column
    const col = (lineup.value.data as LocalDataProvider).find((d) => d.desc.label === '_index');
    col?.markDirty('values'); // tell lineup that
    col?.sortByMe(true);
  }
});

// If lineup order has changed, update matrix
watch(lineupOrder, (newOrder) => {
  hideIndexColumn(document.getElementById('lineup') as HTMLElement);
  // If the order is empty, don't update
  if (newOrder.length === 0) {
    return;
  }
  // If the order is the same as the matrix, don't update
  if (arraysAreEqual(newOrder, sortOrder.value.row)) {
    sortBy.value.lineup = null;
    return;
  }
  // Otherwise, update the matrix with the lineup sort order
  sortBy.value = {
    lineup: newOrder,
    network: null,
    node: null,
  };
});

// Helper functions
function idsToIndices(ids: string[]) {
  return ids.map((nodeID) => network.value.nodes.findIndex((node) => (node === null ? false : node._id === nodeID)));
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
    return indices.map((index) => network.value?.nodes[index]._id);
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
    // Clone the data to avoid modifying the store and add an index column
    const childrenKeys = [...new Set(network.value.nodes.map((node) => (node.children ? Object.keys(node.children[0]) : [])).flat())];
    const childrenKeysObject = Object.fromEntries(childrenKeys.map((key) => [key, null]));
    const lineupData = structuredClone(network.value.nodes).map((node, i) => ({ ...node, ...(node.children ? childrenKeysObject : {}), _index: i }));
    const columns = [...new Set(lineupData.map((node) => Object.keys(node)).flat())].filter((column) => !isInternalField(column));

    builder.value = new DataBuilder(lineupData);

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

    // Hide the index column
    hideIndexColumn(lineupDiv);

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

    lineup.value?.data.on('orderChanged', (oldOrder, newOrder, c, d, reasonArray) => {
      if (reasonArray[0] === 'group_changed') {
        return;
      }
      lineupOrder.value = newOrder;
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

const labelFontSize = computed(() => `${0.8 * cellSize.value}px`);
</script>

<template>
  <div
    id="lineup"
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

.le-body {
  overflow: hidden !important;
}

.le-td {
  font-size: v-bind(labelFontSize);
}

.hidden {
  display: none !important;
}
</style>
