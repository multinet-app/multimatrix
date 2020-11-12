<script lang="ts">
import Vue from 'vue';
import AdjMatrix from '@/components/AdjMatrix/AdjMatrix.vue';
import { select, selectAll } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import { getUrlVars } from '@/lib/utils';
import { loadData } from '@/lib/multinet';
import { Network } from '@/types';

export default Vue.extend({
  components: {
    AdjMatrix,
  },

  data(): {
    network: Network;
    workspace: string;
    networkName: string;
    selectNeighbors: boolean;
    showGridLines: boolean;
    visualizedAttributes: string[];
    nodeEditor: boolean;
    // connectivity is left with type any since it is a temp object in our AQL example
    connectivity: any;
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
      visualizedAttributes: [],
      nodeEditor: false,
      connectivity: {
        node1: {
          type: '',
          value: '',
        },
        hop: {
          type: '',
          operator: '',
          value: '',
        },
        node2: {
          type: '',
          value: '',
        },
      },
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
        `Workspace and network must be set! workspace=${workspace} network=${networkName}`,
      );
    }

    this.network = await loadData(workspace, networkName, host);
    this.workspace = workspace;
    this.networkName = networkName;
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
        .attr('transform', 'translate(-10, 100)');

      // construct the legend and format the labels to have 0 decimal places
      const legendLinear = (legendColor() as any)
        .shapeWidth(40)
        .orient('horizontal')
        .scale(colorScale)
        .labelFormat(format('.0f'));

      legendSVG.select('.legendLinear').call(legendLinear);
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
  <v-container fluid class="pt-0 pb-0">
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col cols="3">
        <v-card>
          <v-card-title class="pb-6"
            >MultiNet Adjacency Matrix Controls</v-card-title
          >
          <v-card-text>
            <v-select
              v-model="visualizedAttributes"
              :items="attributeList"
              label="Node Attributes"
              multiple
              chips
              deletable-chips
              hint="Choose the node attributes you'd like to visualize"
              persistent-hint
            />

            <!-- Auto-Select Neighbors Card -->
            <v-card-subtitle
              class="pb-0 px-0"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
              "
            >
              Autoselect neighbors
              <v-checkbox class="ma-0" v-model="selectNeighbors" hide-details />
            </v-card-subtitle>

            <!-- Gridline Toggle Card -->
            <v-card-subtitle
              class="pb-0 px-0"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
              "
            >
              Show GridLines
              <v-checkbox class="ma-0" v-model="showGridLines" hide-details />
            </v-card-subtitle>

            <!-- Matrix Legend -->
            <v-card-subtitle
              class="pb-0 px-0"
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
              "
            >
              Matrix Legend
              <svg id="matrix-legend"></svg>
            </v-card-subtitle>
          </v-card-text>

          <v-card-actions>
            <v-btn small @click="aggregateCaliforniaNodes"
              >Aggregate California</v-btn
            >
          </v-card-actions>

          <v-card-actions>
            <v-btn small @click="exportNetwork">Export Network</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- AdjMatrix component -->
      <v-col class="ma-0 pl-0 pr-0">
        <v-row row wrap class="ma-0 pa-0">
          <adj-matrix
            ref="adjmatrix"
            v-if="workspace"
            v-bind="{
              network,
              selectNeighbors,
              showGridLines,
              visualizedAttributes,
            }"
            @restart-simulation="hello()"
            @updateMatrixLegendScale="createLegend"
          />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.app-logo {
  width: 48px;
}

.row-number {
  align-items: center;
  border-radius: 100px;
  display: flex;
  font-size: 12px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.workspaces {
  /* 171px = height of app-bar + workspace button + list subheader */
  height: calc(100vh - 171px);
  overflow-y: scroll;
}

.workspace-icon {
  opacity: 0.4;
}

sm {
  font-size: 10px;
  font-weight: 300;
  font-style: italic;
}

.v-card {
  max-height: calc(100vh - 24px);
}

.manage-panels {
  max-height: 450px;
  overflow-y: auto;
}

.manage-panels .v-expansion-panel:nth-child(odd) {
  background: #f7f7f7;
}

.panel-icons {
  width: 24px !important;
}

.multinet-title {
  line-height: 0.7em;
  padding-top: 16px;
}
</style>

<style>
.app-sidebar .v-navigation-drawer__content {
  overflow: hidden;
}
.add-hops {
  border-right: 1px solid #ccc !important;
}
</style>
