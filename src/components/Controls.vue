<script lang="ts">
import Vue from 'vue';
import AdjMatrix from '@/components/AdjMatrix/AdjMatrix.vue';
import { select, selectAll } from 'd3-selection';
import { format } from 'd3-format';
import { legendColor } from 'd3-svg-legend';
import { ScaleLinear } from 'd3-scale';
import { getUrlVars } from '@/lib/utils';
import { loadData, defineSuperNeighbors } from '@/lib/multinet';
import { Network } from '@/types';
// import { View } from './AdjMatrix/AdjMatrixMethods';

const loginTokenRegex = /#loginToken=(\S+)/;

// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
function superGraph(nodes: any[], edges: any[]) {
  // print the original nodes and edges
  // console.log('THE ORIGINAL NODES');
  // console.log(nodes);
  // console.log('THE ORIGINAL EDGES');
  // console.log(edges);

  // de-construct nodes into their original components and
  // make a new list of nodes
  const newNodes: any[] = [];
  nodes.forEach((node, index) => {
    const newNode = {
      ...node,
      // add new attributes for the new nodes
      // index - attribute for keeping track of the index for visualizing the network
      index: index,
    };

    // remove the properties that will not be used
    // and properties that will be recalculated for visualization
    delete newNode._rev;
    delete newNode.index;
    delete newNode.neighbors;

    // add new node to node list
    newNodes.push(newNode);

    // print the new node and its attribute
    // console.log("NEW NODE");
    // console.log(newNode)
  });
  // create a new supernode and a new super node list
  const superNodes: any[] = [
    {
      ORIGIN: [],
      ORIGIN_STATE: 'California',
      _key: 'CA',
      id: 'supernodes/CA',
    },
  ];

  // update the index attribute of a superNode
  superNodes.forEach((superNode, index) => {
    superNode.index = index;
  });

  // print information about the super node list
  // console.log("THE SUPER NODE LIST");
  // console.log(superNodes);

  // update the parent field of the node if it has a super node with the super node id
  // update the super node origin list with the child node id
  newNodes.forEach((node) => {
    if (node.ORIGIN_STATE === 'California') {
      const superNode = superNodes.find(
        (superNode) => superNode.ORIGIN_STATE === 'California',
      );
      node.parent = superNode.id;
      superNode.ORIGIN.push(node.id);
    }
  });

  // de-construct edges into their original components and
  // make a new list of edges for the supergraph network
  const newLinks: any = [];
  edges.forEach((link, index) => {
    const newLink = {
      ...link,
    };

    // remove attributes that will be re-calculated for the links
    // and attributes that are not used for aggregation/visualization
    delete newLink._rev;

    // add new attributes for the new links
    // id - attribute for visualization and determining the neighbors for the network
    newLink.index = `edges/${index}`;

    newLinks.push(newLink);

    // print information about the new link
    // console.log("NEW LINK");
    // console.log(newLink);
  });

  // // print information about the new links
  // console.log('NEW LINKS');
  // console.log(newLinks);

  // update the _from, _to values and in attribute values for target and source
  // which are needed for using d3 to visualize the network
  newLinks.forEach((link: any) => {
    const linkFrom = link._from;
    const linkTo = link._to;
    superNodes.forEach((superNode) => {
      // check if the _from and _to are in the origin list
      superNode.ORIGIN.forEach((origin: any) => {
        if (linkFrom === origin) {
          const newLinkFrom = superNode.id;
          link._from = newLinkFrom;
          link.source = link._from;
        }
        if (linkTo === origin) {
          const newLinkTo = superNode.id;
          link._to = newLinkTo;
          link.target = link._to;
        }
      });
    });
  });

  // print information about the new links and new nodes
  // console.log('NEW NODES');
  // console.log(newNodes);
  // console.log('NEW LINKS');
  // console.log(newLinks);

  // combine the superNodes with the new nodes before updating all the neighbors
  const combinedNodes = superNodes.concat(newNodes);

  // print information about combined nodes
  // console.log("THE COMBINED NODES");
  // console.log(combinedNodes);

  // construct the neighbors for the nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // print information about the neighbor nodes
  // console.log('THE NEIGHBOR NODES');
  // console.log(neighborNodes);

  // remove all the nodes who do not have any neighbors
  const finalNodes = neighborNodes.filter((node) => node.neighbors.length != 0);

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };

  return network;
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
      // print that the button was clicked
      // console.log('clicked the aggregate button');

      // call the super graph function and print stuff
      // const superNetwork = superGraph(this.network.nodes, this.network.links);
      // // console.log(superNetwork);

      // call the supergraph function to generate the new nodes and the new edges for the super graph
      // assign to a variable that can update the network which updates the visualization
      const superNetwork = superGraph(this.network.nodes, this.network.links);
      this.network = superNetwork;
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
