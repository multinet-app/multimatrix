<script lang="ts">
import Vue from 'vue';
import MultiMatrix from '@/components/MultiMatrix/MultiMatrix.vue';
import { select, selectAll } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import store from '@/store';
import Alert from '@/components/Alert.vue';

// This is to be removed (stop-gap solution to superGraph network update)
export const eventBus = new Vue();

export default Vue.extend({
  components: {
    Alert,
    MultiMatrix,
  },

  data(): {
    selectNeighbors: boolean;
    showGridLines: boolean;
    enableGraffinity: boolean;
    showAggrLegend: boolean;
    showChildLegend: boolean;
    directional: boolean;
    visualizedAttributes: string[];
    } {
    return {
      selectNeighbors: true,
      showGridLines: true,
      enableGraffinity: false,
      showAggrLegend: false,
      showChildLegend: false,
      directional: false,
      visualizedAttributes: [],
    };
  },

  computed: {
    attributeList(): string[] {
      if (this.network !== null && typeof this.network.nodes[0] !== 'undefined') {
        return Object.keys(this.network.nodes[0]);
      }
      return [];
    },

    network() {
      return store.getters.network;
    },

    loadError() {
      return store.getters.loadError;
    },
  },

  watch: {
    showGridLines() {
      if (this.showGridLines) {
        selectAll('.gridLines').attr('opacity', 1);
      } else {
        selectAll('.gridLines').attr('opacity', 0);
      }
    },
  },

  methods: {
    exportNetwork() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(this.network)], {
          type: 'text/json',
        }),
      );
      a.download = `${store.getters.networkName}.json`;
      a.click();
    },
    createLegend(colorScale: ScaleLinear<string, number>, legendName: string) {
      let legendSVG;
      if (legendName === 'aggregate') {
        legendSVG = select('#aggr-matrix-legend');
      } else if (legendName === 'child') {
        legendSVG = select('#child-matrix-legend');
      } else {
        legendSVG = select('#matrix-legend');
      }
      legendSVG
        .append('g')
        .classed('legendLinear', true)
        .attr('transform', 'translate(10, 60)');

      // construct the legend and format the labels to have 0 decimal places
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legendLinear = (legendColor() as any)
        .shapeWidth(20)
        .cells(colorScale.domain()[1] >= 5 ? 5 : colorScale.domain()[1] + 1)
        .orient('horizontal')
        .scale(colorScale)
        .labelFormat(format('.0f'));

      legendSVG.select('.legendLinear').call(legendLinear);
    },

    updateMatrixLegends(showAggrLegend: boolean, showChildLegend: boolean) {
      this.showAggrLegend = showAggrLegend;
      this.showChildLegend = showChildLegend;
    },
  },
});
</script>

<template>
  <div>
    <v-navigation-drawer
      app
      class="app-sidebar"
      fixed
      permanent
      stateless
      value="true"
    >
      <v-toolbar color="grey lighten-2">
        <v-toolbar-title class="d-flex align-center">
          <div>
            <v-row class="mx-0 align-center">
              <v-col class="pb-0 pt-2 px-0">
                <img
                  class="app-logo"
                  src="../assets/logo/app_logo.svg"
                  alt="Multinet"
                  width="100%"
                >
              </v-col>
              <v-col class="text-left">
                MultiMatrix
              </v-col>
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <!-- login-menu / -->
      </v-toolbar>

      <v-list class="pa-0">
        <v-subheader class="grey darken-3 py-0 white--text">
          Controls
        </v-subheader>

        <div class="pa-4">
          <v-list-item class="px-0">
            <v-select
              v-model="visualizedAttributes"
              :items="attributeList"
              label="Node Attributes"
              multiple
              outlined
              chips
              dense
              deletable-chips
              small-chips
              hint="Choose the node attributes to visualize"
              persistent-hint
            />
          </v-list-item>

          <!-- Auto-Select Neighbors List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="selectNeighbors"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
          </v-list-item>

          <!-- Gridline Toggle List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="showGridLines"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Show GridLines </v-list-item-content>
          </v-list-item>

          <!-- Directional Edges Toggle Card -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="directional"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Directional Edges </v-list-item-content>
          </v-list-item>

          <!-- Graffinity Toggle List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="enableGraffinity"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content>
              Enable Graffinity Features
            </v-list-item-content>
          </v-list-item>

          <v-list-item class="px-0">
            <v-btn
              block
              class="ml-0 mt-4"
              color="primary"
              depressed
              @click="exportNetwork"
            >
              Export Network
            </v-btn>
          </v-list-item>
        </div>

        <v-subheader class="grey darken-3 mt-6 py-0 white--text">
          Color Scale Legend
        </v-subheader>

        <div class="pa-4">
          <!-- Matrix Legend -->
          <v-list-item
            v-if="!showAggrLegend"
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            Matrix Legend
            <svg id="matrix-legend" />
          </v-list-item>

          <!-- Aggregated Matrix Legend -->
          <v-list-item
            v-if="showAggrLegend"
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            Aggregate Legend
            <svg id="aggr-matrix-legend" />
          </v-list-item>

          <!-- Child Matrix Legend -->
          <v-list-item
            v-if="showChildLegend"
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            Children Legend
            <svg id="child-matrix-legend" />
          </v-list-item>
        </div>
      </v-list>
    </v-navigation-drawer>

    <!-- MultiMatrix component -->
    <v-col>
      <v-row class="ma-0">
        <multi-matrix
          v-if="network !== null"
          ref="multimatrix"
          v-bind="{
            network,
            selectNeighbors,
            showGridLines,
            enableGraffinity,
            showAggrLegend,
            showChildLegend,
            visualizedAttributes,
            directional,
          }"
          @restart-simulation="hello()"
          @updateMatrixLegendScale="createLegend"
          @updateAggrMatrixLegendScale="createLegend"
          @updateChildMatrixLegendScale="createLegend"
          @updateMatrixLegends="updateMatrixLegends"
        />

        <alert v-if="loadError.message !== ''" />
      </v-row>
    </v-col>
  </div>
</template>

<style scoped>
.app-logo {
  width: 36px;
}
</style>
