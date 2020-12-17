<script lang="ts">
import Vue, { PropType } from 'vue';

import { View } from '@/components/MultiMatrix/MultiMatrixMethods';
import { Cell, Dimensions, Link, Network, Node } from '@/types';
import { range, ScaleBand, scaleBand, select } from 'd3';

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

      this.view = new View(
        this.network,
        this.visualizedAttributes,
        this.cellSize,
        this.visMargins,
        this.enableGraffinity,
        this.matrix,
        this.maxNumConnections,
        this.orderingScale,
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
  fill: #f8cf91 !important;
  fill-opacity: 1 !important;
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
