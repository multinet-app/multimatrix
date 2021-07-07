<script lang="ts">
import {
  computed, onMounted, SetupContext, watch,
} from '@vue/composition-api';
import {
  ScaleBand,
  scaleBand,
  scaleLinear,
} from 'd3-scale';
import { select, selectAll } from 'd3-selection';
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

    const orderingScale: ScaleBand<string> = scaleBand()
      .domain(sortOrder.value)
      .range([0, sortOrder.value.length * cellSize.value]);

    const xScale = scaleBand().domain([0, sortOrder.value.length]).rangeRound([0, matrixWidth.value]).paddingInner(0.1)
      .align(0);
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
        console.log(matrix);
      }
      console.log(connectivityPaths.value);
      //   Update opacity
      const allPaths = matrix.map((row: ConnectivityCell[]) => row.map((cell: ConnectivityCell) => cell.z)).flat();
      const maxPath = allPaths.reduce((a, b) => Math.max(a, b));
      opacity.domain([
        0,
        maxPath,
      ]);
    }

    function makeRow(rowData: ConnectivityCell) {
      const row = selectAll('g.row');
      const column = selectAll('g.column');
      console.log(rowData);
      const cell = select(this)
        .selectAll('rect')
        .data(rowData)
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d.x))
        .attr('width', xScale.bandwidth())
        .attr('height', xScale.bandwidth())
        .style('fill-opacity', (d) => opacity(d.z))
        .style('fill', 'blue')
        .on('mouseover', (d) => {
          row
            .filter((_, i) => d.x === i)
            .selectAll('text')
            .style('fill', '#d62333')
            .style('font-weight', 'bold');
          column
            .filter((_, j) => d.y === j)
            .style('fill', '#d62333')
            .style('font-weight', 'bold');
        })
        .on('mouseout', () => {
          row.selectAll('text').style('fill', null).style('font-weight', null);
          column.style('fill', null).style('font-weight', null);
        });
      cell.append('title').text((d) => `
      ${d.cellName} 
      in ${d.z} paths`);
    }

    function buildIntView() {
      if (matrix.length > 0) {
      // set the radius for cells
        // const cellRadius = 3;

        const svg = select('#intNode').append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        // Calculate opacity domain
        // constant for starting the column label container
        // const columnLabelContainerStart = 20;
        // const labelContainerHeight = 25;
        // const rowLabelContainerStart = 75;
        // const labelContainerWidth = rowLabelContainerStart;

        // const verticalOffset = 187.5;
        // const horizontalOffset = (orderingScale.bandwidth() / 2 - 4.5) / 0.075;

        //   Draw rows
        const row = svg
          .selectAll('g.row')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'row')
          .attr('transform', (_, i) => `translate(0,${xScale(i)})`)
          .each(makeRow);
        row
          .append('text')
          .attr('class', 'label')
          .attr('x', -4)
          .attr('y', xScale.bandwidth() / 2)
          .attr('dy', '0.32em')
          .text((d: ConnectivityCell) => `${d.cellName}: in ${d.z} paths`);

        //   Draw columns
        const column = svg
          .selectAll('g.column')
          .data(matrix)
          .enter()
          .append('g')
          .attr('class', 'column')
          .attr('transform', (_, i) => `translate(${xScale(i)}, 0)rotate(-90)`)
          .append('text')
          .attr('class', 'label')
          .attr('x', 4)
          .attr('y', xScale.bandwidth() / 2)
          .attr('dy', '0.32em')
          .text((d: ConnectivityCell) => `${d.cellName}: in ${d.z} paths`);
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
