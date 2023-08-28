<script setup lang="ts">
import {
  Cell, Edge, Node, ArangoPath,
} from '@/types';
import {
  scaleBand, select, selectAll, transition,
} from 'd3';
import { useStore } from '@/store';
import LineUp from '@/components/LineUp.vue';
import IntermediaryNodes from '@/components/IntermediaryNodes.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import {
  computed, onMounted, ref, watch,
} from 'vue';
import PathTable from '@/components/PathTable.vue';
import { storeToRefs } from 'pinia';
import { isInternalField } from '@/lib/typeUtils';
import EdgeSlices from './EdgeSlices.vue';

const store = useStore();
const {
  showPathTable,
  connectivityMatrixPaths,
  lineupIsNested,
  showIntNodeVis,
  labelVariable,
  cellSize,
  selectedNodes,
  selectedCell,
  network,
  directionalEdges,
  selectNeighbors,
  showGridLines,
  aggregated,
  degreeFiltered,
  cellColorScale,
  parentColorScale,
  sortOrder,
  hoveredNodes,
  rightClickMenu,
  maxConnections,
  selectedHops,
  slicedNetwork,
  expandedNodeIDs,
} = storeToRefs(store);

const tooltip = ref(null);
const visMargins = ref({
  left: 75, top: 110, right: 1, bottom: 1,
});
const matrix = ref<Cell[][]>([]);
const finishedMounting = ref(false);

const matrixWidth = computed(() => (network.value !== null
  ? network.value.nodes.length * cellSize.value + visMargins.value.left + visMargins.value.right
  : 0));
const matrixHeight = computed(() => (network.value !== null
  ? network.value.nodes.length * cellSize.value + visMargins.value.top + visMargins.value.bottom
  : 0));
const rowOrderingScale = computed(() => scaleBand<number>()
  .domain(sortOrder.value.row)
  .range([0, sortOrder.value.row.length * cellSize.value]));
const columnOrderingScale = computed(() => scaleBand<number>()
  .domain(sortOrder.value.column)
  .range([0, sortOrder.value.column.length * cellSize.value]));

// Helpers
function isCell(element: unknown): element is Cell {
  return Object.prototype.hasOwnProperty.call(element, 'cellName');
}

function capitalizeFirstLetter(word: string) {
  return word[0].toUpperCase() + word.slice(1);
}

function hoverNode(nodeID: string) {
  hoveredNodes.value = [...hoveredNodes.value, nodeID];
}

function unHoverNode(nodeID: string) {
  hoveredNodes.value = hoveredNodes.value.filter((hoveredNode) => hoveredNode !== nodeID);
}

function hoverEdge(cell: Cell) {
  hoverNode(cell.rowID);
  hoverNode(cell.colID);
}

function unHoverEdge(cell: Cell) {
  unHoverNode(cell.rowID);
  unHoverNode(cell.colID);
}

