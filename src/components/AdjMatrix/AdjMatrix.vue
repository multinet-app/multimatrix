<script lang='ts'>
import * as d3 from 'd3';
import Vue from 'vue';

import { Model } from './model';
import { View } from './view';
import { Controller } from './controller';

export default Vue.extend({
  props: {
    app: {
      type: Object,
      required: true,
    },
    provenance: {
      type: Object,
      required: true,
    },
    graphStructure: {
      type: Object,
      default: () => undefined,
    },
    selectNeighbors: {
      type: Boolean,
      default: true,
    },
  },

  data(): {
    browser: any,
    visDimensions: any,
    visMargins: any,
    svg: any,
    model: Model|undefined,
    view: View|undefined,
    controller: Controller|undefined,
    } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visDimensions: { width: 0, height: 0 },
      visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25,
      },
      svg: undefined,
      model: undefined,
      view: undefined,
      controller: undefined,
    };
  },

  computed: {
    properties(this: any) {
      const { graphStructure } = this;
      return {
        graphStructure,
      };
    },
  },

  watch: {
    properties() {
      //   this.updateVis();
    },
  },

  async mounted(this: any) {
    this.browser.width = parseInt(
      d3
        .select('body')
        .style('width')
        .replace('px', ''),
      0,
    );

    this.browser.height = parseInt(
      d3
        .select('body')
        .style('height')
        .replace('px', ''),
      0,
    );

    // Set dimensions of the node link
    this.visDimensions.width = this.browser.width * 0.75;
    this.visDimensions.height = this.browser.height - 24;

    // Size the svg
    this.svg = d3
      .select(this.$refs.svg)
      .attr('width', this.visDimensions.width)
      .attr('height', this.visDimensions.height);

    // Define the MVC
    this.model = new Model(this.graphStructure);
    this.view = new View();
    this.controller = new Controller(
      this.view,
      this.model,
      this.visDimensions,
    );
  },

  methods: {},
});
</script>

<template>
  <svg ref="svg" width="800" height="900" />
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

div.tooltip {
  position: absolute;
  text-align: center;
  font-size: 12.5px;
  color: black;
  width: 100px;
  border-radius: 5px;
  padding: 2px;
  background: white;
  border: 0px;
  pointer-events: none;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  transition: 0.3s;
}

svg >>> .hovered {
  fill: #fde8ca;
  fill-opacity: 1 !important;
}

svg >>> .clickedCell {
  stroke-width: 2.5;
  stroke: #ee0000;
}

svg >>> .clicked {
  font-weight: 800;
  fill: #f8cf91 !important;
  fill-opacity: 1 !important;
}

svg >>> .clickedCell {
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
