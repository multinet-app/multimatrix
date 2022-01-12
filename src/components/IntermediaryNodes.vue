<script lang="ts">
import {
  computed, defineComponent, onMounted, watch, watchEffect,
} from '@vue/composition-api';
import {
  scaleLinear,
} from 'd3-scale';
import { select, selectAll } from 'd3-selection';
import store from '@/store';
import { ConnectivityCell } from '@/types';

export default defineComponent({
  name: 'IntermediaryNodes',

  setup() {
    const network = computed(() => store.state.network);
    const connectivityPaths = computed(() => store.state.connectivityMatrixPaths);
    let matrix: ConnectivityCell[][] = [];
    const cellSize = computed(() => store.state.cellSize);
    const pathLength = computed(() => connectivityPaths.value.paths[0].vertices.length);
    const edgeLength = computed(() => connectivityPaths.value.paths[0].edges.length);
    const showTable = computed({
      get() {
        return store.state.showPathTable;
      },
      set(value: boolean) {
        store.commit.setShowPathTable(value);
      },
    });
    let selectedCell = '';

    watchEffect(() => {
      if (showTable.value === false) { selectAll('.connectivityCell').classed('clicked', false); }
    });

    const margin = {
      top: 110,
      right: 50,
      bottom: 0,
      left: 40,
    };
    const matrixHeight = computed(() => (connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0));

    const intNodeWidth = computed(() => (store.state.connectivityMatrixPaths.nodes.length > 0
      ? margin.left + (pathLength.value + 1) * cellSize.value
      : 0));
    const sortOrder = computed(() => store.state.connectivityMatrixPaths.nodes.map((node) => node._key).sort());
    const yScale = computed(() => scaleLinear().domain([0, sortOrder.value.length]).range([0, sortOrder.value.length * cellSize.value]));
    const xScale = computed(() => scaleLinear().domain([0, (edgeLength.value - 1)]).range([0, (connectivityPaths.value.paths[0].edges.length - 1) * cellSize.value]));

    const opacity = scaleLinear().domain([0, 0]).range([0, 1]).clamp(true);

    function processData() {
      if (network.value !== null && connectivityPaths.value.nodes.length > 0) {
        const hops = edgeLength.value - 1;
        matrix = [];

        // Set up matrix intermediate nodes x # of hops
        sortOrder.value.forEach((rowNode, i) => {
          matrix[i] = [...Array(hops).keys()].slice(0).map((j) => ({
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
        connectivityPaths.value.paths.forEach((path, i) => {
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
      const allPaths = matrix.map((row) => row.map((cell) => cell.z)).flat();
      const maxPath = allPaths.reduce((a, b) => Math.max(a, b));
      store.commit.setMaxIntConnections(maxPath);
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
        .attr('class', 'connectivityCell')
        .attr('x', (_, i) => (i + 1.5) * cellSize.value)
        .attr('width', cellSize.value)
        .attr('height', cellSize.value)
        .style('fill-opacity', (d) => opacity(d.z))
        .style('fill', 'blue');

      cell.on('click', () => {
        if (selectedCell !== rowData[0].cellName || !showTable.value) {
          selectedCell = rowData[0].cellName;
          store.commit.setSelectedConnectivityPaths(rowData);
          showTable.value = true;

          // Remove prior selections
          selectAll('.connectivityCell').classed('clicked', false);
          cell.classed('clicked', true);
        } else if (selectedCell === rowData[0].cellName && showTable.value) {
          showTable.value = !showTable.value;
          cell.classed('clicked', false);
        }
      });

      cell.append('title').text((d) => `${d.cellName} in ${d.z} paths`);
    }

    function buildIntView() {
      if (matrix.length > 0) {
        console.log(matrix);
        const headerPadding = 5;
        const circleRadius = cellSize.value / 2;
        const cellFontSize = cellSize.value * 0.8;

        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        //   Draw path symbols
        const circles = svg.selectAll('g.circles')
          .data([...Array(pathLength.value).keys()])
          .enter()
          .append('g')
          .attr('transform', (_, i) => `translate(${cellSize.value + xScale.value(i)}, ${(-circleRadius) - headerPadding})`);

        circles.append('circle')
          .attr('class', 'circleIcons')
          .attr('r', circleRadius)
          .attr('fill', (_, i) => (i !== 0 && i !== (pathLength.value - 1) ? 'lightgrey' : 'none'));

        circles.append('text')
          .attr('y', circleRadius / 2)
          .attr('text-anchor', 'middle')
          .attr('font-size', `${cellFontSize}px`)
          .text((_, i) => i + 1);

        //   Draw gridlines
        const gridLines = svg.append('g')
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
          .attr('x1', (_, i) => (i + 1.5) * cellSize.value)
          .attr('x2', (_, i) => (i + 1.5) * cellSize.value)
          .attr('y1', 0)
          .attr('y2', yScale.value.range()[1]);

        // horizontal grid lines
        horizontalLines
          .append('line')
          .attr('x1', 1.5 * cellSize.value)
          .attr('x2', 1.5 * cellSize.value + xScale.value.range()[1])
          .attr('y1', (_, i) => yScale.value(i))
          .attr('y2', (_, i) => yScale.value(i));

        // Add final horizontal grid line
        gridLines
          .append('line')
          .attr('x1', 1.5 * cellSize.value)
          .attr('x2', 1.5 * cellSize.value + xScale.value.range()[1])
          .attr('y1', yScale.value.range()[1])
          .attr('y2', yScale.value.range()[1]);

        //   Draw rows
        svg
          .selectAll('g.row')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'row')
          .attr('transform', (_, i) => `translate(0,${yScale.value(i)})`)
          .each(makeRow)
          .append('text')
          .attr('class', 'rowLabels')
          .attr('y', 5)
          .style('font-size', `${cellFontSize}px`)
          .attr('dominant-baseline', 'hanging')
          .attr('x', -20)
          .text((_, i) => sortOrder.value[i]);
      }
    }

    function teardownOldView() {
      select('#intNode').selectAll('g').remove();
    }

    onMounted(() => {
      processData();
      buildIntView();
    });

    watch([connectivityPaths, cellSize], () => {
      processData();
      teardownOldView();
      buildIntView();
    });

    return {
      showTable,
      intNodeWidth,
      matrixHeight,
    };
  },
});
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
      :viewbox="`0 0 ${intNodeWidth} ${matrixHeight}`"
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

svg >>> .rowLabels {
  max-width: 20px;
  text-overflow: ellipsis;
  overflow: hidden;
  z-index: 100;
}

svg >>> .connectivityCell:hover {
  cursor: pointer;
  stroke-width: 1px;
  stroke: black;
}

svg >>> .connectivityCell.clicked {
  stroke-width: 1px;
  stroke: black;
}
</style>
