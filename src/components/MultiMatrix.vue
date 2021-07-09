<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Vue from 'vue';
import {
  Cell,
  Edge,
  Node,
} from '@/types';
import {
  ScaleBand,
  scaleBand,
} from 'd3-scale';
import {
  range,
} from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { transition } from 'd3-transition';
import store from '@/store';
import LineUp from '@/components/LineUp.vue';

import 'science';
import 'reorder.js';

declare const reorder: any;

export default Vue.extend({
  components: {
    LineUp,
  },

  data(): {
    visMargins: any;
    matrix: Cell[][];
    edges: any;
    edgeColumns: any;
    edgeRows: any;
    cells: any;
    expandedSuperNodes: Set<string>;
    icons: { [key: string]: { [d: string]: string } };
    orderType: any;
    sortKey: string;
    finishedMounting: boolean;
    } {
    return {
      visMargins: {
        left: 75, top: 79, right: 0, bottom: 0,
      },
      matrix: [],
      edges: undefined,
      edgeColumns: undefined,
      edgeRows: undefined,
      cells: undefined,
      expandedSuperNodes: new Set(),
      icons: {
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
      },
      orderType: undefined,
      sortKey: '',
      finishedMounting: false,
    };
  },

  computed: {
    cellSize() {
      return store.state.cellSize;
    },

    selectedNodes() {
      return store.state.selectedNodes;
    },

    selectedCells() {
      return store.state.selectedCells;
    },

    network() {
      return store.state.network;
    },

    matrixNodeLength(): number {
      if (this.network !== null) {
        return this.network.nodes.length;
      }
      return 0;
    },

    matrixWidth(): number {
      return this.network !== null
        ? this.network.nodes.length * this.cellSize + this.visMargins.left + this.visMargins.right
        : 0;
    },

    matrixHeight(): number {
      return this.network !== null
        ? this.network.nodes.length * this.cellSize + this.visMargins.top + this.visMargins.bottom
        : 0;
    },

    sortOrder: {
      get() {
        return store.state.sortOrder;
      },
      set(value: number[]) {
        store.commit.setSortOrder(value);
      },
    },

    orderingScale(): ScaleBand<number> {
      return scaleBand<number>()
        .domain(this.sortOrder)
        .range([0, this.sortOrder.length * this.cellSize]);
    },

    hoveredNodes() {
      return store.state.hoveredNodes;
    },

    idMap() {
      const computedIdMap: { [key: string]: number } = {};

      if (this.network !== null) {
        this.network.nodes.forEach((node: Node, index: number) => {
          computedIdMap[node._id] = index;
        });
      }

      return computedIdMap;
    },

    directionalEdges() {
      return store.state.directionalEdges;
    },

    selectNeighbors() {
      return store.state.selectNeighbors;
    },

    showGridLines() {
      return store.state.showGridLines;
    },

    aggregated() {
      return store.state.aggregated;
    },

    cellColorScale() {
      return store.getters.cellColorScale;
    },

    parentColorScale() {
      return store.getters.parentColorScale;
    },
  },

  watch: {
    selectedNodes() {
      if (this.network === null) {
        return;
      }

      // Apply column highlight
      selectAll('.topoCol')
        .data(this.network.nodes)
        .classed('clicked', (node) => this.selectedNodes.indexOf(node._id) !== -1);

      // Apply column label highlight
      selectAll('.colLabels')
        .data(this.network.nodes)
        .classed('clicked', (node) => this.selectedNodes.indexOf(node._id) !== -1);

      // Apply row highlight
      selectAll('.topoRow')
        .data(this.network.nodes)
        .classed('clicked', (node) => this.selectedNodes.indexOf(node._id) !== -1);

      // Apply row label highlight
      selectAll('.rowLabels')
        .data(this.network.nodes)
        .classed('clicked', (node) => this.selectedNodes.indexOf(node._id) !== -1);
    },

    selectedCells() {
      // Apply cell highlight
      selectAll('.cellsGroup')
        .selectAll('.cell')
        .classed('clicked', (cell) => {
          if (this.isCell(cell)) {
            return this.selectedCells.findIndex((selectedCell) => selectedCell.cellName === cell.cellName) !== -1;
          }
          return false;
        });
    },

    hoveredNodes() {
      if (this.network === null) {
        return;
      }

      // Apply column highlight
      selectAll('.topoCol')
        .data(this.network.nodes)
        .classed('hovered', (node) => this.hoveredNodes.indexOf(node._id) !== -1);

      // Apply row highlight
      selectAll('.topoRow')
        .data(this.network.nodes)
        .classed('hovered', (node) => this.hoveredNodes.indexOf(node._id) !== -1);
    },

    orderingScale() {
      this.processData();
      this.initializeEdges();
    },

    showGridLines() {
      this.drawGridLines();
    },

    network() {
      this.processData();
      this.initializeEdges();
    },

    directionalEdges() {
      this.processData();
      this.initializeEdges();
    },
  },

  mounted() {
    // Run process data to convert edges to cells
    this.processData();

    this.edges = select('#matrix')
      .append('g')
      .attr(
        'transform',
        `translate(${this.visMargins.left},${this.visMargins.top})`,
      );

    // Draw buttons for alternative sorts
    let initialY = -this.visMargins.left + 10;
    const buttonHeight = 15;

    const icons = [
      { text: 'name', sortName: 'shortName', iconName: 'alphabetical' },
      { text: 'cluster', sortName: 'clusterLeaf', iconName: 'categorical' },
      { text: 'interacts', sortName: 'edges', iconName: 'quant' },
    ];
    icons.forEach((icon) => {
      const button = this.edges
        .append('g')
        .attr('transform', `translate(${-this.visMargins.left},${initialY})`);
      button.attr('cursor', 'pointer');
      button
        .append('rect')
        .attr('width', this.visMargins.left - 5)
        .attr('height', buttonHeight)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1);
      button
        .append('text')
        .attr('x', 27)
        .attr('y', 10)
        .attr('font-size', 11)
        .text(icon.text);
      const path = button.datum(icon.sortName);
      path
        .append('path')
        .attr('class', 'sortIcon')
        .attr('d', this.icons[icon.iconName].d)
        .style('fill', () => (icon.sortName === this.orderType ? '#EBB769' : '#8B8B8B'))
        .attr('transform', 'scale(0.1)translate(-195,-320)')
        .attr('cursor', 'pointer');
      button.on('click', () => this.sort(icon.sortName));
      initialY += buttonHeight + 5;
    });

    this.initializeEdges();
    this.finishedMounting = true;
  },

  methods: {
    processData(): void {
      // Reset some values that will be re-calcuated
      let maxNumConnections = 0;
      let maxAggrConnections = 0;
      this.matrix = [];

      if (this.network !== null) {
        this.network.nodes.forEach((rowNode: Node, i: number) => {
          if (this.network !== null) {
            this.matrix[i] = this.network.nodes.map((colNode: Node, j: number) => ({
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
        this.network.edges.forEach((edge: Edge) => {
          this.matrix[this.idMap[edge._from]][this.idMap[edge._to]].z += 1;

          if (!this.directionalEdges) {
            this.matrix[this.idMap[edge._to]][this.idMap[edge._from]].z += 1;
          }
        });
      }

      // Find max value of z
      this.matrix.forEach((row: Cell[]) => {
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
    },

    initializeEdges(): void {
      if (this.network === null) {
        return;
      }
      // set the radius for cells
      const cellRadius = 3;

      // set the matrix highlight
      const matrixHighlightLength = this.matrix.length * this.cellSize;

      // constant for starting the column label container
      const columnLabelContainerStart = 20;
      const labelContainerHeight = 25;
      const rowLabelContainerStart = 75;
      const labelContainerWidth = rowLabelContainerStart;

      const verticalOffset = 187.5;
      const horizontalOffset = (this.orderingScale.bandwidth() / 2 - 4.5) / 0.075;

      // creates column groupings
      this.edgeColumns = this.edges
        .selectAll('.column')
        .data(this.network.nodes, (d: Node) => d._id)
        .attr('transform', (d: Node, i: number) => `translate(${this.orderingScale(i)})rotate(-90)`);

      this.edgeColumns.exit().remove();

      const columnEnter = this.edgeColumns
        .enter()
        .append('g')
        .attr('class', 'column')
        .attr('transform', (d: Node) => {
          if (d.type === 'childnode') {
            return `translate(${this.orderingScale(
              d.parentPosition as number,
            )})rotate(-90)`;
          }
          return 'translate(0, 0)rotate(-90)';
        });

      columnEnter
        .transition()
        .duration(1000)
        .attr('transform', (d: Node, i: number) => `translate(${this.orderingScale(i)})rotate(-90)`);

      // Update existing topoCols
      this.edges
        .selectAll('.topoCol')
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.top + this.visMargins.bottom,
        )
        .attr('x', -matrixHighlightLength - this.visMargins.bottom);

      // add the highlight columns
      columnEnter
        .append('rect')
        .classed('topoCol', true)
        .attr('id', (d: Node) => `topoCol${d._id}`)
        .attr('x', -matrixHighlightLength - this.visMargins.bottom)
        .attr('y', 0)
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.top + this.visMargins.bottom,
        )
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill-opacity', 0);

      columnEnter
        .append('foreignObject')
        .attr('y', -5)
        .attr('x', columnLabelContainerStart)
        .attr('width', labelContainerWidth)
        .attr('height', labelContainerHeight)
        .append('xhtml:p')
        .text((d: Node) => d._key)
        .style('color', (d: Node) => {
          if (d.type === 'node') {
            return '#aaa';
          }
          return 'black';
        })
        .classed('colLabels', true);

      columnEnter
        .selectAll('p')
        .style('color', (d: Node) => (this.aggregated && d.type !== 'supernode' ? '#AAAAAA' : '#000000'));

      // Invisible Rectangles for Foreign Column Labels
      columnEnter
        .append('rect')
        .attr('y', 0)
        .attr('x', columnLabelContainerStart)
        .attr('width', labelContainerWidth)
        .attr('height', 15)
        .attr('class', 'colLabelRect')
        .style('opacity', 0)
        .on('click', (event: MouseEvent, matrixElement: Node) => {
          store.commit.clickElement(matrixElement._id);
        });

      columnEnter
        .append('path')
        .attr('id', (d: Node) => `sortIcon${d._id}`)
        .attr('class', 'sortIcon')
        .attr('d', this.icons.cellSort.d)
        .style('fill', (d: Node) => (d === this.orderType ? '#EBB769' : '#8B8B8B'))
        .attr(
          'transform',
          `scale(0.075)translate(${verticalOffset},${horizontalOffset})rotate(90)`,
        )
        .on('click', (event: MouseEvent, matrixElement: Node) => {
          this.sort(matrixElement._id);
        });

      columnEnter
        .attr('cursor', 'pointer')
        .on('mouseover', (event: MouseEvent, matrixElement: Node) => {
          this.showToolTip(event, matrixElement);
          this.hoverNode(matrixElement._id);
        })
        .on('mouseout', (event: MouseEvent, matrixElement: Node) => {
          this.hideToolTip();
          this.unHoverNode(matrixElement._id);
        });

      this.edgeColumns.merge(columnEnter);

      // Draw each row
      this.edgeRows = this.edges
        .selectAll('.rowContainer')
        .data(this.network.nodes, (d: Node) => d._id)
        .attr('transform', (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`);

      this.edgeRows.exit().remove();

      const rowEnter = this.edgeRows
        .enter()
        .append('g')
        .attr('class', 'rowContainer')
        .attr('transform', (d: Node) => {
          if (d.type === 'childnode') {
            return `translate(0, ${this.orderingScale(d.parentPosition as number)})`;
          }
          return 'translate(0, 0)';
        });

      rowEnter
        .transition(transition().duration(1100))
        .attr('transform', (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`);

      // Update existing topoRols
      this.edges
        .selectAll('.topoRow')
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.left + this.visMargins.right,
        );

      rowEnter
        .append('rect')
        .classed('topoRow', true)
        .attr('id', (d: Node) => `topoRow${d._id}`)
        .attr('x', -this.visMargins.left)
        .attr('y', 0)
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.left + this.visMargins.right,
        )
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill-opacity', 0);

      // add foreign objects for label
      rowEnter
        .append('foreignObject')
        .attr('x', -rowLabelContainerStart + 29)
        .attr('y', -5)
        .attr('width', (d: Node) => {
          if (d.type === 'supernode') {
            return labelContainerWidth - 45;
          }
          return labelContainerWidth - 15;
        })
        .attr('height', labelContainerHeight)
        .classed('rowForeign', true)
        .append('xhtml:p')
        .text((d: Node) => d._key)
        .style('color', (d: Node) => {
          if (d.type === 'node') {
            return '#aaa';
          }
          return 'black';
        })
        .classed('rowLabels', true);

      rowEnter
        .selectAll('p')
        .style('color', (d: Node) => (this.aggregated && d.type !== 'supernode' ? '#AAAAAA' : '#000000'));

      // Invisible Rectangles for Foreign Row Labels
      rowEnter
        .append('rect')
        .attr('x', -rowLabelContainerStart + 20)
        .attr('y', 0)
        .attr('width', labelContainerWidth - 25)
        .attr('height', 15)
        .attr('class', 'rowLabelRect')
        .style('opacity', 0)
        .attr('cursor', 'pointer')
        .on('click', (event: MouseEvent, matrixElement: Node) => {
          store.commit.clickElement(matrixElement._id);
        })
        .on('mouseover', (event: MouseEvent, node: Node) => {
          this.showToolTip(event, node);
          this.hoverNode(node._id);
        })
        .on('mouseout', (event: MouseEvent, node: Node) => {
          this.hideToolTip();
          this.unHoverNode(node._id);
        });

      // Invisible Rect Transform
      const invisibleRectTransform = 'translate(-73,2)';
      // Icon Paths
      const expandPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M11,7H13V11H17V13H13V17H11V13H7V11H11V7Z';
      const retractPath = 'M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M17,11V13H7V11H17Z';

      // Update existing icons
      (selectAll('.aggrButton') as any)
        .data(this.network.nodes, (d: Node) => d._id)
        .attr('d', (d: Node) => {
          if (d.type === 'supernode') {
            if (this.expandedSuperNodes.has(d._id)) {
              return retractPath;
            }
            return expandPath;
          }
          return '';
        });

      // Add Icons
      rowEnter
        .append('path')
        .attr('d', (d: Node) => {
          if (d.type === 'supernode') {
            if (this.expandedSuperNodes.has(d._id)) {
              return retractPath;
            }
            return expandPath;
          }
          return '';
        })
        .attr('class', 'aggrButton')
        .attr('fill', '#8B8B8B')
        .attr('transform', `${invisibleRectTransform}scale(0.5)`);

      // Add Rectangles
      rowEnter
        .append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('transform', invisibleRectTransform)
        .style('opacity', 0)
        .attr('class', 'invisibleRect')
        .attr('cursor', (d: Node) => {
          if (d.type === 'supernode') {
            return 'pointer';
          }
          return '';
        })
        .on('click', (event: MouseEvent, node: Node) => {
          // allow expanding the vis if aggregation is turned on
          if (this.aggregated) {
            if (node.type !== 'supernode') {
              return;
            }
            // expand and retract the supernode aggregation based on user selection
            if (this.expandedSuperNodes.has(node._id)) {
              // retract
              this.expandedSuperNodes.delete(node._id);
              store.dispatch.retractAggregatedNode(node._id);
            } else {
              // expand
              this.expandedSuperNodes.add(node._id);
              store.dispatch.expandAggregatedNode(node._id);
            }
          } else {
            store.commit.clickElement(node._id);
          }
        });

      rowEnter.append('g').attr('class', 'cellsGroup');

      this.edgeRows.merge(rowEnter);

      this.drawGridLines();

      // Draw cells
      this.cells = selectAll('.cellsGroup')
        .selectAll('.cell')
        .data((d: unknown, i: number) => this.matrix[i]);

      // Update existing cells
      this.cells
        .attr('id', (d: Cell) => d.cellName)
        .attr('x', (d: Cell) => {
          const xLocation = this.orderingScale(d.x);
          return xLocation !== undefined ? xLocation + 1 : null;
        })
        .attr('y', 1)
        .attr('width', this.cellSize - 2)
        .attr('height', this.cellSize - 2)
        .attr('rx', cellRadius)
        .style('fill', (d: Cell) => {
          if (d.rowCellType === 'supernode' && d.colCellType === 'supernode') {
            return this.parentColorScale(d.z);
          }
          return this.cellColorScale(d.z);
        })
        .style('fill-opacity', (d: Cell) => d.z)
        .on('mouseover', (event: MouseEvent, matrixElement: Cell) => {
          this.showToolTip(event, matrixElement);
          this.hoverEdge(matrixElement);
        })
        .on('mouseout', (event: MouseEvent, matrixElement: Cell) => {
          this.hideToolTip();
          this.unHoverEdge(matrixElement);
        })
        .on('click', (event: MouseEvent, matrixElement: Cell) => store.commit.clickCell(matrixElement))
        .attr('cursor', 'pointer');

      this.cells.exit().remove();

      // Render new cells
      const cellsEnter = this.cells
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('id', (d: Cell) => d.cellName)
        .attr('x', (d: Cell) => {
          const xLocation = this.orderingScale(d.x);
          return xLocation !== undefined ? xLocation + 1 : null;
        })
        .attr('y', 1)
        .attr('width', this.cellSize - 2)
        .attr('height', this.cellSize - 2)
        .attr('rx', cellRadius)
        .style('fill', (d: Cell) => {
          if (d.rowCellType === 'supernode' && d.colCellType === 'supernode') {
            return this.parentColorScale(d.z);
          }
          return this.cellColorScale(d.z);
        })
        .style('fill-opacity', (d: Cell) => d.z)
        .on('mouseover', (event: MouseEvent, matrixElement: Cell) => {
          this.showToolTip(event, matrixElement);
          this.hoverEdge(matrixElement);
        })
        .on('mouseout', (event: MouseEvent, matrixElement: Cell) => {
          this.hideToolTip();
          this.unHoverEdge(matrixElement);
        })
        .on('click', (event: MouseEvent, matrixElement: Cell) => store.commit.clickCell(matrixElement))
        .attr('cursor', 'pointer');

      this.cells.merge(cellsEnter);
    },

    drawGridLines(): void {
      selectAll('.gridLines').remove();
      const gridLines = this.edges
        .append('g')
        .attr('class', 'gridLines')
        .style('opacity', this.showGridLines ? 0.3 : 0);

      const lines = gridLines
        .selectAll('line')
        .data(this.matrix)
        .enter();

      // vertical grid lines
      lines
        .append('line')
        .attr('transform', (d: any, i: number) => `translate(${this.orderingScale(i)},0)rotate(-90)`)
        .attr('x1', -this.orderingScale.range()[1]);

      // horizontal grid lines
      lines
        .append('line')
        .attr('transform', (d: any, i: number) => `translate(0,${this.orderingScale(i)})`)
        .attr('x2', this.orderingScale.range()[1]);

      // vertical grid line edges
      gridLines
        .append('line')
        .attr('x1', this.orderingScale.range()[1])
        .attr('x2', this.orderingScale.range()[1])
        .attr('y1', 0)
        .attr('y2', this.orderingScale.range()[1])
        .style('stroke', '#aaa');

      // horizontal grid line edges
      gridLines
        .append('line')
        .attr('x1', 0)
        .attr('x2', this.orderingScale.range()[1])
        .attr('y1', this.orderingScale.range()[1])
        .attr('y2', this.orderingScale.range()[1])
        .style('stroke', '#aaa');
    },

    sort(order: string): void {
      if (this.network === null) {
        return;
      }
      const nodeIDs = this.network.nodes.map((node: Node) => node._id);

      this.changeOrder(order, nodeIDs.includes(order));
    },

    isQuantitative(varName: string): boolean {
      if (this.network !== null) {
        const uniqueValues = [
          ...new Set(
            this.network.edges.map((edge: Edge) => parseFloat(`${edge[varName]}`)),
          ),

        ];
        return uniqueValues.length > 15;
      }
      return false;
    },

    isString(element: unknown): element is string {
      return element instanceof String;
    },

    showToolTip(event: MouseEvent, networkElement: Cell | Node): void {
      let message = '';

      if (this.isCell(networkElement)) {
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
            message += `<br/> ${this.capitalizeFirstLetter(key)}: ${networkElement[key]}`;
          }
        });
      }

      select(this.$refs.tooltip as any)
        .style('left', `${event.clientX - 256 + 10}px`)
        .style('top', `${event.clientY + 10}px`)
        .html(message)
        .transition(transition().delay(100).duration(200) as any)
        .style('opacity', 0.9);
    },

    hideToolTip(): void {
      select(this.$refs.tooltip as any)
        .transition(transition().delay(100).duration(200) as any)
        .style('opacity', 0);
    },

    changeOrder(type: string, node: boolean) {
      this.sortObserver(type, node);
    },

    sortObserver(type: string, isNode = false) {
      let order;
      this.sortKey = type;
      if (
        type === 'clusterSpectral'
        || type === 'clusterBary'
        || type === 'clusterLeaf'
      ) {
        if (this.network == null) {
          return;
        }
        const edges: any[] = Array(this.network.edges.length);

        // Generate edges that are compatible with reorder.js
        this.network.edges.forEach((edge: Edge, index: number) => {
          edges[index] = {
            source: this.network!.nodes.find(
              (node: Node) => node._id === edge._from,
            ),
            target: this.network!.nodes.find(
              (node: Node) => node._id === edge._to,
            ),
          };
        });

        const sortableNetwork = reorder
          .graph()
          .nodes(this.network.nodes)
          .links(edges)
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
      } else if (this.sortKey === 'edges') {
        order = range(this.network!.nodes.length).sort((a, b) => {
          const firstValue = this.network!.nodes[b][type] as number;
          const secondValue = this.network!.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      } else if (isNode === true) {
        order = range(this.network!.nodes.length).sort((a, b) => this.network!.nodes[a]._id.localeCompare(this.network!.nodes[b]._id));
        order = range(this.network!.nodes.length).sort(
          (a, b) => Number(this.network!.nodes[b].neighbors.includes(type))
            - Number(this.network!.nodes[a].neighbors.includes(type)),
        );
      } else if (this.sortKey === 'shortName') {
        order = range(this.network!.nodes.length).sort((a, b) => this.network!.nodes[a]._id.localeCompare(this.network!.nodes[b]._id));
      } else {
        order = range(this.network!.nodes.length).sort((a, b) => {
          const firstValue = this.network!.nodes[b][type] as number;
          const secondValue = this.network!.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      }
      this.sortOrder = order;
    },

    isCell(element: unknown): element is Cell {
      return Object.prototype.hasOwnProperty.call(element, 'cellName');
    },

    capitalizeFirstLetter(word: string) {
      return word[0].toUpperCase() + word.slice(1);
    },

    hoverNode(nodeID: string) {
      store.commit.pushHoveredNode(nodeID);
    },

    unHoverNode(nodeID: string) {
      store.commit.removeHoveredNode(nodeID);
    },

    hoverEdge(cell: Cell) {
      this.hoverNode(cell.rowID);
      this.hoverNode(cell.colID);
    },

    unHoverEdge(cell: Cell) {
      this.unHoverNode(cell.rowID);
      this.unHoverNode(cell.colID);
    },
  },
});
</script>

<template>
  <div>
    <v-container class="d-inline-flex">
      <div>
        <svg
          id="matrix"
          ref="matrix"
          :width="matrixWidth"
          :height="matrixHeight"
          :viewbox="`0 0 ${matrixWidth} ${matrixHeight}`"
        />
      </div>
      <line-up v-if="finishedMounting" />
    </v-container>

    <div
      id="tooltip"
      ref="tooltip"
    />
  </div>
</template>

<style scoped>
svg >>> .baseCell {
  fill-opacity: 0;
}

svg >>> .rowLabels {
  max-width: 45px;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 12pt;
  z-index: 100;
}

svg >>> .colLabels {
  max-width: 55px;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 12pt;
  z-index: 100;
}

svg >>> .hoveredCell {
  stroke-width: 1px;
  stroke: darkgray;
}

svg >>> .neighbor {
  fill: #caffc7;
  fill-opacity: 1;
}

svg >>> .colLabel,
svg >>> .rowLabel {
  cursor: pointer;
  fill: black !important;
}

svg >>> .highlightedCell {
  fill: #fff4d3;
  fill-opacity: 1 !important;
}

svg >>> .highlightCol {
  pointer-events: auto;
}

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

svg >>> .hovered {
  fill: #fde8ca;
  fill-opacity: 1 !important;
}

svg >>> .clicked {
  font-weight: 800;
  fill: #f8cf91;
  fill-opacity: 1;
}

svg >>> .cell.clicked {
  stroke: red;
  stroke-width: 3;
}

svg >>> text.hovered {
  font-weight: 450;
}

svg >>> text.clicked {
  font-weight: 650;
  fill: black !important;
}

svg >>> .gridLines {
  pointer-events: none;
  stroke: #aaa;
  opacity: 0.3;
}

svg >>> g.box line {
  stroke: slategray;
}
</style>
