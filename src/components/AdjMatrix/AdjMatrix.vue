<script lang='ts'>
import * as d3 from "d3";

import { Model } from './model';
import { View } from './view';
import { Controller } from './controller';

export default {
  props: {
    app: {
      type: Object,
      required: true
    },
    provenance: {
      type: Object,
      required: true
    },
    graphStructure: {
      type: Object,
      default: () => {}
    },
    selectNeighbors: {
      type: Boolean,
      default: true
    },
  },

  data() {
    return {
      browser: {
        height: 0,
        width: 0
      },
      panelDimensions: { width: 0, height: 0 },
      visDimensions: { width: 0, height: 0 },
      visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25
      },
      svg: undefined,
      model: Model,
      view: View,
      controller: Controller,
    };
  },

  computed: {
    properties(): {} {
      const {
        graphStructure,
      } = this;
      return {
        graphStructure,
      };
    },
  },

  watch: {
    properties() {
    //   this.updateVis();
    }
  },

  async mounted() {
    // Size the panel
    this.browser.width = parseInt(d3
    .select("body")
    .style("width")
    .replace("px", ""));

    this.browser.height = parseInt(d3
      .select("body")
      .style("height")
      .replace("px", ""));

    // Set dimensions of the node link
    this.visDimensions.width = this.browser.width * 0.75;
    this.visDimensions.height = this.browser.height * 1;

    // Set dimensions of panel
    this.panelDimensions.width = this.browser.width * 0.25;
    this.panelDimensions.height = this.browser.height * 1;

    // Size the svg
    this.svg = d3
    .select(this.$refs.svg)
    .attr("width", this.visDimensions.width)
    .attr("height", this.visDimensions.height);

    // Define the MVC
    this.model = new Model(this.graphStructure)
    this.view = new View()
    this.controller = new Controller(this.view, this.model, this.visDimensions, this.panelDimensions);

    this.controller.loadData(this.model.nodes, this.model.links, this.model.matrix);
  },

  methods: {
  },
};
</script>

<template>
  <div>
    <svg ref="svg" width="800" height="900"/>
  </div>
</template>

<style>
  * {
      box-sizing: border-box;
  }

  body {
      font-family: "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
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
      fill: #CAFFC7;
      fill-opacity: 1;
  }

  .neighbor {
      fill: #CAFFC7;
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
      fill: #FFF4D3;
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
      fill: #F8CF91 !important;
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
