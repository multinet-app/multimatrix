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
    attributeVariables: {
      type: Array,
      default: [],
    },
    variableList: {
      type: Array,
      default: [],
    },
  },

  data(): {
    browser: any,
    visDimensions: any,
    visMargins: any,
    matrix: any,
    attributes: any,
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
      matrix: undefined,
      attributes: undefined,
      model: undefined,
      view: undefined,
      controller: undefined,
    };
  },

  computed: {
    properties(this: any) {
      const {
        graphStructure,
        variableList,
        attributeVariables,
      } = this;
      return {
        graphStructure,
        variableList,
        attributeVariables,
      };
    },
  },

  watch: {
    properties() {
      this.updateVis();
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

    // Size the svgs
    this.matrix = d3
      .select(this.$refs.matrix)
      .attr('width', this.visDimensions.width * 0.75 - 30)
      .attr('height', this.visDimensions.height)
      .attr('viewBox', `0 0 ${this.visDimensions.width * 0.75 - 30} ${this.visDimensions.height}`);

    this.attributes = d3
      .select(this.$refs.attributes)
      .attr('width', this.visDimensions.width * 0.25 - 30)
      .attr('height', this.visDimensions.height)
      .attr('viewBox', `0 0 ${this.visDimensions.width * 0.25 - 30} ${this.visDimensions.height}`);

    // Define the MVC
    this.model = new Model(this.graphStructure);
    this.view = new View();
    this.view.variableList = this.variableList as string[];
    this.view.attributeVariables = this.attributeVariables as string[];

    this.controller = new Controller(
      this.view,
      this.model,
      this.visDimensions,
    );
  },

  methods: {
    updateVis() {
      if (this.view) {
        this.view.variableList = this.variableList as string[];
        this.view.attributeVariables = this.attributeVariables as string[];

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
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family: "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue",
    Helvetica, Arial, "Lucida Grande", sans-serif;
  font-weight: 300;
}

.baseCell {
  fill-opacity: 0;
}

.hoveredCell {
  stroke-width: 1px;
  stroke: darkgray;
}

.neighbor rect {
  fill: #caffc7;
  fill-opacity: 1;
}

.neighbor {
  fill: #caffc7;
  fill-opacity: 1;
}

.colLabel {
  cursor: pointer;
  fill: black !important;
}

.rowLabel {
  cursor: pointer;
  fill: black !important;
}

.highlightedCell {
  fill: #fff4d3;
  fill-opacity: 1 !important;
}

.highlightCol {
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

.hovered {
  fill: #fde8ca;
  fill-opacity: 1 !important;
}

.clickedCell {
  stroke-width: 2.5;
  stroke: #ee0000;
}

.clicked {
  font-weight: 800;
  fill: #f8cf91 !important;
  fill-opacity: 1 !important;
}

.clickedCell {
  stroke: red;
  stroke-width: 3;
}

text.hovered {
  font-weight: 450;
}

text.clicked {
  font-weight: 650;
  fill: black !important;
}

line {
  pointer-events: none;
  stroke: #aaa;
  opacity: 0.3;
}
</style>
