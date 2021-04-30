<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import Vue, { PropType } from 'vue';

import {
  expandSuperNetwork,
  retractSuperNetwork,
  nonAggrNetwork,
} from '@/lib/aggregation';
import {
  Cell,
  Dimensions,
  Link,
  Network,
  Node,
  ProvenanceState,
} from '@/types';
import {
  ScaleBand,
  scaleBand,
  ScaleLinear,
  scaleLinear,
} from 'd3-scale';
import {
  range,
} from 'd3-array';
import { select, selectAll } from 'd3-selection';
import { transition } from 'd3-transition';
import * as ProvenanceLibrary from 'provenance-lib-core/lib/src/provenance-core/Provenance';
import store from '@/store';
import LineUp from '@/components/LineUp.vue';

import 'science';
import 'reorder.js';

declare const reorder: any;

export default Vue.extend({
  components: {
    LineUp,
  },

  props: {
    network: {
      type: Object as PropType<Network>,
      required: true,
    },
    selectNeighbors: {
      type: Boolean,
      default: true,
    },
    enableGraffinity: {
      type: Boolean,
      required: true,
    },
    showAggrLegend: {
      type: Boolean,
      required: true,
    },
    showChildLegend: {
      type: Boolean,
      required: true,
    },
    directional: {
      type: Boolean,
      default: false,
    },
  },

  data(): {
    browser: Dimensions;
    visMargins: any;
    matrixSVG: any;
    maxNumConnections: number;
    maxAggrConnections: number;
    maxChildConnections: number;
    matrix: Cell[][];
    columnHeaders: any;
    edges: any;
    edgeColumns: any;
    edgeRows: any;
    cells: any;
    clickMap: Map<string, boolean>; // variable for keeping track of whether a label has been clicked or not
    nonAggrNodes: Node[];
    nonAggrLinks: Link[];
    expandRetractAggrVisNodes: Network; // variable for keeping track of the current nodes being visualized
    expandRetractAggrVisEdges: Network; // variable for keeping track of the current links being visualized
    icons: { [key: string]: { [d: string]: string } };
    selectedNodesAndNeighbors: { [key: string]: string[] };
    order: any;
    orderType: any;
    provenance: any;
    sortKey: string;
    colMargin: number;
    linkAttributeRows: any;
    combinedAttributes: string[];
    showIcon: boolean;
    aggregated: boolean;
    sidebarWidth: number;
    } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: {
        left: 75, top: 75, right: 0, bottom: 0,
      },
      matrixSVG: undefined,
      maxNumConnections: -Infinity,
      maxAggrConnections: -Infinity,
      maxChildConnections: -Infinity,
      matrix: [],
      columnHeaders: undefined,
      edges: undefined,
      edgeColumns: undefined,
      edgeRows: undefined,
      cells: undefined,
      clickMap: new Map<string, boolean>(),
      nonAggrNodes: [],
      nonAggrLinks: [],
      expandRetractAggrVisNodes: {
        nodes: [],
        edges: [],
      },
      expandRetractAggrVisEdges: {
        nodes: [],
        edges: [],
      },
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
      selectedNodesAndNeighbors: {},
      order: undefined,
      orderType: undefined,
      provenance: undefined,
      sortKey: '',
      colMargin: 5,
      linkAttributeRows: undefined,
      combinedAttributes: [],
      showIcon: false,
      aggregated: false,
      sidebarWidth: 256,
    };
  },

  computed: {
    properties(this: any) {
      const {
        network,
        enableGraffinity,
        showAggrLegend,
        showChildLegend,
      } = this;
      return {
        network,
        enableGraffinity,
        showAggrLegend,
        showChildLegend,
      };
    },

    cellSize() {
      return store.state.cellSize;
    },

    selectedNodes() {
      return store.getters.selectedNodes;
    },

    selectedCells() {
      return store.getters.selectedCells;
    },

    matrixNodeLength(): number {
      return this.network.nodes.length;
    },

    matrixWidth(): number {
      return (
        this.matrixNodeLength * this.cellSize
        + this.visMargins.left
        + this.visMargins.right
      );
    },

    matrixHeight(): number {
      return (
        this.matrixNodeLength * this.cellSize
        + this.visMargins.top
        + this.visMargins.bottom
      );
    },

    orderingScale(): ScaleBand<number> {
      return scaleBand<number>()
        .domain(range(0, this.matrix.length, 1))
        .range([0, this.matrixHighlightLength]);
    },

    matrixHighlightLength(): number {
      return this.matrix.length * this.cellSize;
    },

    idMap() {
      const computedIdMap: { [key: string]: number } = {};
      this.network.nodes.forEach((node: Node, index: number) => {
        computedIdMap[node._id] = index;
      });

      return computedIdMap;
    },

    colorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxNumConnections])
        .range(['#feebe2', '#690000']); // TODO: colors here are arbitrary, change later
    },

    aggrColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxAggrConnections])
        .range(['#dcedfa', '#0066cc']);
    },

    childColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxChildConnections])
        .range(['#f79d97', '#c0362c']);
    },
  },

  watch: {
    selectedNodes() {
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

    network() {
      this.processData();
      this.initializeEdges();
    },

    directional() {
      this.processData();
      this.initializeEdges();
    },

    enableGraffinity() {
      if (!this.enableGraffinity && this.aggregated === true) {
        // Clear the click map so correct icons are drawn for aggregation
        this.clickMap.clear();

        store.commit.setNetwork(
          nonAggrNetwork(this.nonAggrNodes, this.nonAggrLinks),
        );

        // Update everything on the screen
        const columnLabelContainerStart = 20;
        const labelContainerHeight = 25;
        const rowLabelContainerStart = 75;
        const labelContainerWidth = rowLabelContainerStart;

        // Update the rows and row labels
        (selectAll('.rowContainer') as any)
          .selectAll('.rowForeign')
          .data(this.network.nodes, (d: Node) => d._id)
          .attr('x', -rowLabelContainerStart + 20)
          .attr('y', -5)
          .attr('width', labelContainerWidth - 15)
          .attr('height', labelContainerHeight);

        (selectAll('.rowLabels') as any)
          .data(this.network.nodes, (d: Node) => d._id)
          .style('color', 'black')
          .classed('rowLabels', true);

        // Update the columns and the column labels
        (selectAll('.column') as any)
          .selectAll('foreignObject')
          .data(this.network.nodes, (d: Node) => d._id)
          .attr('y', -5)
          .attr('x', columnLabelContainerStart)
          .attr('width', labelContainerWidth)
          .attr('height', labelContainerHeight);

        (selectAll('.colLabels') as any)
          .data(this.network.nodes, (d: Node) => d._id)
          .style('color', 'black')
          .classed('rowLabels', true);

        // Update the children count and labels
        (select('.childCount') as any).style('opacity', 0);

        (selectAll('.countLabels') as any).style('opacity', 0);

        // Update the legend
        this.$emit('updateMatrixLegends', false, false);

        // Reset aggregated state
        this.aggregated = false;
      }
    },

    colorScale() {
      this.$emit('updateMatrixLegendScale', this.colorScale);
    },

    aggrColorScale() {
      this.$emit(
        'updateAggrMatrixLegendScale',
        this.aggrColorScale,
        'aggregate',
      );
    },

    childColorScale() {
      this.$emit('updateChildMatrixLegendScale', this.childColorScale, 'child');
    },
  },

  async mounted(this: any) {
    this.browser.width = window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;

    this.browser.height = window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight;

    // Run process data to convert links to cells
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

    this.provenance = this.setUpProvenance();

    this.initializeEdges();
  },

  methods: {
    processData(): void {
      // Reset some values that will be re-calcuated
      this.maxNumConnections = 0;
      this.maxAggrConnections = 0;
      this.maxChildConnections = 0;
      this.matrix = [];

      this.network.nodes.forEach((rowNode: Node, i: number) => {
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
      });

      // Count occurrences of edges and store it in the matrix
      this.network.edges.forEach((edge: Link) => {
        this.matrix[this.idMap[edge._from]][this.idMap[edge._to]].z += 1;

        if (!this.directional) {
          this.matrix[this.idMap[edge._to]][this.idMap[edge._from]].z += 1;
        }
      });

      // Find max value of z
      this.matrix.forEach((row: Cell[]) => {
        row.forEach((cell: Cell) => {
          if (
            cell.rowCellType === undefined
            || cell.colCellType === undefined
          ) {
            if (cell.z > this.maxNumConnections) {
              this.maxNumConnections = cell.z;
            }
          }
          if (
            cell.rowCellType === 'supernode'
            && cell.colCellType === 'supernode'
          ) {
            if (cell.z > this.maxAggrConnections) {
              this.maxAggrConnections = cell.z;
            }
          }
          if (
            cell.rowCellType === 'childnode'
            || cell.colCellType === 'childnode'
          ) {
            if (cell.z > this.maxChildConnections) {
              this.maxChildConnections = cell.z;
            }
          }
        });
      });
    },

    setUpProvenance(): any {
      const initialState = {
        workerID: 1, // workerID is a global variable
        nodes: '', // array of nodes that keep track of their position, whether they were softSelect or hardSelected;
        search: '', // field to store the id of a searched node;
        startTime: Date.now(), // time this provenance graph was created and the task initialized;
        endTime: '', // time the submit button was pressed and the task ended;
        time: Date.now(), // timestamp for the current state of the graph;
        count: 0,
        clicked: [],
        sortKey: this.sortKey,
        selections: {
          rowLabel: {},
          colLabel: {},
          neighborSelect: {},
          cellCol: {},
          cellRow: {},
          search: {},
        },
      };

      const provenance = ProvenanceLibrary.initProvenance(initialState);
      this.provenance = provenance;

      return provenance;
    },

    initializeEdges(): void {
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

      columnEnter.selectAll('p').style('color', (d: Node) => {
        if (d.type === 'childnode') {
          return '#aaa';
        }
        return 'black';
      });

      columnEnter
        .on('mouseover', (event: MouseEvent, matrixElement: Cell) => {
          this.showToolTip(event, matrixElement);
          this.hoverEdge(matrixElement);
        })
        .attr('cursor', 'pointer');

      columnEnter.on('mouseout', (event: MouseEvent, matrixElement: Cell) => {
        this.hideToolTip();
        this.unHoverEdge(matrixElement);
      });

      // Invisible Rectangles for Foreign Column Labels
      columnEnter
        .append('rect')
        .attr('y', 0)
        .attr('x', columnLabelContainerStart)
        .attr('width', labelContainerWidth)
        .attr('height', 15)
        .attr('class', 'colLabelRect')
        .style('opacity', 0)
        .attr('cursor', 'pointer')
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
          const action = this.changeInteractionWrapper('neighborSelect');
          this.provenance.applyAction(action);
        })
        .attr('cursor', 'pointer')
        .on('mouseover', (event: MouseEvent, matrixElement: Cell) => {
          this.showToolTip(event, matrixElement);
          this.hoverEdge(matrixElement);
        })
        .on('mouseout', (event: MouseEvent, matrixElement: Cell) => {
          this.hideToolTip();
          this.unHoverEdge(matrixElement);
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
        .attr('x', (d: Node) => {
          if (d.type === 'childnode') {
            return -rowLabelContainerStart + 29;
          }
          return -rowLabelContainerStart + 20;
        })
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

      rowEnter.selectAll('p').style('color', (d: Node) => {
        if (d.type === 'childnode') {
          return '#aaa';
        }
        return 'black';
      });

      rowEnter
        .on('mouseover', (event: MouseEvent, node: Node) => {
          this.showToolTip(event, node);
          this.hoverNode(node._id);
        })
        .attr('cursor', 'pointer');

      // Invisible Rectangles for Foreign Row Labels
      rowEnter
        .append('rect')
        .attr('x', (d: Node) => {
          if (d.type === 'childnode') {
            return -rowLabelContainerStart + 29;
          }
          return -rowLabelContainerStart + 20;
        })
        .attr('y', 0)
        .attr('width', labelContainerWidth - 25)
        .attr('height', 15)
        .attr('class', 'rowLabelRect')
        .style('opacity', 0)
        .attr('cursor', 'pointer')
        .on('click', (event: MouseEvent, matrixElement: Node) => {
          store.commit.clickElement(matrixElement._id);
        });

      rowEnter.on('mouseout', (event: MouseEvent, node: Node) => {
        this.hideToolTip();
        this.unHoverNode(node._id);
      });

      // Show the icons
      if (this.showIcon === true) {
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
              if (this.clickMap.get(d._id)) {
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
              if (this.clickMap.get(d._id) === true) {
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
            // allow expanding the vis if graffinity features are turned on
            if (this.enableGraffinity) {
              if (node.type === 'childnode') {
                return;
              }
              const supernode = node;
              // expand and retract the supernode aggregation based on user selection
              if (this.clickMap.get(supernode._id)) {
                store.commit.setNetwork(
                  retractSuperNetwork(
                    this.nonAggrNodes,
                    this.nonAggrLinks,
                    this.network.nodes,
                    this.network.edges,
                    supernode,
                  ),
                );
                this.clickMap.set(supernode._id, false);

                // Hide Child Legend
                const values = [...this.clickMap.values()];
                if (!values.includes(true)) {
                  this.$emit('updateMatrixLegends', true, false);
                }
              } else {
                store.commit.setNetwork(
                  expandSuperNetwork(
                    this.nonAggrNodes,
                    this.nonAggrLinks,
                    this.network.nodes,
                    this.network.edges,
                    supernode,
                  ),
                );
                this.clickMap.set(supernode._id, true);

                // Display Child Legend
                this.$emit('updateMatrixLegends', true, true);
              }
            } else {
              store.commit.clickElement(node._id);
            }
          });
      }

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
            return this.aggrColorScale(d.z);
          }
          if (d.rowCellType === 'childnode' || d.colCellType === 'childnode') {
            return this.childColorScale(d.z);
          }
          return this.colorScale(d.z);
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
            return this.aggrColorScale(d.z);
          }
          if (d.rowCellType === 'childnode' || d.colCellType === 'childnode') {
            return this.childColorScale(d.z);
          }
          return this.colorScale(d.z);
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

    changeInteractionWrapper(interactionType: string, cell?: Cell): any {
      return {
        label: interactionType,
        // eslint-disable-next-line consistent-return
        action: (interactID: string) => {
          const currentState = this.getApplicationState();
          // add time stamp to the state graph
          currentState.time = Date.now();
          currentState.event = interactionType;
          const interactionName = interactionType; // cell, search, etc
          let interactedElement: string = interactionType;
          if (interactionName === 'cell' && cell !== undefined) {
            // eslint-disable-next-line no-param-reassign
            interactID = cell.colID;
            interactedElement = cell.cellName; // + cellData.rowID;

            this.changeInteraction(
              currentState,
              interactID,
              'cellCol',
              interactedElement,
            );
            this.changeInteraction(
              currentState,
              interactID,
              'cellRow',
              interactedElement,
            );
            if (cell.cellName !== cell.correspondingCell) {
              interactedElement = cell.correspondingCell; // + cellData.rowID;
              // eslint-disable-next-line no-param-reassign
              interactID = cell.rowID;

              this.changeInteraction(
                currentState,
                interactID,
                'cellCol',
                interactedElement,
              );
              this.changeInteraction(
                currentState,
                interactID,
                'cellRow',
                interactedElement,
              );
            }
            return currentState;

            // interactID = cellData.rowID;
            // interactionName = interactionName + 'row'
          } if (interactionName === 'highlightRow') {
            return interactionName;
          }

          if (interactionName === 'neighborSelect') {
            this.changeInteraction(
              currentState,
              interactID,
              interactionName,
              interactedElement,
            );
            return currentState;
          }
        },
      };
    },

    changeInteraction(
      state: ProvenanceState,
      nodeID: string,
      interaction: keyof ProvenanceState['selections'],
      interactionName: string = interaction,
    ): void {
      if (nodeID in state.selections[interaction]) {
        // Remove element if in list, if list is empty, delete key
        const currentIndex = state.selections[interaction][nodeID].indexOf(
          interactionName,
        );
        if (currentIndex > -1) {
          state.selections[interaction][nodeID].splice(currentIndex, 1);
          if (state.selections[interaction][nodeID].length === 0) {
            delete state.selections[interaction][nodeID];
          }
        } else {
          state.selections[interaction][nodeID].push(interactionName);
        }
      } else {
        state.selections[interaction][nodeID] = [interactionName];
      }
    },

    drawGridLines(): void {
      selectAll('.gridLines').remove();
      const gridLines = this.edges.append('g').attr('class', 'gridLines');

      const lines = gridLines.selectAll('line').data(this.matrix).enter();

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
        .style('stroke', '#aaa')
        .style('opacity', 0.3);

      // horizontal grid line edges
      gridLines
        .append('line')
        .attr('x1', 0)
        .attr('x2', this.orderingScale.range()[1])
        .attr('y1', this.orderingScale.range()[1])
        .attr('y2', this.orderingScale.range()[1])
        .style('stroke', '#aaa')
        .style('opacity', 0.3);
    },

    sort(order: string): void {
      const nodeIDs = this.network.nodes.map((node: Node) => node._id);

      this.order = this.changeOrder(order, nodeIDs.includes(order));
      this.orderingScale.domain(this.order);

      const transitionTime = 500;

      (selectAll('.rowContainer') as any)
        .transition(transition().duration(transitionTime))
        .attr(
          'transform',
          (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`,
        );

      // if any other method other than neighbors sort, sort the columns too
      if (!nodeIDs.includes(order)) {
        this.edges
          .selectAll('.column')
          .transition(transition().duration(transitionTime))
          .attr(
            'transform',
            (d: any, i: number) => `translate(${this.orderingScale(i)},0)rotate(-90)`,
          );

        (selectAll('.rowContainer') as any)
          .selectAll('.cell')
          .transition(transition().duration(transitionTime))
          .attr('x', (d: Node, i: number) => this.orderingScale(i));
      }

      selectAll('.sortIcon')
        .style('fill', '#8B8B8B')
        .filter((d: any) => d._id === order)
        .style('fill', '#EBB769');
    },

    isQuantitative(varName: string): boolean {
      const uniqueValues = [
        ...new Set(
          this.network.edges.map((link: Link) => parseFloat(link[varName])),
        ),
      ];
      return uniqueValues.length > 15;
    },

    isString(element: unknown): element is string {
      return element instanceof String;
    },

    showToolTip(event: MouseEvent, networkElement: Cell | Node): void {
      let svgElement: SVGGraphicsElement;

      if (event.target === null || (event.target as SVGElement).className.baseVal === 'sortIcon') { return; }

      // If foreign object, get the foreign object, not the p
      if ((event.target as SVGElement).localName === 'p') {
        svgElement = (event.target as SVGElement).parentElement as unknown as SVGGraphicsElement;
      } else {
        svgElement = event.target as SVGGraphicsElement;
      }

      const CTM = svgElement
        .getCTM();

      if (CTM === null) { return; }

      const matrix = CTM
        .translate(parseFloat(svgElement.getAttribute('x') || this.matrixWidth.toString()), parseFloat(svgElement.getAttribute('y') || this.matrixHeight.toString()));

      let message = '';

      if (this.isCell(networkElement)) {
        // Get link source and target
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

      select(this.$refs.tooltip as any).html(message);

      select(this.$refs.tooltip as any)
        .style('left', `${matrix.e}px`)
        .style('top', `${matrix.f - select(this.$refs.tooltip as any).node().getBoundingClientRect().height}px`);

      select(this.$refs.tooltip as any)
        .transition(transition().delay(100).duration(200) as any)
        .style('opacity', 0.9);
    },

    hideToolTip(): void {
      select(this.$refs.tooltip as any)
        .transition(transition().delay(100).duration(200) as any)
        .style('opacity', 0);
    },

    changeOrder(type: string, node: boolean): number[] {
      const action = this.generateSortAction(type);
      this.provenance.applyAction(action);
      return this.sortObserver(type, node);
    },

    generateSortAction(
      sortKey: string,
    ): {
      label: string;
      action: (key: string) => ProvenanceState;
      args: any[];
    } {
      return {
        label: 'sort',
        action: (key: string) => {
          const currentState = this.getApplicationState();
          // add time stamp to the state graph
          currentState.time = Date.now();
          currentState.event = 'sort';

          currentState.sortKey = key;

          return currentState;
        },
        args: [sortKey],
      };
    },

    sortObserver(type: string, isNode = false): number[] {
      let order;
      this.sortKey = type;
      if (
        type === 'clusterSpectral'
        || type === 'clusterBary'
        || type === 'clusterLeaf'
      ) {
        const edges: any[] = Array(this.network.edges.length);

        // Generate links that are compatible with reorder.js
        this.network.edges.forEach((edge: Link, index: number) => {
          edges[index] = {
            source: this.network.nodes.find(
              (node: Node) => node._id === edge._from,
            ),
            target: this.network.nodes.find(
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
        order = range(this.network.nodes.length).sort((a, b) => {
          const firstValue = this.network.nodes[b][type] as number;
          const secondValue = this.network.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      } else if (isNode === true) {
        order = range(this.network.nodes.length).sort((a, b) => this.network.nodes[a]._id.localeCompare(this.network.nodes[b]._id));
        order = range(this.network.nodes.length).sort(
          (a, b) => Number(this.network.nodes[b].neighbors.includes(type))
            - Number(this.network.nodes[a].neighbors.includes(type)),
        );
      } else if (this.sortKey === 'shortName') {
        order = range(this.network.nodes.length).sort((a, b) => this.network.nodes[a]._id.localeCompare(this.network.nodes[b]._id));
      } else {
        order = range(this.network.nodes.length).sort((a, b) => {
          const firstValue = this.network.nodes[b][type] as number;
          const secondValue = this.network.nodes[a][type] as number;

          return firstValue - secondValue;
        });
      }
      this.order = order;
      return order;
    },

    getApplicationState(): ProvenanceState {
      return this.provenance.graph().current.state;
    },

    isCell(element: unknown): element is Cell {
      return Object.prototype.hasOwnProperty.call(element, 'cellName');
    },

    capitalizeFirstLetter(word: string) {
      return word[0].toUpperCase() + word.slice(1);
    },

    hoverNode(nodeID: string): void {
      const cssSelector = `[id="highlightRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', true);
    },

    unHoverNode(nodeID: string): void {
      const cssSelector = `[id="highlightRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', false);
    },

    hoverEdge(cell: Cell): void {
      this.hoverNode(cell.rowID);
      this.hoverNode(cell.colID);
    },

    unHoverEdge(cell: Cell): void {
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
      <line-up :data="network.nodes" />
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
