<script lang="ts">
/* eslint-disable prefer-const */
import * as d3 from 'd3';
import Vue, { PropType } from 'vue';
import { schemaGraph } from '@/lib/aggregation';

import { Dimensions, Network, Link, Node } from '@/types';

export default Vue.extend({
  props: {
    network: {
      type: Object as PropType<Network>,
      required: true,
    },
    treeListHover: {
      type: String,
      default: () => '',
    },
    currentSchema: {
      type: Array,
      default: () => [],
    },
    treeRelationships: {
      type: Array,
      default: () => [],
    },
    colorsDict: {},
    aqlPaths: {},
  },

  data(): {
    browser: Dimensions;
    visMargins: { left: number; top: number; right: number; bottom: number };
    updatedSchema: any;
    currentParent: string;
    schemaNetwork: Network;
    uniqueLinks: string[];
    unSelectedLinks: string[];
    selectedHops: number;
    neighborToggle: boolean;
    tableSearch: string;
    tableHeaders: any[];
    tableData: any[];
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      updatedSchema: {},
      currentParent: '',
      schemaNetwork: {
        nodes: [],
        links: [],
      },
      uniqueLinks: [],
      unSelectedLinks: [],
      selectedHops: 0,
      neighborToggle: false,
      tableSearch: '',
      tableHeaders: [],
      tableData: [],
      // queryFilter: {},
      // querySortDesc: false,
      // queryPage: 1,
      // queryItemsPerPage: 4,
      // querySortBy: '_id',
    };
  },

  computed: {
    properties(this: any) {
      const {
        treeListHover,
        currentSchema,
        network,
        treeRelationships,
        colorsDict,
        aqlPaths,
      } = this;
      return {
        treeListHover,
        currentSchema,
        network,
        treeRelationships,
        colorsDict,
        aqlPaths,
      };
    },
    colorScale(): any {
      const colorDomain = Object.keys(this.colorsDict).sort();
      return d3.scaleOrdinal().domain(colorDomain).range(d3.schemeCategory10);
    },
    indexLinks(): any {
      let indexLinks = {};
      for (let i = 0; i < this.schemaNetwork.nodes.length; i++) {
        indexLinks[i + ',' + i] = 1;
        this.schemaNetwork.links.forEach(function (d) {
          indexLinks[d.source.index + ',' + d.target.index] = 1;
        });
      }
      return indexLinks;
    },
    aqlNetwork(): any {
      let aqlNetwork: Network = { nodes: [], links: [] };

      // check for duplicates
      let nodeChecker: string[] = [];
      for (let path of this.aqlPaths) {
        for (let arr of path.vertices) {
          if (!nodeChecker.includes(arr['_key'])) {
            nodeChecker.push(arr['_key']);
          }
        }
      }

      // create network in correct format
      for (let path of this.aqlPaths) {
        for (let arr of path.vertices) {
          if (nodeChecker.includes(arr['_key'])) {
            arr.id = arr['_id'];
            aqlNetwork.nodes.push(arr);
            nodeChecker.splice(nodeChecker.indexOf(arr['_key']), 1);
          }
        }
        for (let arr of path.edges) {
          arr.source = arr['_from'];
          delete arr['_from'];
          arr.target = arr['_to'];
          delete arr['_to'];
          aqlNetwork.links.push(arr);
        }
      }

      return aqlNetwork;
    },
  },

  watch: {
    treeListHover() {
      this.hoverSchema();
    },
    currentSchema() {
      this.initializeSchema();
    },
    aqlPaths() {
      this.renderQueryNetwork();
      this.createTableHeaders();
      this.createTableData();
    },
  },

  async mounted(this: any) {
    this.width = d3.select(this.$refs.schemaView).attr('width');
    this.height = d3.select(this.$refs.schemaView).attr('height');

    this.svg = d3.select(this.$refs.schemaView);

    // Draw schema rect
    this.svg
      .append('rect')
      .attr('width', this.width)
      .attr('height', (this.height / 4) * 3)
      .attr('stroke', 'black')
      .attr('fill', 'none');

    // Draw query rect
    this.svg
      .append('rect')
      .attr('width', this.width)
      .attr('height', this.height / 4)
      .attr('stroke', 'black')
      .attr('transform', `translate(0, ${(this.height / 4) * 3})`)
      .attr('fill', 'none')
      .attr('id', 'queryBox');

    this.networkGroup = this.svg.append('g').attr('id', 'networkGroup');

    this.schemaDict = {};

    // Draw legend
    this.uniqueLinks = [
      ...new Set(this.network.links.map((l: Link) => l.Type)),
    ];
    const legendSVG = d3.select(this.$refs.schemaView).append('g');

    legendSVG
      .selectAll('rect')
      .data(this.uniqueLinks)
      .join('rect')
      .attr('class', (l: string) => l.replace(/\s/g, ''))
      .attr('width', 10)
      .attr('height', 10)
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('x', 10)
      .attr('y', (l: string, i: number) => 10 + i * 15);

    legendSVG
      .selectAll('text')
      .data(this.uniqueLinks)
      .join('text')
      .attr('class', (l: string) => l.replace(/\s/g, ''))
      .attr('height', 10)
      .attr('fill', '#000')
      .attr('x', 30)
      .attr('y', (l: string, i: number) => 20 + i * 15)
      .html((l: string) => l);

    legendSVG
      .append('g')
      .selectAll('rect')
      .data(this.uniqueLinks)
      .join('rect')
      .attr('style', 'cursor: pointer;')
      .attr('width', 200)
      .attr('height', 12)
      .attr('opacity', 0)
      .attr('x', 10)
      .attr('y', (d, i) => 10 + i * 15)
      .attr('active', 'no')
      .attr('class', 'legendRect');
  },

  methods: {
    initializeSchema(this: any) {
      // move this to another function that watches for treeRelationships
      const childColumn = Object.keys(this.treeRelationships[0])[0];
      const parentColumn = Object.keys(this.treeRelationships[0])[1];

      const children: string[] = this.treeRelationships.map((c) =>
        c[childColumn].toUpperCase(),
      );
      const parents: string[] = this.treeRelationships.map((p) =>
        p[parentColumn].toUpperCase(),
      );

      // Create dictionary: children as keys, parents as values
      const schemaDict: any = parents.reduce(function (
        schemaDict,
        field,
        index,
      ) {
        schemaDict[children[index]] = field;
        return schemaDict;
      },
      {});
      this.schemaDict = schemaDict;
      // Create list of all the current leaves
      const groups: string[] = [];

      this.currentSchema.forEach((n) => {
        if (n.children == null && n.id != undefined) {
          groups.push(n.id.toUpperCase());
        }
      });

      // Deep copy of network edges necessary to avoid mutations in object structure during simulation
      const edges = JSON.parse(JSON.stringify(this.network.links));

      const newNetwork = schemaGraph(
        this.network.nodes,
        edges,
        groups,
        schemaDict,
        'Label',
      );

      this.schemaNetwork = newNetwork;
      this.createSchema(this.schemaNetwork);
    },
    createSchema(this: any, schema: Network) {
      this.$emit('updateSchemaNetwork', schema);

      d3.select('#networkGroup').selectAll('*').remove();
      d3.select('#queryBox').attr('start', null);
      d3.select('#queryBox').attr('end', null);

      const linksData = schema.links;
      const nodesData = schema.nodes;

      const force = d3
        .forceSimulation(nodesData)
        .force('charge', d3.forceManyBody().strength(-150))
        .force(
          'link',
          d3.forceLink(linksData).id((d: any) => d.id),
        )
        .force(
          'center',
          d3
            .forceCenter()
            .x(this.width / 2)
            .y((this.height / 8) * 3),
        );

      const edges = this.networkGroup
        .append('g')
        .attr('class', 'link')
        .selectAll('line')
        .data(linksData)
        .join('line')
        .style('stroke', '#ccc')
        .style('stroke-width', 1);

      const nodes = this.networkGroup
        .selectAll('circle')
        .data(nodesData)
        .join('circle')
        .attr('r', 10)
        .attr('label', (d: any) => d.Label)
        .attr('id', (d: any) => d.Label.replace(/\s/g, ''))
        .style('fill', (d: any) => {
          const label = d.Label.replace(/\s/g, '');
          let colorKey = 'none';
          for (const key in this.colorsDict) {
            if (label === key) {
              colorKey = key;
            } else if (this.colorsDict[key].includes(label)) {
              colorKey = key;
            }
          }
          return this.colorScale(colorKey);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      nodes.on('mouseover', (this: any, node: Node) => {
        d3.select(`#${node.Label}`).classed('treehover', true);
      });

      // Simple tooltip
      nodes.append('title').text((d: any) => d.Label);

      force.on('tick', () => {
        edges
          .attr('x1', function (d: any) {
            return d.source.x;
          })
          .attr('y1', function (d: any) {
            return d.source.y;
          })
          .attr('x2', function (d: any) {
            return d.target.x;
          })
          .attr('y2', function (d: any) {
            return d.target.y;
          });

        nodes
          .attr('cx', function (d: any) {
            return (d.x = Math.max(10, Math.min(800 - 10, d.x)));
          })
          .attr('cy', function (d: any) {
            return (d.y = Math.max(10, Math.min((900 / 4) * 3 - 10, d.y)));
          });
      });

      // Check if neighbors
      function neighbors(a, b) {
        return this.indexLinks[a.index + ',' + b.index];
      }

      function neighborNodes() {
        console.log('DOUBLE CLICK');
        if (this.neighborToggle) {
          //Reduce the opacity of all but the neighbouring nodes
          let d = d3.select(this).node().__data__;
          nodes.style('opacity', function (o) {
            return neighbors(d, o) || neighbors(o, d) ? 1 : 0.1;
          });
          edges.style('opacity', function (o) {
            return d.index == o.source.index || d.index == o.target.index
              ? 1
              : 0.1;
          });
          //Reduce the op
          this.neighborToggle = true;
        } else {
          //Put them back to opacity=1
          nodes.style('opacity', 1);
          edges.style('opacity', 1);
          this.neighborToggle = false;
        }
      }

      // Drag functions
      function dragstarted() {
        d3.select(this).clone(true).classed('notclone', true); // look into this
        d3.select(this).raise().attr('stroke', 'black').classed('clone', true);
        force.stop();
      }

      function dragged(d: any) {
        d3.select(this)
          .attr('cx', (d.x = d3.event.x))
          .attr('cy', (d.y = d3.event.y));
      }

      function dragended() {
        const mouseCoordinates = d3.mouse(this);
        const networkHeight: number = d3.select('#schemaView').attr('height');
        const networkWidth: number = d3.select('#schemaView').attr('width');
        const nodeLabel = d3.select(this).attr('label');

        if (mouseCoordinates[1] > (networkHeight / 4) * 3) {
          if (mouseCoordinates[0] < networkWidth / 2) {
            d3.select(this)
              .attr('cx', networkWidth / 4)
              .attr('cy', (networkHeight / 8) * 7)
              .attr('r', 20);
            d3.select('#queryBox').attr('start', nodeLabel);
          } else if (
            mouseCoordinates[0] >= networkWidth / 2 &&
            mouseCoordinates[0] < networkWidth
          ) {
            d3.select(this)
              .attr('cx', (networkWidth / 4) * 3)
              .attr('cy', (networkHeight / 8) * 7)
              .attr('r', 20);
            d3.select('#queryBox').attr('end', nodeLabel);
          } else {
            d3.select(this).remove();
          }
        } else {
          d3.select(this).remove();
        }
      }

      nodes.call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

      nodes.on('dblclick', function (e) {
        console.log('DOUBLE CLICK', e, neighborNodes);
      }); //neighborNodes);

      d3.selectAll('.legendRect').on('click', (l: string) => {
        const click = d3.selectAll(`.${l.replace(/\s/g, '')}`).attr('click');

        if (click === null) {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', true)
            .attr('click', 'clicked');
          this.unSelectedLinks.push(l);
        } else {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', false)
            .attr('click', null);
          this.unSelectedLinks = this.unSelectedLinks.filter((sl: string) => {
            return sl != l;
          });
        }
        this.modifyLinks(this.unSelectedLinks, this.schemaNetwork);
      });
    },

    updateSchema(this: any) {
      d3.select('#networkGroup').selectAll('*').remove();
      this.initializeSchema();
    },

    // Hover schema nodes based on tree list hover
    hoverSchema() {
      const hoverClass =
        '#' + this.treeListHover.toString().toUpperCase().replace(/\s/g, '');
      d3.selectAll('.treehover').classed('treehover', false);

      d3.select(hoverClass).attr('class', 'treehover').raise();
    },

    // Modify edges based on legend
    modifyLinks(this: any, unSelectedLinksList: string[], network: Network) {
      const removedNodes = [];
      const newLinks = [];

      network.links.forEach((l: Link) => {
        if (!unSelectedLinksList.includes(l.Type)) {
          newLinks.push(l);
        } else {
          removedNodes.push(l.sourceID);
          removedNodes.push(l.targetID);
        }
      });

      const newNodes = network.nodes.map((n: Node) => {
        n.children.forEach((c: string) => {
          if (!removedNodes.includes(n.children)) {
            return c;
          }
        });
        if (n.children.length > 0) {
          return n;
        }
      });
      const newNetwork = {
        nodes: newNodes,
        links: newLinks,
      };

      this.createSchema(newNetwork);
    },

    // Generates AQL query
    queryGenerator(this: any) {
      const start = d3.select('#queryBox').attr('start');
      const end = d3.select('#queryBox').attr('end');
      if (start != null && end != null) {
        this.$emit('aqlQueryParameters', start, end, this.selectedHops);
      }
    },
    createTableHeaders(): any {
      let tableHeaders = [
        {
          text: 'Path',
          align: 'start',
          sortable: false,
          value: 'pathID',
        },
      ];

      for (let i = 0; i < this.selectedHops; i++) {
        tableHeaders.push({ text: `Node ${i + 1}`, value: `Node ${i + 1}` });
        tableHeaders.push({
          text: `Node ${i + 1} Label`,
          value: `Node ${i + 1} Label`,
        });
        tableHeaders.push({ text: `Edge ${i + 1}`, value: `Edge ${i + 1}` });
        tableHeaders.push({
          text: `Edge ${i + 1} Type`,
          value: `Edge ${i + 1} Type`,
        });
      }
      tableHeaders.push({
        text: `Node ${this.selectedHops + 1}`,
        value: `Node ${this.selectedHops + 1}`,
      });
      tableHeaders.push({
        text: `Node ${this.selectedHops + 1} Label`,
        value: `Node ${this.selectedHops + 1} Label`,
      });

      this.tableHeaders = tableHeaders;
    },
    createTableData() {
      const tableData = [];

      this.aqlPaths.forEach((path: any, j: number) => {
        let pathData = {};
        pathData.pathID = j + 1;

        for (let i = 0; i < this.selectedHops + 1; i++) {
          if (path.vertices[i]) {
            pathData[`Node ${i + 1}`] = path.vertices[i]._id;
            pathData[`Node ${i + 1} Label`] = path.vertices[i].Label;
          }
          if (path.edges[i]) {
            pathData[`Edge ${i + 1}`] = path.edges[i]._id;
            pathData[`Edge ${i + 1} Type`] = path.edges[i].Type;
          }
        }

        tableData.push(pathData);
      });

      this.tableData = tableData;
    },
    renderQueryNetwork(this: any) {
      const svg = d3.select(this.$refs.queryNetwork);

      d3.select('#queryNetworkGroup').selectAll('*').remove();

      const linksData = this.aqlNetwork.links;
      const nodesData = this.aqlNetwork.nodes;

      const force = d3
        .forceSimulation(nodesData)
        .force('charge', d3.forceManyBody().strength(-150))
        .force(
          'link',
          d3.forceLink(linksData).id((d: any) => d.id),
        )
        .force(
          'center',
          d3
            .forceCenter()
            .x(this.width / 2)
            .y((this.height / 8) * 3),
        );

      const queryNetworkGroup = svg.append('g').attr('id', 'queryNetworkGroup');

      const edges = queryNetworkGroup
        .append('g')
        .attr('class', 'link')
        .selectAll('line')
        .data(linksData)
        .join('line')
        .style('stroke', '#ccc')
        .style('stroke-width', 1);

      const nodes = queryNetworkGroup
        .selectAll('circle')
        .data(nodesData)
        .join('circle')
        .attr('r', 10)
        .attr('label', (d: any) => d.Label)
        .attr('id', (d: any) => d.Label.replace(/\s/g, ''))
        .style('fill', (d: any) => {
          const label = d.Label.replace(/\s/g, '');
          let colorKey = 'none';
          for (const key in this.colorsDict) {
            if (label === key) {
              colorKey = key;
            } else if (this.colorsDict[key].includes(label)) {
              colorKey = key;
            }
          }
          return this.colorScale(colorKey);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      nodes.on('mouseover', (this: any, node: Node) => {
        d3.select(`#${node.Label}`).classed('treehover', true);
      });

      // Simple tooltip
      nodes.append('title').text((d: any) => d.Label);

      force.on('tick', () => {
        edges
          .attr('x1', function (d: any) {
            return d.source.x;
          })
          .attr('y1', function (d: any) {
            return d.source.y;
          })
          .attr('x2', function (d: any) {
            return d.target.x;
          })
          .attr('y2', function (d: any) {
            return d.target.y;
          });

        nodes
          .attr('cx', function (d: any) {
            return (d.x = Math.max(10, Math.min(800 - 10, d.x)));
          })
          .attr('cy', function (d: any) {
            return (d.y = Math.max(10, Math.min((900 / 4) * 3 - 10, d.y)));
          });
      });

      // Check if neighbors
      function neighbors(a, b) {
        return this.indexLinks[a.index + ',' + b.index];
      }

      function neighborNodes() {
        console.log('DOUBLE CLICK');
        if (this.neighborToggle) {
          //Reduce the opacity of all but the neighbouring nodes
          let d = d3.select(this).node().__data__;
          nodes.style('opacity', function (o) {
            return neighbors(d, o) || neighbors(o, d) ? 1 : 0.1;
          });
          edges.style('opacity', function (o) {
            return d.index == o.source.index || d.index == o.target.index
              ? 1
              : 0.1;
          });
          //Reduce the opacity
          this.neighborToggle = true;
        } else {
          //Put them back to opacity=1
          nodes.style('opacity', 1);
          edges.style('opacity', 1);
          this.neighborToggle = false;
        }
      }

      nodes.on('dblclick', function (e) {
        console.log('DOUBLE CLICK', e, neighborNodes);
      }); //neighborNodes);

      d3.selectAll('.legendRect').on('click', (l: string) => {
        const click = d3.selectAll(`.${l.replace(/\s/g, '')}`).attr('click');

        if (click === null) {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', true)
            .attr('click', 'clicked');
          this.unSelectedLinks.push(l);
        } else {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', false)
            .attr('click', null);
          this.unSelectedLinks = this.unSelectedLinks.filter((sl: string) => {
            return sl != l;
          });
        }
        this.modifyLinks(this.unSelectedLinks, this.schemaNetwork);
      });
    },
  },
});
</script>

<template>
  <div>
    <svg id="schemaView" ref="schemaView" width="800" height="900" />
    <v-col>
      <v-row>
        <v-slider
          v-model="selectedHops"
          label="Hops"
          ticks="always"
          thumb-label
          :max="5"
          :min="1"
        ></v-slider>
        <v-btn color="primary" depressed @click="queryGenerator">
          Submit Query
        </v-btn>
      </v-row>
    </v-col>
    <v-tabs>
      <v-tab>Network</v-tab>
      <v-tab>Paths </v-tab>

      <v-tab-item>
        <svg id="queryNetwork" ref="queryNetwork" width="800" height="900" />
      </v-tab-item>
      <v-tab-item>
        <!-- <div id="queryResults" ref="queryResults" width="800" height="900" /> -->
        <v-card>
          <v-card-title>
            Paths
            <v-spacer></v-spacer>
            <v-text-field
              v-model="tableSearch"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-data-table
            :headers="tableHeaders"
            :items="tableData"
            :search="tableSearch"
          ></v-data-table>
        </v-card>
      </v-tab-item>
    </v-tabs>
  </div>
</template>

<style scoped>
svg >>> circle {
  cursor: pointer;
}

svg >>> circle.treehover {
  stroke: black;
  stroke-width: 2px;
}

svg >>> .legendSelected {
  fill: grey;
}

svg >>> table {
  width: 100%;
  border: 1px solid black;
  border-collapse: collapse;
}

svg >>> th {
  background: #333;
  color: white;
  font-weight: bold;
  cursor: s-resize;
}

svg >>> td,
th {
  padding: 6px;
  border: 1px solid rgb(72, 72, 72);
  text-align: left;
  color: black;
}
</style>