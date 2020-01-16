<script>
import * as d3 from "d3";

import * as modelMethods from './model';
import * as viewMethods from './view';
import * as controllerMethods from './controller';
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
    this.controller = new Controller();
    // this.loadVis();
    // this.provenance.addObserver("selected", state =>
    //   this.highlightSelectedNodes(state)
    // );

    // this.simulation = this.makeSimulation()
  },

  methods: {
    // define many functions externally
    ...modelMethods,
    ...viewMethods,
    ...controllerMethods,
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
