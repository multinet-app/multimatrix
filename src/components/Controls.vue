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
// import { View } from './AdjMatrix/AdjMatrixMethods';

const loginTokenRegex = /#loginToken=(\S+)/;

// This function takes a list of nodes and identifies a supernode
// and returns a new super node and a list of edges associated with the supernode

function superGraph(nodes: any[], edges: any[]) {
  // build a new list of nodes for a new network
  const newNodes: any[] = [];
  nodes.forEach((node: any) => {
    const newNode: any = {};
    newNode['ORIGIN'] = node['ORIGIN'];
    newNode['ORIGIN_CITY'] = node['ORIGIN_CITY'];
    newNode['ORIGIN_STATE'] = node['ORIGIN_STATE'];
    newNode['_key'] = node['_key'];
    newNode['_id'] = node['id'];
    newNode['parent'] = undefined;
    console.log(newNode);
    newNodes.push(newNode);
  });

  // Construct a supernode using the node interface and add some more fields
  const californiaSuperNode: any = {};
  californiaSuperNode['_key'] = 'CA';
  californiaSuperNode['ORIGIN_STATE'] = 'California';
  californiaSuperNode['ORIGIN'] = 'California';
  californiaSuperNode['_id'] = 'supernodes/CA';
  californiaSuperNode['children'] = [];

  // add the super node
  newNodes.push(californiaSuperNode);

  // add an index
  for (let index = 0; index < newNodes.length; index++) {
    newNodes[index]['index'] = index;
  }

  const superIndex = newNodes.findIndex(
    (node: any) => node['_id'] === 'supernodes/CA',
  );
  console.log('The value of the index is: ', superIndex);

  newNodes.forEach((node) => {
    if (
      node['_id'] !== 'supernodes/CA' &&
      node['ORIGIN_STATE'] === 'California'
    ) {
      node['parent'] = superIndex;
      newNodes[superIndex]['children'].push(node['index']);
    }
  });

  console.log('THE NEW NODE LIST');
  console.log(newNodes);

  // // print the list of new nodes
  // console.log('the new nodes');
  // console.log(newNodes);
  // print the nodes
  // console.log('the original nodes');
  // console.log(nodes);
  // // print the edges
  console.log('the original edges');
  console.log(edges);


  // // update all the edge source and destinations
  // edges.forEach((edge) => {
  //   if (edge['source'] === 'nodes/SFO' || edge['source'] === 'nodes/OAK') {
  //     edge['source'] = 'nodes/CA';
  //   }
  //   if (edge['target'] === 'nodes/SFO' || edge['target'] === 'nodes/OAK') {
  //     edge['target'] = 'nodes/CA';
  //   }
  // });
  // console.log('new edges');
  // console.log(edges);

  // const newNodes = otherNodes.concat(californiaNodes);
  // const newEdges = edges;

  // return { nodes: newNodes, links: newEdges };
}

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
    const loginToken = this.checkUrlForLogin();

    this.network = await loadData(workspace, networkName, host, loginToken);
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
    checkUrlForLogin(this: any): string | null {
      const result = loginTokenRegex.exec(window.location.href);

      if (result !== null) {
        const { index, 1: token } = result;

        const newPath = window.location.href.slice(0, index);
        window.history.replaceState({}, window.document.title, newPath);
        return token;
      }

      return null;
    },
    clickButton(this: any) {
      // console.log('clicked the aggregate button');
      // function that takes the nodes and links and modifies them to create a super node network
      superGraph(this.network.nodes, this.network.links);
      // console.log('the result of the supergraph function');
      // console.log(superResult);
      // console.log('clicked the aggregate button');
      // this.network = superResult;

      // remove visualization and rebuild it
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

          <!--button for aggregating by california -->
          <v-card-actions>
            <v-btn small @click="clickButton">Aggregate California</v-btn>
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
.v-card {
  max-height: calc(100vh - 24px);
}
</style>
