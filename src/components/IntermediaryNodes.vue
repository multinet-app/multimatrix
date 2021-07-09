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
    const intNodeSVG = document.getElementById('intNode');
    const network = computed(() => store.state.network);
    const connectivityPaths = computed(() => store.state.connectivityMatrixPaths);
    const matrix: ConnectivityCell[][] = [];
    const cellSize = computed(() => store.state.cellSize);

    const margin = {
      top: 79,
      right: 25,
      bottom: 0,
      left: 25,
    };
    const matrixWidth: Ref<number> = ref(0);
    const matrixHeight: Ref<number> = ref(0);

    watchEffect(() => {
      matrixWidth.value = connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.paths[0].edges.length * cellSize.value + margin.left + margin.right : 0;
    });

    watchEffect(() => {
      matrixHeight.value = connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0;
    });
    // const matrixWidth = computed(() => (connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.paths[0].edges.length * cellSize.value + margin.left + margin.right : 0));
    // const matrixHeight = computed(() => (connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0));

    const intNodeWidth = computed(() => (store.state.connectivityMatrixPaths.nodes.length > 0
      ? store.state.connectivityMatrixPaths.nodes.length * cellSize.value + margin.left + margin.right
      : 0));
    const sortOrder = computed(() => store.state.connectivityMatrixPaths.nodes.map((node: Node) => node._id).sort());
    const xScale = scaleLinear().domain([0, sortOrder.value.length]).range([0, sortOrder.value.length * cellSize.value]);
    const yScale = scaleLinear().domain([0, (connectivityPaths.value.paths[0].edges.length - 1)]).range([0, (connectivityPaths.value.paths[0].edges.length - 1) * cellSize.value]);

    const opacity = scaleLinear().domain([0, 0]).range([0.25, 1]).clamp(true);

    function removeIntView() {
      if (intNodeSVG !== null) {
        intNodeSVG.innerHTML = '';
      }
    }

    function processData() {
      if (network.value !== null && intNodeSVG !== null && connectivityPaths.value.nodes.length > 0) {
        const hops: number = connectivityPaths.value.paths[0].edges.length - 1;

        // Set up matrix intermediate nodes x # of hops
        connectivityPaths.value.nodes.forEach((rowNode: Node, i: number) => {
          matrix[i] = [...Array(hops).keys()].slice(0).map((j: number) => ({
            cellName: `${rowNode._id}`,
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
              if (path.vertices[j + 1]._id === matrixRow[j].cellName) {
                // eslint-disable-next-line no-param-reassign
                matrixRow[j].z += 1;
                matrixRow[j].paths.push(i);
              }
            });
          });
        });
        console.log('MATRIX', matrix);
      }

      //   Update opacity
      const allPaths = matrix.map((row: ConnectivityCell[]) => row.map((cell: ConnectivityCell) => cell.z)).flat();
      const maxPath = allPaths.reduce((a, b) => Math.max(a, b));
      opacity.domain([
        0,
        maxPath,
      ]);
    }

    function makeRow(rowData: ConnectivityCell) {
      // set the radius for cells
      const cellRadius = 3;

      const cell = select(this)
        .selectAll('rect')
        .data(rowData)
        .enter()
        .append('rect')
        .attr('x', (d: ConnectivityCell) => xScale(d.x))
        .attr('rx', cellRadius)
        .attr('width', cellSize.value)
        .attr('height', cellSize.value)
        .style('fill-opacity', (d) => opacity(d.z))
        .style('fill', 'blue');

      cell.append('title').text((d: ConnectivityCell) => `${d.cellName} 
      in ${d.z} paths`);
    }

    function buildIntView() {
      if (matrix.length > 0) {
        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        //   Draw rows
        const row = svg
          .selectAll('g.row')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'row')
          .attr('transform', (_, i) => `translate(0,${xScale(i)})`)
          .each(makeRow);

        //   Draw columns
        svg
          .selectAll('g.column')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'column')
          .attr('transform', (_, i) => {
            console.log(yScale(i));
            return `translate(${yScale(i)}, 0)rotate(-90)`;
          });
      }
    }

    onMounted(() => {
      processData();
      buildIntView();
    });

    watch(network, () => {
      removeIntView();
      processData();
      buildIntView();
    });

    return {
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
      ref="intNode"
      :width="matrixWidth"
      :height="matrixHeight"
      :viewbox="`0 0 ${matrixWidth} ${matrixHeight}`"
    />
  </div>
</template>