const toolbarHeight = 48;
function showToolTip(event: MouseEvent, networkElement: Cell | Node): void {
  let message = '';

  if (isCell(networkElement)) {
    // Get edge source and target
    message = `
          Row ID: ${networkElement.rowID} <br/>
          Col ID: ${networkElement.colID} <br/>
          Number of edges: ${networkElement.z}`;
  } else {
    // Loop through other props to add to tooltip
    Object.keys(networkElement).forEach((key) => {
      if (!isInternalField(key)) {
        message += `${capitalizeFirstLetter(key)}: ${networkElement[key]} <br/>`;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(tooltip.value as any)
    .style('left', `${event.offsetX + 25}px`)
    .style('top', `${event.offsetY + 10}px`)
    .html(message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .transition(transition().delay(100).duration(200) as any)
    .style('opacity', 0.9);
}

function hideToolTip() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(tooltip.value as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .transition(transition().delay(100).duration(200) as any)
    .style('opacity', 0);
}

function showContextMenu(event: MouseEvent, nodeID?: string) {
  rightClickMenu.value = {
    show: true,
    top: event.y,
    left: event.x,
    nodeID,
  };

  event.preventDefault();
}

watch(hoveredNodes, () => {
  if (network.value === null) {
    return;
  }

  // Apply column highlight
  selectAll('#matrix > .column')
    .data(network.value.nodes)
    .classed('hovered', (node) => hoveredNodes.value.indexOf(node._id) !== -1);

  // Apply row highlight
  selectAll('#matrix > .row')
    .data(network.value.nodes)
    .classed('hovered', (node) => hoveredNodes.value.indexOf(node._id) !== -1);
});

function processData(): void {
  // Reset some values that will be re-calcuated
  let maxNumConnections = 0;
  let maxAggrConnections = 0;
  matrix.value = [];

  const idMap: { [key: string]: number } = {};

  if (network.value !== null) {
    network.value.nodes.forEach((node: Node, index: number) => {
      idMap[node._id] = index;
    });
  }

  if (network.value !== null) {
    network.value.nodes.forEach((rowNode: Node, i: number) => {
      if (network.value !== null) {
        matrix.value[i] = network.value.nodes.map((colNode: Node) => ({
          cellName: `${rowNode._id}_${colNode._id}`,
          rowCellType: rowNode._type,
          colCellType: colNode._type,
          correspondingCell: `${colNode._id}_${rowNode._id}`,
          rowID: rowNode._id,
          colID: colNode._id,
          z: 0,
        }));
      }
    });

    // Count occurrences of edges and store it in the matrix
    network.value.edges.forEach((edge: Edge) => {
      // If nodes don't exist, don't add to matrix
      if (
        !(network.value !== null
        && network.value.nodes.findIndex((node) => node._id === edge._from) > -1
        && network.value.nodes.findIndex((node) => node._id === edge._to) > -1)
      ) {
        return;
      }

      matrix.value[idMap[edge._from]][idMap[edge._to]].z += 1;

      if (!directionalEdges.value) {
        matrix.value[idMap[edge._to]][idMap[edge._from]].z += 1;
      }
    });
  }

  // Find max value of z
  matrix.value.forEach((row: Cell[]) => {
    row.forEach((cell: Cell) => {
      if (cell.rowCellType === undefined && cell.colCellType === undefined && cell.z > maxNumConnections) {
        maxNumConnections = cell.z;
      }
      if ((cell.rowCellType === 'supernode' || cell.colCellType === 'supernode') && cell.z > maxAggrConnections) {
        maxAggrConnections = cell.z;
      }
    });
  });

  maxConnections.value = {
    unAggr: maxNumConnections,
    parent: maxAggrConnections,
  };
}

onMounted(() => {
  finishedMounting.value = true;
});

watch([sortOrder, showGridLines, network, directionalEdges, labelVariable], () => processData());

processData();

const highlightLength = computed(() => matrix.value.length * cellSize.value);
const labelFontSize = computed(() => 0.8 * cellSize.value);
const labelWidth = 60;
const colLabelWidth = 100;
const invisibleRectSize = 11;

function clickElement(matrixElement: Node | Cell) {
  if (isCell(matrixElement)) {
    if (connectivityMatrixPaths.value.paths.length > 0) {
      const pathIdList: number[] = [];
      connectivityMatrixPaths.value.paths.forEach((path: ArangoPath, i: number) => {
        if (path.vertices[0]._id === matrixElement.rowID && path.vertices[selectedHops.value]._id === matrixElement.colID) {
          pathIdList.push(i);
        }
      });
      if (pathIdList.length > 0) {
        store.setSelectedConnectivityPaths(pathIdList);
        showPathTable.value = true;
      } else {
        showPathTable.value = false;
      }
    }

    selectedCell.value = matrixElement.cellName;
  } else {
    store.clickElement(matrixElement._id);
  }
}

const expandPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M11,7H13V11H17V13H13V17H11V13H7V11H11V7Z';
const retractPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M17,11V13H7V11H17Z';

function expandOrRetractRow(node: Node) {
  if (aggregated.value || degreeFiltered.value) {
    if (node._type !== 'supernode') {
      return;
    }
    // expand and retract the supernode aggregation based on user selection
    if (expandedNodeIDs.value.includes(node._id)) {
      // retract
      store.retractAggregatedNode(node._id);
    } else {
      // expand
      store.expandAggregatedNode(node._id);
    }
  } else {
    store.clickElement(node._id);
  }
}

const neighborsOfClicked = computed(() => [...selectedNodes.value.values()].map((nodeID) => {
  if (network.value !== null) {
    const foundNode = network.value.nodes.find((n) => n._id === nodeID);
    return foundNode !== undefined ? foundNode.neighbors : [];
  }
  return [];
}).flat());

function clickedNeighborClass(node: Node) {
  const clicked = selectedNodes.value.includes(node._id) ? 'clicked' : '';
  const neighbor = !clicked && neighborsOfClicked.value.includes(node._id) && selectNeighbors.value ? 'neighbor' : '';
  // const hovered = hoveredNodes.value.includes(node._id) ? 'hovered' : '';

  return `${clicked} ${neighbor}`;
}
</script>

<template>
  <v-container style="width: unset; max-width: unset; overflow: auto;">
    <EdgeSlices v-if="slicedNetwork.length > 0" />

    <div style="display: flex; min-width: fit-content;">
      <svg
        :width="matrixWidth"
        :height="matrixHeight"
        :viewbox="`0 0 ${matrixWidth} ${matrixHeight}`"
        :style="`margin-top: ${lineupIsNested ? 14 : 2}px; float: left; min-width: ${matrixWidth}px;`"
        @contextmenu="showContextMenu"
      >
        <g
          id="matrix"
          :transform="`translate(${visMargins.left},${visMargins.top})`"
        >
          <!-- Columns -->
          <g
            v-for="node, i of network.nodes"
            :key="`${node._id}_col`"
            :transform="`translate(${columnOrderingScale(i)})rotate(-90)`"
            class="column"
            :class="clickedNeighborClass(node)"
          >
            <rect
              class="highlightContainer"
              :width="highlightLength + visMargins.top + visMargins.bottom"
              :height="cellSize"
              :x="-highlightLength - visMargins.bottom"
              fill-opacity="0"
              @mouseover="(event) => { showToolTip(event, node); hoverNode(node._id); }"
              @mouseout="(event) => { hideToolTip(); unHoverNode(node._id); }"
              @click="clickElement(node)"
              @contextmenu="e => { e.stopPropagation(); showContextMenu(e, node._id) }"
            />
            <foreignObject
              :width="colLabelWidth"
              :height="cellSize"
              x="5"
            >
              <p
                :style="`margin-top: ${cellSize * -0.1}px; font-size: ${labelFontSize}px; color: ${(aggregated && node._type !== 'supernode') || (degreeFiltered && node._type !== 'supernode') ? '#AAAAAA' : '#000000'}`"
                class="label colLabel"
              >
                {{ node._type === 'supernode' || labelVariable === undefined ? node['_key'] : node[labelVariable] }}
              </p>
            </foreignObject>
          </g>

          <!-- Rows -->
          <g
            v-for="node, i of network.nodes"
            :key="`${node._id}_row`"
            :transform="`translate(0,${rowOrderingScale(i)})`"
            class="row"
            :class="clickedNeighborClass(node)"
          >
            <rect
              class="highlightContainer"
              :width="highlightLength + visMargins.left + visMargins.right"
              :height="cellSize"
              :x="-visMargins.left"
              fill-opacity="0"
              @mouseover="(event) => { showToolTip(event, node); hoverNode(node._id); }"
              @mouseout="(event) => { hideToolTip(); unHoverNode(node._id); }"
              @click="clickElement(node)"
            />
            <foreignObject
              :width="labelWidth"
              :height="cellSize"
              :x="-labelWidth"
            >
              <p
                :style="`margin-top: ${cellSize * -0.1}px; font-size: ${labelFontSize}px; color: ${aggregated && (node._type !== 'supernode') ? '#AAAAAA' : '#000000'}`"
                class="label"
              >
                {{ node._type === 'supernode' || labelVariable === undefined ? node['_key'] : node[labelVariable] }}
              </p>
            </foreignObject>

            <!-- Clickable row expand/retract -->
            <path
              v-if="node._type === 'supernode'"
              :d="expandedNodeIDs.includes(node._id) ? retractPath : expandPath"
              :transform="`translate(-73, ${(cellSize - invisibleRectSize) / 2})scale(0.5)`"
              fill="#8B8B8B"
            />
            <rect
              v-if="node._type === 'supernode'"
              :transform="`translate(-73, ${(cellSize - invisibleRectSize) / 2})`"
              width="10"
              height="10"
              opacity="0"
              @click="expandOrRetractRow(node)"
            />

            <!-- Cells -->
            <g class="cellsGroup">
              <rect
                v-for="cell, idx in matrix[i]"
                :key="cell.cellName"
                :x="columnOrderingScale(idx) + 1"
                y="1"
                :width="cellSize - 2"
                :height="cellSize - 2"
                :fill="(cell.rowCellType === 'supernode' || cell.colCellType === 'supernode') ? parentColorScale(cell.z) : cellColorScale(cell.z)"
                :fill-opacity="cell.z"
                :class="selectedCell === cell.cellName ? 'cell clicked' : ''"
                @mouseover="(event) => { showToolTip(event, cell); hoverEdge(cell); }"
                @mouseout="(event) => { hideToolTip(); unHoverEdge(cell); }"
                @click="clickElement(cell)"
              />
            </g>
          </g>
        </g>
        <g
          v-if="showGridLines"
          class="gridLines"
          transform="translate(75,110)"
        >
          <!-- Vertical grid lines -->
          <line
            v-for="node, i of network.nodes"
            :key="`${node._id}_vertical_gridline`"
            :transform="`translate(${columnOrderingScale(i)},0)rotate(-90)`"
            :x1="-columnOrderingScale.range()[1]"
          />
          <!-- Add last vertical grid line -->
          <line
            :transform="`translate(${columnOrderingScale.range()[1]},0)rotate(-90)`"
            :x1="-columnOrderingScale.range()[1]"
          />

          <!-- Horizontal grid lines -->
          <line
            v-for="node, i of network.nodes"
            :key="`${node._id}_horizontal_gridline`"
            :transform="`translate(0,${rowOrderingScale(i)})`"
            :x2="rowOrderingScale.range()[1]"
          />
          <!-- Add last horizontal grid line -->
          <line
            :transform="`translate(0,${rowOrderingScale.range()[1]})`"
            :x2="rowOrderingScale.range()[1]"
          />
        </g>
      </svg>
      <intermediary-nodes v-if="finishedMounting && showIntNodeVis" />
      <line-up v-if="finishedMounting" />
    </div>

    <div
      id="tooltip"
      ref="tooltip"
    />
    <path-table v-if="showPathTable" />
    <context-menu />
  </v-container>
</template>

<style scoped>
svg:deep(.colLabel) {
  max-width: 100px !important;
}

svg:deep(.label) {
  max-width: 60px;
  text-overflow: ellipsis;
  overflow: hidden;
  z-index: 100;
  margin: 0;
}

/* cell state */
svg:deep(.hoveredCell) {
  stroke-width: 1px;
  stroke: darkgray;
}
svg:deep(.cell.clicked) {
  stroke: red;
  stroke-width: 3;
}

/* highlightContainer state */
svg:deep(.hovered > .highlightContainer) {
  fill: #fde8ca;
  fill-opacity: 1 !important;
}
svg:deep(.clicked > .highlightContainer) {
  font-weight: 800;
  fill: #f8cf91;
  fill-opacity: 1;
}
svg:deep(.neighbor > .highlightContainer) {
  fill: #caffc7;
  fill-opacity: 1;
}

/* foreignObject state */
svg:deep(foreignObject) {
  pointer-events: none;
}
svg:deep(.clicked > foreignObject) {
  font-weight: 650;
  fill: black !important;
}

/* Tooltip */
#tooltip {
  position: absolute;
  opacity: 0;
  font-size: 12.5px;
  background: white;
  color: black;
  border-radius: 5px;
  padding: 5px;
  pointer-events: none;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  max-width: 400px;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* gridLines */
svg:deep(.gridLines) {
  pointer-events: none;
  stroke: #BBBBBB;
}
</style>
