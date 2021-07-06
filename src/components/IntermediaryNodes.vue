<script lang="ts">
import {
  computed, onMounted, SetupContext, watch,
} from '@vue/composition-api';
import {
  ScaleBand,
  scaleBand,
} from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import { transition } from 'd3-transition';
import store from '@/store';
import { ArangoPath, ConnectivityCell } from '@/types';

export default {
  name: 'IntermediaryNodes',

  setup(props: unknown, context: SetupContext) {
    const intNodeSVG = document.getElementById('intNode');
    const network = computed(() => store.state.network);
    const connectivityPaths = computed(() => store.state.connectivityMatrixPaths);
    const matrix: ConnectivityCell[][] = [];
    const cellSize = computed(() => store.state.cellSize);
    const sortOrder = computed(() => store.state.connectivityMatrixPaths.nodes.map((node: Node) => node._id).sort());
    const margin = {
      top: 70,
      right: 0,
      bottom: 0,
      left: 70,
    };
    const orderingScale: ScaleBand<string> = scaleBand()
      .domain(sortOrder.value)
      .range([0, sortOrder.value.length * cellSize.value]);
    const matrixWidth = computed(() => connectivityPaths.value.paths[0].edges.length * cellSize.value + margin.left + margin.right);
    const matrixHeight = computed(() => connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom);
    const intNodeWidth = computed(() => {
      const controlsElement = select<Element, Element>('.app-sidebar').node();
      const matrixElement = select<Element, Element>('#matrix').node();

      if (controlsElement !== null && matrixElement !== null) {
        const availableSpace = context.root.$vuetify.breakpoint.width - controlsElement.clientWidth - matrixElement.clientWidth - 12; // 12 from the svg container padding
        return availableSpace < 330 ? 330 : availableSpace;
      }

      return 330;
    });

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
        console.log(matrix);
      }
      console.log(connectivityPaths.value);
    }

    function buildIntView() {
      if (matrix.length > 0) {
      // set the radius for cells
        const cellRadius = 3;

        // set the matrix highlight
        const matrixHighlightLength = matrix.length * cellSize.value;

        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // constant for starting the column label container
        const columnLabelContainerStart = 20;
        const labelContainerHeight = 25;
        const rowLabelContainerStart = 75;
        const labelContainerWidth = rowLabelContainerStart;

        const verticalOffset = 187.5;
        const horizontalOffset = (orderingScale.bandwidth() / 2 - 4.5) / 0.075;
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
