<script lang="ts">
import Vue, { PropType } from 'vue';

import { View } from '@/components/MultiMatrix/MultiMatrixMethods';
import { Cell, Dimensions, Link, Network, Node } from '@/types';
import { range, ScaleBand, scaleBand, select, selectAll } from 'd3';

export default Vue.extend({
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
    visualizedAttributes: {
      type: Array,
      default: () => [],
    },
  },

  data(): {
    browser: Dimensions;
    visMargins: any;
    matrixSVG: any;
    attributesSVG: any;
    view: View | undefined;
    cellSize: number;
    idMap: { [key: string]: number };
    maxNumConnections: number;
    matrix: Cell[][];
    attributes: any;
    attributeRows: any;
    columnHeaders: any;
    edges: any;
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      matrixSVG: undefined,
      attributesSVG: undefined,
      view: undefined,
      cellSize: 15,
      idMap: {},
      maxNumConnections: -Infinity,
      matrix: [],
      attributes: undefined,
      attributeRows: undefined,
      columnHeaders: undefined,
      edges: undefined,
    };
  },

  computed: {
    properties(this: any) {
      const { network, visualizedAttributes, enableGraffinity } = this;
      return {
        network,
        visualizedAttributes,
        enableGraffinity,
      };
    },

    matrixNodeLength(): number {
      return this.network.nodes.length;
    },

    matrixWidth(): number {
      return (
        this.matrixNodeLength * this.cellSize +
        this.visMargins.left +
        this.visMargins.right
      );
    },

    matrixHeight(): number {
      return (
        this.matrixNodeLength * this.cellSize +
        this.visMargins.top +
        this.visMargins.bottom
      );
    },

    attributesWidth(): number {
      return 300;
    },

    attributesHeight(): number {
      return this.matrixHeight;
    },

    orderingScale(): ScaleBand<number> {
      return scaleBand<number>()
        .domain(range(0, this.matrix.length, 1))
        .range([0, this.matrixHighlightLength]);
    },

    matrixHighlightLength(): number {
      return this.matrix.length * this.cellSize;
    },
  },

  watch: {
    properties() {
      this.updateVis();
    },
    network() {
      this.generateIdMap();
      this.processData();
      this.changeMatrix();
    },
  },

  async mounted(this: any) {
    this.browser.width =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;

    this.browser.height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    // Size the svgs
    this.matrixSVG = select(this.$refs.matrix)
      .attr('width', this.matrixWidth)
      .attr('height', this.matrixHeight)
      .attr('viewBox', `0 0 ${this.matrixWidth} ${this.matrixHeight}`);

    this.attributesSVG = select(this.$refs.attributes)
      .attr('width', this.attributesWidth)
      .attr('height', this.attributesHeight)
      .attr('viewBox', `0 0 ${this.attributesWidth} ${this.attributesHeight}`);

    this.generateIdMap();

    // Run process data to convert links to cells
    this.processData();

    this.edges = select('#matrix')
      .append('g')
      .attr(
        'transform',
        `translate(${this.visMargins.left},${this.visMargins.top})`,
      );

    this.initializeAttributes();

    // Define the View
    this.view = new View(
      this.network,
      this.visualizedAttributes,
      this.cellSize,
      this.visMargins,
      this.enableGraffinity,
      this.matrix,
      this.maxNumConnections,
      this.orderingScale,
      this.columnHeaders,
      this.edges,
      this.attributes,
      this.attributeRows,
    );

    this.$emit('updateMatrixLegendScale', this.view.colorScale);
  },

  methods: {
    updateVis() {
      if (this.view) {
        this.view.visualizedAttributes = this.visualizedAttributes as string[];
        this.view.updateAttributes();

        this.view.enableGraffinity = this.enableGraffinity;
      }
    },

    changeMatrix(this: any) {
      select('#matrix').selectAll('*').remove();

      this.browser.width =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;

      this.browser.height =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;

      // Size the svgs
      this.matrixSVG = select(this.$refs.matrix)
        .attr('width', this.matrixWidth)
        .attr('height', this.matrixHeight)
        .attr('viewBox', `0 0 ${this.matrixWidth} ${this.matrixHeight}`);

      this.attributesSVG = select(this.$refs.attributes)
        .attr('width', this.attributesWidth)
        .attr('height', this.attributesHeight)
        .attr(
          'viewBox',
          `0 0 ${this.attributesWidth} ${this.attributesHeight}`,
        );

      this.edges = select('#matrix')
        .append('g')
        .attr(
          'transform',
          `translate(${this.visMargins.left},${this.visMargins.top})`,
        );

      this.initializeAttributes();

      this.view = new View(
        this.network,
        this.visualizedAttributes,
        this.cellSize,
        this.visMargins,
        this.enableGraffinity,
        this.matrix,
        this.maxNumConnections,
        this.orderingScale,
        this.columnHeaders,
        this.edges,
        this.attributes,
        this.attributeRows,
      );
    },

    generateIdMap() {
      this.idMap = {};
      this.network.nodes.forEach((node: Node, index: number) => {
        node.index = index;
        this.idMap[node.id] = index;
      });
    },

    processData(): void {
      this.network.nodes.forEach((rowNode: Node, i: number) => {
        this.matrix[i] = this.network.nodes.map((colNode: Node) => {
          return {
            cellName: `${rowNode.id}_${colNode.id}`,
            correspondingCell: `${colNode.id}_${rowNode.id}`,
            rowID: rowNode.id,
            colID: colNode.id,
            x: colNode.index,
            y: rowNode.index,
            z: 0,
          };
        });
      });

      // Count occurrences of links and store it in the matrix
      this.network.links.forEach((link: Link) => {
        this.matrix[this.idMap[link.source]][this.idMap[link.target]].z += 1;
        this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += 1;
      });

      // Find max value of z
      this.matrix.forEach((row: Cell[]) => {
        row.forEach((cell: Cell) => {
          if (cell.z > this.maxNumConnections) {
            this.maxNumConnections = cell.z;
          }
        });
      });
    },

    initializeAttributes(): void {
      const attributeWidth = 1000; // Just has to be larger than the attributes panel (so that we render to the edge)

      this.attributes = select('#attributes')
        .append('g')
        .attr('transform', `translate(0,${this.visMargins.top})`);

      // add zebras and highlight rows
      this.attributes
        .selectAll('.highlightRow')
        .data(this.network.nodes)
        .enter()
        .append('rect')
        .classed('highlightRow', true)
        .attr('x', 0)
        .attr('y', (d: Node, i: number) => this.orderingScale(i))
        .attr('width', attributeWidth)
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill', (d: Node, i: number) => (i % 2 === 0 ? '#fff' : '#eee'));

      // Draw each row (translating the y coordinate)
      this.attributeRows = this.attributes
        .selectAll('.attrRowContainer')
        .data(this.network.nodes)
        .enter()
        .append('g')
        .attr('class', 'attrRowContainer')
        .attr(
          'transform',
          (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`,
        );

      this.attributeRows
        .append('line')
        .attr('x1', 0)
        .attr('x2', attributeWidth)
        .attr('stroke', '2px')
        .attr('stroke-opacity', 0.3);

      this.attributeRows
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .classed('attrRow', true)
        .attr('id', (d: Node) => `attrRow${d.id}`)
        .attr('width', attributeWidth)
        .attr('height', this.orderingScale.bandwidth()) // end addition
        .attr('fill-opacity', 0)
        .attr('cursor', 'pointer')
        .on('mouseover', (d: Node, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverNode(d.id);
        })
        .on('mouseout', (d: Node) => {
          this.hideToolTip();
          this.unHoverNode(d.id);
        });
      // .on('click', (d: Node) => {
      //   this.selectElement(d);
      //   this.selectNeighborNodes(d.id, d.neighbors);
      // });

      this.columnHeaders = this.attributes
        .append('g')
        .classed('column-headers', true);
    },

    showToolTip(d: Cell | Node, i: number, nodes: any): void {
      const matrix = nodes[i]
        .getScreenCTM()
        .translate(nodes[i].getAttribute('x'), nodes[i].getAttribute('y'));

      let message = '';

      if (this.isCell(d)) {
        // Get link source and target
        message = `
      Row ID: ${d.rowID} <br/>
      Col ID: ${d.colID} <br/>
      Number of edges: ${d.z}`;
      } else {
        // Get node id
        message = `ID: ${d.id}`;

        // Loop through other props to add to tooltip
        for (const key of Object.keys(d)) {
          if (!['_key', '_rev', 'id', 'neighbors'].includes(key)) {
            message += `<br/> ${this.capitalizeFirstLetter(key)}: ${d[key]}`;
          }
        }
      }

      select(this.$refs.tooltip as any).html(message);

      select(this.$refs.tooltip as any)
        .style('left', `${window.pageXOffset + matrix.e}px`)
        .style(
          'top',
          `${
            window.pageYOffset +
            matrix.f -
            select(this.$refs.tooltip as any)
              .node()
              .getBoundingClientRect().height
          }px`,
        );

      select(this.$refs.tooltip as any)
        .transition()
        .delay(100)
        .duration(200)
        .style('opacity', 0.9);
    },

    hideToolTip(): void {
      select(this.$refs.tooltip as any)
        .transition()
        .delay(100)
        .duration(200)
        .style('opacity', 0);
    },

    isCell(element: any): element is Cell {
      return Object.prototype.hasOwnProperty.call(element, 'cellName');
    },

    capitalizeFirstLetter(word: string) {
      return word[0].toUpperCase() + word.slice(1);
    },

    hoverNode(nodeID: string): void {
      const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', true);
    },

    unHoverNode(nodeID: string): void {
      const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', false);
    },
  },
});
</script>

<template>
  <div>
    <svg id="matrix" ref="matrix" width="800" height="900" />
    <svg id="attributes" ref="attributes" width="300" height="900" />
    <div id="tooltip" ref="tooltip" />
  </div>
</template>

<style scoped>
svg >>> .baseCell {
  fill-opacity: 0;
}

svg >>> .rowLabels {
  max-width: 75px;
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

svg >>> line {
  pointer-events: none;
  stroke: #aaa;
  opacity: 0.3;
}
</style>
