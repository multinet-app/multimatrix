<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear, group } from 'd3';
import { useStore } from '@/store';
import { ConnectivityCell } from '@/types';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  network,
  connectivityMatrixPaths,
  cellSize,
  showPathTable,
  intAggregatedBy,
  maxIntConnections,
} = storeToRefs(store);

const pathLength = computed(() => connectivityMatrixPaths.value.paths[0].vertices.length);
const edgeLength = computed(() => connectivityMatrixPaths.value.paths[0].edges.length);
const circleRadius = computed(() => cellSize.value / 2);
const cellFontSize = computed(() => cellSize.value * 0.8);

const margin = {
  top: 110,
  right: 50,
  bottom: 0,
  left: 40,
};
const matrixHeight = computed(() => (connectivityMatrixPaths.value.nodes.length > 0 ? connectivityMatrixPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0));

const intNodeWidth = computed(() => (connectivityMatrixPaths.value.nodes.length > 0
  ? margin.left + (pathLength.value + 1) * cellSize.value
  : 0));
const sortOrder = computed(() => connectivityMatrixPaths.value.nodes.map((node) => node._key).sort());
const yScale = computed(() => scaleLinear().domain([0, sortOrder.value.length]).range([0, sortOrder.value.length * cellSize.value]));
const xScale = computed(() => scaleLinear().domain([0, (edgeLength.value - 1)]).range([0, (connectivityMatrixPaths.value.paths[0].edges.length - 1) * cellSize.value]));
const hops = computed(() => edgeLength.value - 1);
const opacity = scaleLinear().domain([0, 0]).range([0, 1]).clamp(true);

const matrixData = computed(() => {
  let matrix: ConnectivityCell[][] = [];
  if (network.value !== null && connectivityMatrixPaths.value.nodes.length > 0) {
    let sortconnectivityMatrixPaths = [];
    const sortKey = intAggregatedBy.value === undefined ? '_key' : intAggregatedBy.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sortconnectivityMatrixPaths = structuredClone(connectivityMatrixPaths.value).nodes.sort((a: any, b: any) => (a[sortKey] > b[sortKey] ? 1 : -1));

    // Set up matrix intermediate nodes x # of hops.value
    sortconnectivityMatrixPaths.forEach((rowNode, i) => {
      matrix[i] = [...Array(hops.value).keys()].slice(0).map((j) => ({
        cellName: `${rowNode._key}`,
        nodePosition: j + 1,
        startingNode: '',
        endingNode: '',
        x: j,
        y: i,
        z: 0,
        paths: [],
        label: `${rowNode[sortKey]}`,
        keys: [`${rowNode._key}`],
      }));
    });

    // Set up number of connections based on paths
    // Record associated paths
    connectivityMatrixPaths.value.paths.forEach((path, i) => {
      matrix.forEach((matrixRow) => {
        [...Array(hops.value).keys()].slice(0).forEach((j) => {
          if (path.vertices[j + 1]._key === matrixRow[j].cellName) {
            matrixRow[j].z += 1;
            matrixRow[j].paths.push(i);
          }
        });
      });
    });
  }

  //   Update opacity
  const allPaths = matrix.map((row) => row.map((cell) => cell.z)).flat();
  const maxPath = Math.max(...allPaths);
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  maxIntConnections.value = maxPath;
  opacity.domain([
    0,
    maxPath,
  ]);
  // Aggregate by label
  if (intAggregatedBy.value !== undefined) {
    const newMatrix: ConnectivityCell[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arrayColumn = (arr: any, n: number) => arr.map((x: any) => x[n]);

    [...Array(hops.value).keys()].slice(0).forEach((i) => {
      const colConsolidated: [] = arrayColumn(matrix, i);
      const groupedCol = Object.fromEntries(group(colConsolidated, (d: ConnectivityCell) => d.label));
      const keys = Object.keys(groupedCol);

      newMatrix[i] = keys.map((key: string, j: number) => ({
        cellName: key,
        nodePosition: j + 1,
        startingNode: '',
        endingNode: '',
        x: j,
        y: i,
        z: groupedCol[key].map((cell) => cell.paths).flat().length,
        paths: groupedCol[key].map((cell) => cell.paths).flat(),
        label: key,
        keys: groupedCol[key].map((cell) => cell.keys).flat(),
      }));
    });
    // Transpose matrix
    matrix = newMatrix[0].map((_, colIndex) => newMatrix.map((row) => row[colIndex]));
  }
  return matrix;
});

function displayTable(paths: number[]) {
  store.setSelectedConnectivityPaths(paths);
  showPathTable.value = true;
}
</script>

<template>
  <div
    id="intNodeDiv"
    :style="`width: ${intNodeWidth}px;`"
  >
    <svg
      id="intNode"
      :width="intNodeWidth"
      :height="matrixHeight"
    >
      <g
        :transform="`translate(${margin.left},${margin.top})`"
      >
        <g
          v-for="(_, c) in pathLength"
          :key="`circles${c}`"
          :transform="`translate(${cellSize + xScale(c)}, ${(-circleRadius) - 5})`"
        >
          <circle
            class="circleIcons"
            :r="circleRadius"
            :fill="(c !== 0 && c !== (pathLength - 1) ? 'lightgrey' : 'none')"
          />
          <text
            :y="circleRadius / 2"
            :font-size="`${cellFontSize}px`"
            text-anchor="middle"
          >
            {{ c + 1 }}
          </text>
        </g>
        <g
          v-for="(row, i) in matrixData"
          :key="`row${i}`"
          :transform="`translate(0, ${yScale(i)})`"
        >
          <foreignObject
            :width="(0.5 * cellSize) + xScale(1) + cellSize"
            :height="cellSize"
            x="-20"
          >
            <p
              class="rowLabels"
              :style="`font-size: ${cellFontSize}px; margin-top: ${cellSize * -0.1}px;`"
            >
              {{ row[0].label.length === 0 ? `--` : `${row[0].label}` }}
            </p>
          </foreignObject>
          <rect
            v-for="(cell, j) in row"
            :id="`cell_${cell.cellName}_${j}`"
            :key="`cell${j}`"
            class="connectivityCell"
            :x="(0.5 * cellSize) + xScale(1) + (j * cellSize)"
            :width="cellSize"
            :height="cellSize"
            fill="blue"
            :fill-opacity="opacity(cell.z)"
            stroke="white"
            stroke-width="1"
            @click="displayTable(cell.paths)"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
svg:deep(.circleIcons) {
  stroke: black;
  stroke-width: 1;
}

svg:deep(.rowLabels) {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin: 0;
  fill: black !important;
  text-align: left;
}

svg:deep(.connectivityCell:hover) {
  cursor: pointer;
  stroke-width: 1px;
  stroke: black;
}
</style>
