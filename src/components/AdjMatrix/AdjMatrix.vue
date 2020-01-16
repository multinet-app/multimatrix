<script>
import * as d3 from "d3";

// import * as modelMethods from './model';
// import * as viewMethods from './view';
// import * as controllerMethods from './controller';
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
    };
  },

  computed: {
    properties() {
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
    this.browser.width = d3
    .select("body")
    .style("width")
    .replace("px", "");

    this.browser.height = d3
      .select("body")
      .style("height")
      .replace("px", "");

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

<style scoped>
@import './adj-matrix.css';
</style>
