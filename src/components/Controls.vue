<script lang="ts">
import Vue from 'vue';

import TreeList from '@/components/TreeList.vue';
import QueryBuilder from '@/components/QueryBuilder.vue';
import MultiMatrix from '@/components/MultiMatrix/MultiMatrix.vue';
import { select, selectAll } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import { getUrlVars } from '@/lib/utils';
import { loadData, filterData } from '@/lib/multinet';
import { Network } from '@/types';

// This is to be removed (stop-gap solution to superGraph network update)
export const eventBus = new Vue();

export default Vue.extend({
  components: {
    TreeList,
    QueryBuilder,
    MultiMatrix,
  },

  data(): {
    network: Network;
    workspace: string;
    networkName: string;
    selectNeighbors: boolean;
    showGridLines: boolean;
    enableGraffinity: boolean;
    directional: boolean;
    visualizedAttributes: string[];
    treeListHover: string;
    currentSchema: any;
    treeRelationships: any[];
    schemaNetwork: Network;
    colorsDict: any;
    aqlPaths: any[];
  } {
    return {
      network: {
        nodes: [],
        links: [],
      },
      workspace: '',
      networkName: '',
      selectNeighbors: true,
      showGridLines: true,
      enableGraffinity: false,
      directional: false,
      visualizedAttributes: [],
      treeListHover: '',
      currentSchema: undefined,
      treeRelationships: [],
      schemaNetwork: {
        nodes: [],
        links: [],
      },
      colorsDict: {},
      aqlPaths: [],
    };
  },

  computed: {
    attributeList(this: any) {
      if (typeof this.network.nodes[0] !== 'undefined') {
        return Object.keys(this.network.nodes[0]);
      } else {
        return [];
      }
    },
  },

  async mounted() {
    const { workspace, networkName, host } = getUrlVars();
    if (!workspace || !networkName) {
      throw new Error(
        `Workspace and network must be set! workspace=${workspace} graph=${networkName}`,
      );
    }

    this.network = await loadData(workspace, networkName, host);
    this.workspace = workspace;
    this.networkName = networkName;

    // Catch network update events here to propagate new data into the app.
    eventBus.$on('updateNetwork', (network: Network) => {
      this.network = network;
    });
  },

  methods: {
    exportNetwork() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(this.network)], {
          type: `text/json`,
        }),
      );
      a.download = `${this.networkName}.json`;
      a.click();
    },
    createLegend(colorScale: ScaleLinear<string, number>) {
      const legendSVG = select('#matrix-legend');

      legendSVG
        .append('g')
        .classed('legendLinear', true)
        .attr('transform', 'translate(10, 60)');

      // construct the legend and format the labels to have 0 decimal places
      const legendLinear = (legendColor() as any)
        .shapeWidth(30)
        .orient('horizontal')
        .scale(colorScale)
        .labelFormat(format('.0f'));

      legendSVG.select('.legendLinear').call(legendLinear);
    },
    changeSchema(this: any, schema: any[]) {
      return (this.currentSchema = schema);
    },
    hoverNodes(this: any, hoveredNode: string) {
      return (this.treeListHover = hoveredNode);
    },
    relationships(this: any, allSchema: any[]) {
      return (this.treeRelationships = allSchema);
    },
    updateSchemaNetwork(this: any, newNetwork: Network) {
      return (this.schemaNetwork = newNetwork);
    },
    schemaColors(this: any, colors: any) {
      return (this.colorsDict = colors);
    },
    async aqlQueryParameters(
      this: any,
      start: string,
      end: string,
      hops: number,
    ) {
      // TODO add edges toggling
      // TODO how to get node table name...
      const query = `FOR n IN marclab_nodes
        FILTER UPPER(n.Label) =~ '${start}'
        FOR v, e, p IN 1..${hops} ANY n._id GRAPH '${this.networkName}'
          FILTER UPPER(v.Label) =~ '${end}'
        RETURN p`;

      this.aqlPaths = await filterData(this.workspace, query);
    },
  },
  watch: {
    showGridLines: function () {
      if (this.showGridLines) {
        selectAll('.gridLines').attr('opacity', 1);
      } else {
        selectAll('.gridLines').attr('opacity', 0);
      }
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
                />
              </v-col>
              <v-col class="text-left">MultiMatrix</v-col>
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
              <v-switch class="ma-0" v-model="selectNeighbors" hide-details />
            </v-list-item-action>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
          </v-list-item>

          <!-- Gridline Toggle List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch class="ma-0" v-model="showGridLines" hide-details />
            </v-list-item-action>
            <v-list-item-content> Show GridLines </v-list-item-content>
          </v-list-item>

          <!-- Directional Edges Toggle Card -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch class="ma-0" v-model="directional" hide-details />
            </v-list-item-action>
            <v-list-item-content> Directional Edges </v-list-item-content>
          </v-list-item>

          <!-- Graffinity Toggle List Item -->
          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch class="ma-0" v-model="enableGraffinity" hide-details />
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
            class="pb-0 px-0"
            style="display: flex; max-height: 50px"
          >
            Matrix Legend
            <svg id="matrix-legend"></svg>
          </v-list-item>
        </div>
      </v-list>
    </v-navigation-drawer>

    <!-- TreeList component -->
    <v-row>
      <v-col class="ma-0 pl-0 pr-0">
        <v-row row wrap class="ma-0 pa-0">
          <tree-list
            ref="treelist"
            v-if="workspace"
            v-bind="{ schemaNetwork }"
            @restart-simulation="hello()"
            @changeSchema="changeSchema"
            @hoverSchema="hoverNodes"
            @relationships="relationships"
            @schemaColors="schemaColors"
          />
        </v-row>
      </v-col>

      <!-- QueryBuilder component -->
      <v-col class="ma-0 pl-0 pr-0">
        <v-row row wrap class="ma-0 pa-0">
          <query-builder
            ref="querybuilder"
            v-if="workspace"
            v-bind="{
              network,
              treeListHover,
              currentSchema,
              treeRelationships,
              colorsDict,
              aqlPaths,
            }"
            @restart-simulation="hello()"
            @updateSchemaNetwork="updateSchemaNetwork"
            @aqlQueryParameters="aqlQueryParameters"
          />
        </v-row>
      </v-col>

      <!-- MultiMatrix component -->
      <v-col class="ma-0 pl-0 pr-0">
        <v-row row wrap class="ma-0 pa-0">
          <multi-matrix
            ref="multimatrix"
            v-if="workspace"
            v-bind="{
              schemaNetwork,
              network,
              selectNeighbors,
              showGridLines,
              enableGraffinity,
              visualizedAttributes,
              directional,
            }"
            @restart-simulation="hello()"
            @updateMatrixLegendScale="createLegend"
          />
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.app-logo {
  width: 36px;
}
</style>
