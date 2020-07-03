<script lang='ts'>
import * as d3 from 'd3';
import Vue, { PropType } from 'vue';

import { View } from '@/components/AdjMatrix/AdjMatrixMethods';
import { Dimensions, Network } from '@/types';

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
    visualizedAttributes: {
      type: Array,
      default: [],
    },
  },

  data(): {
    browser: Dimensions,
    visDimensions: Dimensions,
    visMargins: any,
    matrix: any,
    attributes: any,
    view: View|undefined,
    } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visDimensions: {
        height: 0,
        width: 0 ,
      },
      visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25,
      },
      matrix: undefined,
      attributes: undefined,
      view: undefined,
    };
  },

  computed: {
    properties(this: any) {
      const {
        network,
        visualizedAttributes,
      } = this;
      return {
        network,
        visualizedAttributes,
      };
    },

    matrixWidth(): number {
      return this.visDimensions.width * 0.75;
    },

    matrixHeight(): number {
      return this.visDimensions.height;
    },

    attributesWidth(): number {
      return this.visDimensions.width * 0.25 - 15; // 15 for the scrollbar
    },

    attributesHeight(): number {
      return this.matrixHeight;
    },
  },

  watch: {
    properties() {
      this.updateVis();
    },
  },

  async mounted(this: any) {
    this.browser.width = window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;

    this.browser.height = window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight;

    // Set dimensions of the node link
    this.visDimensions.width = this.browser.width * 0.75;
    this.visDimensions.height = this.browser.height - 24;

    // Size the svgs
    this.matrix = d3
      .select(this.$refs.matrix)
      .attr('width', this.matrixWidth)
      .attr('height', this.matrixHeight)
      .attr('viewBox', `0 0 ${this.matrixWidth} ${this.matrixHeight}`);

    this.attributes = d3
      .select(this.$refs.attributes)
      .attr('width', this.attributesWidth)
      .attr('height', this.attributesHeight)
      .attr('viewBox', `0 0 ${this.attributesWidth} ${this.attributesHeight}`);

    // Define the View
    this.view = new View(
      this.network,
      this.visualizedAttributes, 
      this.matrixWidth, 
      this.matrixHeight
    );
  },

  methods: {
    updateVis() {
      if (this.view) {
        this.view.visualizedAttributes = this.visualizedAttributes as string[];
        this.view.updateAttributes();
      }
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
