<script lang="ts">
import * as d3 from 'd3';
import Vue, { PropType } from 'vue';

import { Query } from '@/components/VisQuery/VisQueryMethods';
import { Dimensions, Network } from '@/types';

export default Vue.extend({
  props: {
    network: {
      type: Object as PropType<Network>,
      required: true,
    },
  },

  data(): {
    browser: Dimensions;
    visMargins: any;
    query: Query | undefined;
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      query: undefined,
    };
  },

  computed: {
    properties(this: any) {
      const { network } = this;
      return {
        network,
      };
    },
  },
  watch: {
    properties(this: any) {
      this.newQuery();
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
    this.query = d3
      .select(this.$refs.visquery)
      .attr('width', 800)
      .attr('height', 900)
      .attr('viewBox', `0 0 ${800} ${900}`);

    // Define the Query
    this.query = new Query(this.network, this.visMargins);
  },

  methods: {
    newQuery(this: any) {
      if (this.query) {
        this.query.updateQuery();
      }
    },
  },
});
</script>

<template>
  <div>
    <svg id="visquery" ref="visquery" width="800" height="900" />
    <!-- <svg id="attributes" ref="attributes" width="300" height="900" />
    <div id="tooltip" ref="tooltip" /> -->
  </div>
</template>

<style scoped>
#queryTooltip {
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

svg >>> text.hovered {
  font-weight: 450;
}

svg >>> text.clicked {
  font-weight: 650;
  fill: black !important;
}

/* NETWORK CLASS */
.link {
  fill: none;
  stroke: rgb(36, 33, 33);
  stroke-opacity: 0.5;
  stroke-width: 2px;
}

.networkNode:hover {
  cursor: grab;
}

.networkNode:active {
  cursor: grabbing;
}

/* TREELIST CLASS */
.treeText {
  font-family: sans-serif;
  font-size: 12px;
  cursor: pointer;
}

.selected text {
  font-weight: bold;
}

.selected circle {
  stroke: black;
  stroke-width: 2;
}

rect.selected {
  stroke: black;
  stroke-width: 1;
}

.treeCircle circle {
  stroke: #fff;
  stroke-width: 1px;
  fill: lightgrey;
}
</style>
