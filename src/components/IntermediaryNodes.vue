<script lang="ts">
import {
  computed, onMounted, ref, Ref, watch, watchEffect,
} from '@vue/composition-api';
import {
  scaleLinear,
} from 'd3-scale';
import { select } from 'd3-selection';
import store from '@/store';
import { ArangoPath, ConnectivityCell } from '@/types';

export default {
  name: 'IntermediaryNodes',

  setup() {
    const intNodeSVG = ref(null);
    const network = computed(() => store.state.network);
    const connectivityPaths = computed(() => store.state.connectivityMatrixPaths);
    const matrix: ConnectivityCell[][] = [];
    const cellSize = computed(() => store.state.cellSize);
    const pathLength = computed(() => connectivityPaths.value.paths[0].vertices.length);
    const edgeLength = computed(() => connectivityPaths.value.paths[0].edges.length);

    const margin = {
      top: 79,
      right: 50,
      bottom: 0,
      left: 40,
    };
    const matrixWidth: Ref<number> = ref(0);
    const matrixHeight: Ref<number> = ref(0);

    watchEffect(() => {
      matrixWidth.value = connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.paths[0].edges.length * cellSize.value + margin.left + margin.right : 0;
    });

    watchEffect(() => {
      matrixHeight.value = connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0;
    });

    const intNodeWidth = computed(() => (store.state.connectivityMatrixPaths.nodes.length > 0
      ? store.state.connectivityMatrixPaths.nodes.length * cellSize.value + margin.left + margin.right
      : 0));
    const sortOrder = computed(() => store.state.connectivityMatrixPaths.nodes.map((node) => node._key).sort());
    const yScale = scaleLinear().domain([0, sortOrder.value.length]).range([0, sortOrder.value.length * cellSize.value]);
    const xScale = scaleLinear().domain([0, (edgeLength.value - 1)]).range([0, (connectivityPaths.value.paths[0].edges.length - 1) * cellSize.value]);

    const opacity = scaleLinear().domain([0, 0]).range([0, 1]).clamp(true);

    function processData() {
      if (network.value !== null && intNodeSVG !== null && connectivityPaths.value.nodes.length > 0) {
        const hops: number = edgeLength.value - 1;

        // Set up matrix intermediate nodes x # of hops
        sortOrder.value.forEach((rowNode, i) => {
          matrix[i] = [...Array(hops).keys()].slice(0).map((j: number) => ({
            cellName: `${rowNode}`,
            nodePosition: j + 1,
            startingNode: '',
            endingNode: '',
            x: j,
            y: i,
            z: 0,
            paths: [],
          }));
        });

        // Set up number of connections based on paths
        // Record associated paths
        connectivityPaths.value.paths.forEach((path: ArangoPath, i: number) => {
          matrix.forEach((matrixRow) => {
            [...Array(hops).keys()].slice(0).forEach((j) => {
              if (path.vertices[j + 1]._key === matrixRow[j].cellName) {
                // eslint-disable-next-line no-param-reassign
                matrixRow[j].z += 1;
                matrixRow[j].paths.push(i);
              }
            });
          });
        });
      }

      //   Update opacity
      const allPaths = matrix.map((row: ConnectivityCell[]) => row.map((cell: ConnectivityCell) => cell.z)).flat();
      const maxPath = allPaths.reduce((a, b) => Math.max(a, b));
      opacity.domain([
        0,
        maxPath,
      ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function makeRow(this: any, rowData: ConnectivityCell[]) {
      const cell = select(this)
        .selectAll('rect')
        .data(rowData)
        .enter()
        .append('rect')
        .attr('x', (d: ConnectivityCell) => yScale(d.x))
        .attr('y', 1)
        .attr('width', cellSize.value - 2)
        .attr('height', cellSize.value - 2)
        .style('fill-opacity', (d: ConnectivityCell) => opacity(d.z))
        .style('fill', 'blue');

      cell.append('title').text((d: ConnectivityCell) => `${d.cellName} in ${d.z} paths`);
    }

    function buildIntView() {
      if (matrix.length > 0) {
        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        //   Draw path symbols
        const circles = svg.selectAll('g.circles')
          .data([...Array(pathLength.value).keys()])
          .enter()
          .append('g')
          .attr('transform', `translate(${matrixWidth.value * 0.13}, -${margin.top / 4})`);

        circles.append('circle')
          .attr('class', 'circleIcons')
          .attr('cx', (_, i: number) => xScale(i))
          .attr('cy', 0)
          .attr('r', cellSize.value / 2)
          .attr('fill', (_, i: number) => (i !== 0 && i !== (pathLength.value - 1) ? 'lightgrey' : 'none'));

        circles.append('text')
          .attr('x', (_, i: number) => xScale(i))
          .attr('y', cellSize.value / 2 - 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', `${cellSize.value - 2}px`)
          .text((_, i: number) => i + 1);

        //   Draw gridlines
        const gridLines = svg.append('g')
          .append('g')
          .attr('class', 'gridLines');

        const horizontalLines = gridLines.selectAll('line')
          .data(matrix)
          .enter();

        const verticalLines = gridLines.selectAll('line')
          .data([...Array(edgeLength.value).keys()])
          .enter();

        // vertical grid lines
        verticalLines
          .append('line')
          .attr('x1', -yScale.range()[1])
          .attr('y1', 0)
          .attr('y2', yScale.range()[1])
          .attr('x1', (_, i: number) => xScale(i))
          .attr('x2', (_, i: number) => xScale(i))
          .attr('transform', `translate(${matrixWidth.value * 0.2 - 1},0)`);

        // horizontal grid lines
        horizontalLines
          .append('line')
          .attr('x1', 0)
          .attr('x2', xScale.range()[1] - 1)
          .attr('y1', (_, i: number) => yScale(i))
          .attr('y2', (_, i: number) => yScale(i))
          .attr('transform', `translate(${matrixWidth.value * 0.2},0)`);

        // horizontal grid line edges
        gridLines
          .append('line')
          .attr('x1', 0)
          .attr('x2', xScale.range()[1])
          .attr('y1', yScale.range()[1])
          .attr('y2', yScale.range()[1])
          .attr('transform', `translate(${matrixWidth.value * 0.2},0)`);

        //   Draw rows
        svg
          .selectAll('g.row')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'row')
          .attr('transform', (_, i: number) => `translate(${matrixWidth.value * 0.2},${yScale(i)})`)
          .each(makeRow)
          .append('text')
          .attr('class', 'label')
          .attr('y', cellSize.value / 2 + 5)
          .attr('x', -(matrixWidth.value * 0.33))
          .text((_, i: number) => sortOrder.value[i]);

        //   Draw columns
        svg
          .selectAll('g.column')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'column')
          .attr('transform', (_, i: number) => `translate(${xScale(i)}, 0)rotate(-90)`);
      }
    }

    onMounted(() => {
      processData();
      buildIntView();
    });

    watch(connectivityPaths, () => {
      processData();
      buildIntView();
    });

    return {
      intNodeSVG,
      intNodeWidth,
      matrixWidth,
      matrixHeight,
    };
  },
};
</script>

<template>
  <div
    id="intNodeDiv"
    :style="`width: ${intNodeWidth}px;`"
  >
    <svg
      id="intNode"
      ref="intNodeSVG"
      :width="matrixWidth"
      :height="matrixHeight"
      :viewbox="`0 0 ${matrixWidth} ${matrixHeight}`"
    />
  </div>
</template>

<style scoped>
svg >>> .gridLines {
  pointer-events: none;
  stroke: #BBBBBB;
}

svg >>> .circleIcons {
    stroke: black;
    stroke-width: 1;
}
</style>
