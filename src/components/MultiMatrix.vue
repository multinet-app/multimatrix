<script lang="ts">
import {
  Cell,
  Edge,
  Node,
  ArangoPath,
} from '@/types';
import {
  scaleBand,
} from 'd3-scale';
import {
  range,
} from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { transition } from 'd3-transition';
import store from '@/store';
import LineUp from '@/components/LineUp.vue';
import IntermediaryNodes from '@/components/IntermediaryNodes.vue';
import ContextMenu from '@/components/ContextMenu.vue';

import 'science';
import 'reorder.js';
import {
  computed, defineComponent, onMounted, Ref, ref, watch,
} from '@vue/composition-api';
import PathTable from '@/components/PathTable.vue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const reorder: any;

export default defineComponent({
  components: {
    LineUp,
    IntermediaryNodes,
    PathTable,
    ContextMenu,
  },

  setup() {
    const showPathTable = computed(() => store.state.showPathTable);
    const connectivityMatrixPaths = computed(() => store.state.connectivityMatrixPaths);
    const tooltip = ref(null);
    const visMargins = ref({
      left: 75, top: 110, right: 1, bottom: 1,
    });
    const matrix: Ref<Cell[][]> = ref([]);
    const expandedSuperNodes = ref(new Set<string>());
    const selectedHops = computed(() => store.state.selectedHops);
    const icons: Ref<{ [key: string]: { d: string} }> = ref({
      quant: {
        d:
          'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z',
      },
      alphabetical: {
        d:
          'M401.1,331.2h-189c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.8C407.7,334.2,404.8,331.2,401.1,331.2z M223.7,344.3H266c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-42.3V344.3z M223.7,373H300c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-76.3V373.7z M263.6,447.8c0,2-1.6,3.6-3.6,3.6h-36.4v-18.8H260c2,0,3.6,1.6,3.6,3.6V447.8z M321.5,418.4c0,2-1.6,3.6-3.6,3.6h-94.2v-18.8h94.2c2,0,3.6,1.6,3.6,3.6V418.4z M392.6,449.5h-34.3V442l22.6-27h-21.7v-8.8h33.2v7.5l-21.5,27h21.7V449.5z M381,394.7l-3.7,6.4l-3.7-6.4h2.7v-14.6h2v14.6H381z M387,380l-3.4-9.7h-13.5l-3.3,9.7h-10.2l15.8-43.3h9l15.8,43.3H387z M371.8,363.4H382l-5.1-15.3L371.8,363.4z',
      },
      categorical: {
        d:
          'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.4C407.7,333.7,404.7,330.7,401,330.7z M272.9,374.3h-52.4v-17.1h52.4V374.3z M272.9,354h-52.4v-17h52.4V354z M332.1,414.9h-52.4v-17h52.4V414.9z M332.1,394.6h-52.4v-17h52.4V394.6z M394.8,456.5h-52.4v-17h52.4V456.5z M394.8,434.9h-52.4v-17h52.4V434.9z',
      },
      cellSort: {
        d:
          'M115.3,0H6.6C3,0,0,3,0,6.6V123c0,3.7,3,6.6,6.6,6.6h108.7c3.7,0,6.6-3,6.6-6.6V6.6C122,3,119,0,115.3,0zM37.8,128.5H15.1V1.2h22.7V128.5z',
      },
    });
    const sortKey = ref('');
    const finishedMounting = ref(false);
    const showIntNodeVis = computed(() => store.state.showIntNodeVis);
    const labelVariable = computed(() => store.state.labelVariable);

    const cellSize = computed(() => store.state.cellSize);
    const selectedNodes = computed(() => store.state.selectedNodes);
    const selectedCell = computed(() => store.state.selectedCell);
    const network = computed(() => store.state.network);
    const directionalEdges = computed(() => store.state.directionalEdges);
    const selectNeighbors = computed(() => store.state.selectNeighbors);
    const showGridLines = computed(() => store.state.showGridLines);
    const aggregated = computed(() => store.state.aggregated);
    const cellColorScale = computed(() => store.getters.cellColorScale);
    const parentColorScale = computed(() => store.getters.parentColorScale);
    const matrixWidth = computed(() => (network.value !== null
      ? network.value.nodes.length * cellSize.value + visMargins.value.left + visMargins.value.right
      : 0));
    const matrixHeight = computed(() => (network.value !== null
      ? network.value.nodes.length * cellSize.value + visMargins.value.top + visMargins.value.bottom
      : 0));
    const sortOrder = computed({
      get() {
        return store.state.sortOrder;
      },
      set(value: number[]) {
        store.commit.setSortOrder(value);
      },
    });
    const orderingScale = computed(() => scaleBand<number>()
      .domain(sortOrder.value)
      .range([0, sortOrder.value.length * cellSize.value]));
    const hoveredNodes = computed(() => store.state.hoveredNodes);
    const idMap = computed(() => {
      const computedIdMap: { [key: string]: number } = {};

      if (network.value !== null) {
        network.value.nodes.forEach((node: Node, index: number) => {
          computedIdMap[node._id] = index;
        });
      }

      return computedIdMap;
    });
    const showTable = computed({
      get() {
        return store.state.showPathTable;
      },
      set(value: boolean) {
        store.commit.setShowPathTable(value);
      },
    });

    // Helpers
    function isCell(element: unknown): element is Cell {
      return Object.prototype.hasOwnProperty.call(element, 'cellName');
    }

    function capitalizeFirstLetter(word: string) {
      return word[0].toUpperCase() + word.slice(1);
    }

    function hoverNode(nodeID: string) {
      store.commit.pushHoveredNode(nodeID);
    }

    function unHoverNode(nodeID: string) {
      store.commit.removeHoveredNode(nodeID);
    }

    function hoverEdge(cell: Cell) {
      hoverNode(cell.rowID);
      hoverNode(cell.colID);
    }

    function unHoverEdge(cell: Cell) {
      unHoverNode(cell.rowID);
      unHoverNode(cell.colID);
    }

    function showToolTip(event: MouseEvent, networkElement: Cell | Node): void {
      let message = '';

      if (isCell(networkElement)) {
        // Get edge source and target
        message = `
          Row ID: ${networkElement.rowID} <br/>
          Col ID: ${networkElement.colID} <br/>
          Number of edges: ${networkElement.z}`;
      } else {
        // Get node id
        message = `ID: ${networkElement._id}`;

        // Loop through other props to add to tooltip
        Object.keys(networkElement).forEach((key) => {
          if (!['_key', '_rev', 'id', 'neighbors'].includes(key)) {
            message += `<br/> ${capitalizeFirstLetter(key)}: ${networkElement[key]}`;
          }
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(tooltip.value as any)
        .style('left', `${event.clientX - 256 + 10}px`)
        .style('top', `${event.clientY + 10}px`)
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

    function showContextMenu(event: MouseEvent) {
      store.commit.updateRightClickMenu({
        show: true,
        top: event.y,
        left: event.x,
      });

      event.preventDefault();
    }

    function changeOrder(type: string, isNode = false) {
      if (network.value === null) { return; }

      let order;
      if (sortKey.value === type) {
        sortKey.value = '';
      } else {
        sortKey.value = type;
      }

      if (
        type === 'clusterSpectral'
        || type === 'clusterBary'
        || type === 'clusterLeaf'
      ) {
        if (network.value == null) {
          return;
        }
        const newEdges: unknown[] = Array(network.value.edges.length);

        // Generate edges that are compatible with reorder.js
        network.value.edges.forEach((edge: Edge, index: number) => {
          if (network.value === null) { return; }
          newEdges[index] = {
            source: network.value.nodes.find(
              (node: Node) => node._id === edge._from,
            ),
            target: network.value.nodes.find(
              (node: Node) => node._id === edge._to,
            ),
          };
        });

        const sortableNetwork = reorder
          .graph()
          .nodes(network.value.nodes)
          .links(newEdges)
          .init();

        if (type === 'clusterBary') {
          const barycenter = reorder.barycenter_order(sortableNetwork);
          // eslint-disable-next-line prefer-destructuring
          [order] = reorder.adjacent_exchange(
            sortableNetwork,
            barycenter[0],
            barycenter[1],
          )[1];
        } else if (type === 'clusterSpectral') {
          order = reorder.spectral_order(sortableNetwork);
        } else if (type === 'clusterLeaf') {
          const mat = reorder.graph2mat(sortableNetwork);
          order = reorder.optimal_leaf_order()(mat);
        }
      } else if (sortKey.value === 'edges') {
        order = range(network.value.nodes.length).sort((a, b) => {
          if (network.value === null) { return 0; }
          const firstValue = network.value.nodes[b][type] as number;
          const secondValue = network.value.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      } else if (isNode === true) {
        order = range(network.value.nodes.length).sort((a, b) => {
          if (network.value === null) { return 0; }
          return network.value.nodes[a]._id.localeCompare(network.value.nodes[b]._id);
        });
        order = range(network.value.nodes.length).sort((a, b) => {
          if (network.value === null) { return 0; }
          return Number(network.value.nodes[b].neighbors.includes(type))
            - Number(network.value.nodes[a].neighbors.includes(type));
        });
      } else if (sortKey.value === 'shortName') {
        order = range(network.value.nodes.length).sort((a, b) => {
          if (network.value === null) { return 0; }
          return network.value.nodes[a]._id.localeCompare(network.value.nodes[b]._id);
        });
      } else {
        order = range(network.value.nodes.length).sort((a, b) => {
          if (network.value === null) { return 0; }
          const firstValue = network.value.nodes[b][type] as number;
          const secondValue = network.value.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      }
      sortOrder.value = order;
    }

    function sort(order: string): void {
      if (network.value === null) {
        return;
      }
      const nodeIDs = network.value.nodes.map((node: Node) => node._id);

      changeOrder(order, nodeIDs.includes(order));
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

      if (network.value !== null) {
        network.value.nodes.forEach((rowNode: Node, i: number) => {
          if (network.value !== null) {
            matrix.value[i] = network.value.nodes.map((colNode: Node, j: number) => ({
              cellName: `${rowNode._id}_${colNode._id}`,
              rowCellType: rowNode.type,
              colCellType: colNode.type,
              correspondingCell: `${colNode._id}_${rowNode._id}`,
              rowID: rowNode._id,
              colID: colNode._id,
              x: j,
              y: i,
              z: 0,
            }));
          }
        });

        // Count occurrences of edges and store it in the matrix
        network.value.edges.forEach((edge: Edge) => {
          matrix.value[idMap.value[edge._from]][idMap.value[edge._to]].z += 1;

          if (!directionalEdges.value) {
            matrix.value[idMap.value[edge._to]][idMap.value[edge._from]].z += 1;
          }
        });
      }

      // Find max value of z
      matrix.value.forEach((row: Cell[]) => {
        row.forEach((cell: Cell) => {
          if (
            cell.rowCellType === undefined
            || cell.colCellType === undefined
          ) {
            if (cell.z > maxNumConnections) {
              maxNumConnections = cell.z;
            }
          }
          if (
            cell.rowCellType === 'supernode'
            && cell.colCellType === 'supernode'
          ) {
            if (cell.z > maxAggrConnections) {
              maxAggrConnections = cell.z;
            }
          }
        });
      });

      store.commit.setMaxConnections({
        unAggr: maxNumConnections,
        parent: maxAggrConnections,
      });
    }

    onMounted(() => {
      finishedMounting.value = true;
    });

    watch([orderingScale, showGridLines, network, directionalEdges, labelVariable], () => processData());

    processData();

    const highlightLength = computed(() => matrix.value.length * cellSize.value);
    const labelFontSize = computed(() => 0.8 * cellSize.value);

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
            store.commit.setSelectedConnectivityPaths(pathIdList);
            showTable.value = true;
          } else {
            showTable.value = false;
          }
        }

        store.commit.clickCell(matrixElement.cellName);
      } else {
        store.dispatch.clickElement(matrixElement._id);
      }
    }

    const expandPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M11,7H13V11H17V13H13V17H11V13H7V11H11V7Z';
    const retractPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M17,11V13H7V11H17Z';

    function expandOrRetractRow(node: Node) {
      if (aggregated.value) {
        if (node.type !== 'supernode') {
          return;
        }
        // expand and retract the supernode aggregation based on user selection
        if (expandedSuperNodes.value.has(node._id)) {
          // retract
          expandedSuperNodes.value.delete(node._id);
          store.dispatch.retractAggregatedNode(node._id);
        } else {
          // expand
          expandedSuperNodes.value.add(node._id);
          store.dispatch.expandAggregatedNode(node._id);
        }
      } else {
        store.dispatch.clickElement(node._id);
      }
    }

    const iconMeta = [
      { text: 'name', sortName: 'shortName', iconName: 'alphabetical' },
      { text: 'cluster', sortName: 'clusterLeaf', iconName: 'categorical' },
      { text: 'interacts', sortName: 'edges', iconName: 'quant' },
    ];

    const neighborsOfClicked = computed(() => [...selectedNodes.value.values()].map((nodeID) => {
      if (network.value !== null) {
        const foundNode = network.value.nodes.find((n) => n._id === nodeID);
        return foundNode !== undefined ? foundNode.neighbors : [];
      }
      return [];
    }).flat());

    function clickedNeighborClass(node: Node) {
      const clicked = selectedNodes.value.has(node._id) ? 'clicked' : '';
      const neighbor = !clicked && neighborsOfClicked.value.includes(node._id) && selectNeighbors.value ? 'neighbor' : '';
      // const hovered = hoveredNodes.value.includes(node._id) ? 'hovered' : '';

      return `${clicked} ${neighbor}`;
    }

    return {
      network,
      finishedMounting,
      showIntNodeVis,
      matrixWidth,
      matrixHeight,
      tooltip,
      showPathTable,
      showContextMenu,
      showGridLines,
      orderingScale,
      visMargins,
      highlightLength,
      cellSize,
      labelVariable,
      labelWidth: 60,
      labelFontSize,
      icons,
      sortIconWidth: 8.133,
      sortIconScaleFactor: 15,
      clickElement,
      showToolTip,
      hideToolTip,
      hoverNode,
      unHoverNode,
      hoverEdge,
      unHoverEdge,
      aggregated,
      sort,
      matrix,
      cellColorScale,
      parentColorScale,
      selectedCell,
      expandPath,
      retractPath,
      expandedSuperNodes,
      invisibleRectSize: 11,
      expandOrRetractRow,
      iconMeta,
      selectedNodes,
      clickedNeighborClass,
      sortKey,
    };
  },

});
</script>

<template>
  <div>
    <v-container class="d-inline-flex">
      <div>
        <svg
          :width="matrixWidth"
          :height="matrixHeight"
          :viewbox="`0 0 ${matrixWidth} ${matrixHeight}`"
          @contextmenu="showContextMenu"
        >
          <g
            id="matrix"
            :transform="`translate(${visMargins.left},${visMargins.top})`"
          >
            <!-- Sort icons -->
            <g
              v-for="icon, i in iconMeta"
              :key="icon.text"
              :transform="`translate(${-visMargins.left},${-visMargins.top + 50 + (i * 20)})`"
            >
              <rect
                :width="visMargins.left - 5"
                height="15"
                fill="white"
                stroke="gray"
                stroke-width="1"
                @click="sort(icon.sortName)"
              />
              <text
                x="27"
                y="10"
                font-size="11"
                style="pointer-events: none;"
              >
                {{ icon.text }}
              </text>
              <path
                :d="icons[icon.iconName].d"
                :fill="icon.sortName === sortKey ? '#EBB769' : '#8B8B8B'"
                transform="scale(0.1)translate(-195,-320)"
                style="pointer-events: none;"
              />
            </g>

            <!-- Columns -->
            <g
              v-for="node, i of network.nodes"
              :key="`${node._id}_col`"
              :transform="`translate(${i * cellSize})rotate(-90)`"
              class="column"
              :class="clickedNeighborClass(node)"
            >
              <rect
                class="highlightContainer"
                :width="highlightLength + visMargins.top + visMargins.bottom"
                :height="cellSize"
                :x="-highlightLength - visMargins.bottom"
                fill-opacity="0"
                @mouseover="(event) => {showToolTip(event, node); hoverNode(node._id);}"
                @mouseout="(event) => {hideToolTip(); unHoverNode(node._id);}"
                @click="clickElement(node)"
              />
              <foreignObject
                :width="labelWidth"
                :height="cellSize"
                x="20"
              >
                <p
                  :style="`margin-top: ${cellSize * -0.1}px; font-size: ${labelFontSize}px; color: ${aggregated && node.type !== 'supernode' ? '#AAAAAA' : '#000000'}`"
                  class="label"
                >
                  {{ node.type === 'supernode' || labelVariable === undefined ? node['_key'] : node[labelVariable] }}
                </p>
              </foreignObject>
              <path
                class="sortIcon"
                :d="icons.cellSort.d"
                :transform="`scale(${1 / sortIconScaleFactor})translate(${15 * sortIconScaleFactor},${((cellSize - sortIconWidth) / 2) * sortIconScaleFactor})rotate(90)`"
                :fill="node._id === sortKey ? '#EBB769' : '#8B8B8B'"
                @click="sort(node._id)"
              />
            </g>

            <!-- Rows -->
            <g
              v-for="node, i of network.nodes"
              :key="`${node._id}_row`"
              :transform="`translate(0,${orderingScale(i)})`"
              class="row"
              :class="clickedNeighborClass(node)"
            >
              <rect
                class="highlightContainer"
                :width="highlightLength + visMargins.left + visMargins.right"
                :height="cellSize"
                :x="-visMargins.left"
                fill-opacity="0"
                @mouseover="(event) => {showToolTip(event, node); hoverNode(node._id);}"
                @mouseout="(event) => {hideToolTip(); unHoverNode(node._id);}"
                @click="clickElement(node)"
              />
              <foreignObject
                :width="labelWidth"
                :height="cellSize"
                :x="-labelWidth"
              >
                <p
                  :style="`margin-top: ${cellSize * -0.1}px; font-size: ${labelFontSize}px; color: ${aggregated && node.type !== 'supernode' ? '#AAAAAA' : '#000000'}`"
                  class="label"
                >
                  {{ node.type === 'supernode' || labelVariable === undefined ? node['_key'] : node[labelVariable] }}
                </p>
              </foreignObject>

              <!-- Clickable row expand/retract -->
              <path
                v-if="node.type === 'supernode'"
                :d="expandedSuperNodes.has(node._id) ? retractPath : expandPath"
                :transform="`translate(-73, ${(cellSize - invisibleRectSize) / 2})scale(0.5)`"
                fill="#8B8B8B"
              />
              <rect
                v-if="node.type === 'supernode'"
                :transform="`translate(-73, ${(cellSize - invisibleRectSize) / 2})`"
                width="10"
                height="10"
                opacity="0"
                @click="expandOrRetractRow(node)"
              />

              <!-- Cells -->
              <g class="cellsGroup">
                <rect
                  v-for="cell in matrix[i]"
                  :key="cell.cellName"
                  :x="(cell.x * cellSize) + 1"
                  y="1"
                  :width="cellSize - 2"
                  :height="cellSize - 2"
                  :fill="cell.rowCellType=== 'supernode' && cell.colCellType === 'supernode' ? parentColorScale(cell.z) : cellColorScale(cell.z)"
                  :fill-opacity="cell.z"
                  :class="selectedCell === cell.cellName ? 'cell clicked' : ''"
                  @mouseover="(event) => {showToolTip(event, cell); hoverEdge(cell);}"
                  @mouseout="(event) => {hideToolTip(); unHoverEdge(cell);}"
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
              :transform="`translate(${orderingScale(i)},0)rotate(-90)`"
              :x1="-orderingScale.range()[1]"
            />
            <!-- Add last vertical grid line -->
            <line
              :transform="`translate(${orderingScale.range()[1]},0)rotate(-90)`"
              :x1="-orderingScale.range()[1]"
            />

            <!-- Horizontal grid lines -->
            <line
              v-for="node, i of network.nodes"
              :key="`${node._id}_horizontal_gridline`"
              :transform="`translate(0,${orderingScale(i)})`"
              :x2="orderingScale.range()[1]"
            />
            <!-- Add last horizontal grid line -->
            <line
              :transform="`translate(0,${orderingScale.range()[1]})`"
              :x2="orderingScale.range()[1]"
            />
          </g>
        </svg>
      </div>
      <intermediary-nodes v-if="finishedMounting && showIntNodeVis" />
      <line-up v-if="finishedMounting" />
    </v-container>

    <div
      id="tooltip"
      ref="tooltip"
    />
    <path-table v-if="showPathTable" />
    <context-menu />
  </div>
</template>

<style scoped>
svg >>> .label {
  max-width: 60px;
  text-overflow: ellipsis;
  overflow: hidden;
  z-index: 100;
  margin: 0;
}

/* cell state */
svg >>> .hoveredCell {
  stroke-width: 1px;
  stroke: darkgray;
}
svg >>> .cell.clicked {
  stroke: red;
  stroke-width: 3;
}

/* highlightContainer state */
svg >>> .hovered > .highlightContainer{
  fill: #fde8ca;
  fill-opacity: 1 !important;
}
svg >>> .clicked > .highlightContainer {
  font-weight: 800;
  fill: #f8cf91;
  fill-opacity: 1;
}
svg >>> .neighbor > .highlightContainer {
  fill: #caffc7;
  fill-opacity: 1;
}

/* foreignObject state */
svg >>> foreignObject {
  pointer-events: none;
}
svg >>> .clicked > foreignObject {
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
}

/* gridLines */
svg >>> .gridLines {
  pointer-events: none;
  stroke: #BBBBBB;
}
</style>
