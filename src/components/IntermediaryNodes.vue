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
    const matrix: ConnectivityCell[][] = [];
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
      top: 79,
      right: 50,
      bottom: 0,
      left: 40,
    };
    const matrixWidth = computed(() => (connectivityPaths.value.nodes.length > 0 ? edgeLength.value * cellSize.value + margin.left + margin.right : 0));
    const matrixHeight = computed(() => (connectivityPaths.value.nodes.length > 0 ? connectivityPaths.value.nodes.length * cellSize.value + margin.top + margin.bottom : 0));

    const intNodeWidth = computed(() => (store.state.connectivityMatrixPaths.nodes.length > 0
      ? pathLength.value * cellSize.value + margin.left + margin.right
      : 0));
    const sortOrder = computed(() => store.state.connectivityMatrixPaths.nodes.map((node) => node._key).sort());
    const yScale = scaleLinear().domain([0, sortOrder.value.length]).range([0, sortOrder.value.length * cellSize.value]);
    const xScale = scaleLinear().domain([0, (edgeLength.value - 1)]).range([0, (connectivityPaths.value.paths[0].edges.length - 1) * cellSize.value]);

    const opacity = scaleLinear().domain([0, 0]).range([0, 1]).clamp(true);

    function processData() {
      if (network.value !== null && connectivityPaths.value.nodes.length > 0) {
        const hops = edgeLength.value - 1;

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
        .attr('x', (d) => yScale(d.x))
        .attr('y', 1)
        .attr('width', cellSize.value - 2)
        .attr('height', cellSize.value - 2)
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
        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const svgWidth: number = parseFloat(select('#intNode').attr('width'));
        const svgHeight: number = parseFloat(select('#intNode').attr('height'));
        const rowLabelWidth = 20;

        //   Draw path symbols
        const circles = svg.selectAll('g.circles')
          .data([...Array(pathLength.value).keys()])
          .enter()
          .append('g')
          .attr('transform', `translate(${svgWidth / 7}, ${(margin.top - svgHeight) / 4})`);

        circles.append('circle')
          .attr('class', 'circleIcons')
          .attr('cx', (_, i) => xScale(i))
          .attr('cy', 0)
          .attr('r', cellSize.value / 2)
          .attr('fill', (_, i) => (i !== 0 && i !== (pathLength.value - 1) ? 'lightgrey' : 'none'));

        circles.append('text')
          .attr('x', (_, i) => xScale(i))
          .attr('y', cellSize.value / 2 - 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', `${cellSize.value - 2}px`)
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
          .attr('x1', -yScale.range()[1])
          .attr('y1', 0)
          .attr('y2', yScale.range()[1])
          .attr('x1', (_, i) => xScale(i))
          .attr('x2', (_, i) => xScale(i))
          .attr('transform', `translate(${svgWidth / 5 - 1},0)`);

        // horizontal grid lines
        horizontalLines
          .append('line')
          .attr('x1', 0)
          .attr('x2', xScale.range()[1] - 1)
          .attr('y1', (_, i) => yScale(i))
          .attr('y2', (_, i) => yScale(i))
          .attr('transform', `translate(${svgWidth / 5},0)`);

        // horizontal grid line edges
        gridLines
          .append('line')
          .attr('x1', 0)
          .attr('x2', xScale.range()[1])
          .attr('y1', yScale.range()[1])
          .attr('y2', yScale.range()[1])
          .attr('transform', `translate(${svgWidth / 5},0)`);

        //   Draw rows
        svg
          .selectAll('g.row')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'row')
          .attr('transform', (_, i) => `translate(${svgWidth / 5},${yScale(i)})`)
          .each(makeRow)
          .append('text')
          .attr('class', 'rowLabels')
          .attr('y', cellSize.value / 2 + 5)
          .attr('x', -(svgWidth / 5 + rowLabelWidth))
          .text((_, i) => sortOrder.value[i]);
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
      showTable,
      intNodeWidth,
      matrixWidth,
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

svg >>> .rowLabels {
  max-width: 20px;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 12pt;
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
