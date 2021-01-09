<script lang="ts">
/* eslint-disable prefer-const */
import * as d3 from 'd3';
import Vue, { PropType } from 'vue';
import { schemaGraph } from '@/lib/aggregation';

import { Dimensions, Network } from '@/types';

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
  },

  data(): {
    browser: Dimensions;
    visMargins: { left: number; top: number; right: number; bottom: number };
    updatedSchema: any;
    currentParent: string;
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      updatedSchema: {},
      currentParent: '',
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
      } = this;
      return {
        treeListHover,
        currentSchema,
        network,
        treeRelationships,
        colorsDict,
      };
    },
    colorScale(): any {
      const colorDomain = Object.keys(this.colorsDict).sort();
      return d3.scaleOrdinal().domain(colorDomain).range(d3.schemeCategory10);
    },
  },

  watch: {
    treeListHover() {
      this.hoverSchema();
    },
    currentSchema() {
      this.initializeSchema();
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

    // Draw motif rect
    this.svg
      .append('rect')
      .attr('width', this.width)
      .attr('height', this.height / 4)
      .attr('stroke', 'black')
      .attr('transform', `translate(0, ${(this.height / 4) * 3})`)
      .attr('fill', 'none');

    this.networkGroup = this.svg.append('g').attr('id', 'networkGroup');

    this.schemaDict = {};
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
      this.$emit('updateSchemaNetwork', newNetwork);
      console.log('NEW NETWORK', newNetwork);
      this.createSchema(newNetwork);
    },
    createSchema(this: any, schema: any) {
      d3.select('#networkGroup').selectAll('*').remove();
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
        .attr('id', (d: any) => d.Label.replace(' ', ''))
        .style('fill', (d: any) => {
          const label = d.Label.replace(' ', '');
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
        // console.log(this);
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

      // Drag functions
      function dragstarted() {
        d3.select(this).clone(true).classed('notclone', true); // look into this
        d3.select(this).raise().attr('stroke', 'black').classed('clone', true);
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

        if (mouseCoordinates[1] > (networkHeight / 4) * 3) {
          if (mouseCoordinates[0] < networkWidth / 2) {
            d3.select(this)
              .attr('cx', networkWidth / 4)
              .attr('cy', (networkHeight / 8) * 7)
              .attr('r', 20);
            this.runMotifSearch();
          } else if (
            mouseCoordinates[0] >= networkWidth / 2 &&
            mouseCoordinates[0] < networkWidth
          ) {
            d3.select(this)
              .attr('cx', (networkWidth / 4) * 3)
              .attr('cy', (networkHeight / 8) * 7)
              .attr('r', 20);
            this.runMotifSearch();
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

      // Create legend for toggling edges
      const uniqueLinks = [...new Set(linksData.map((l: Link) => l.Type))];
      const legendSVG = d3.select(this.$refs.schemaView).append('g');

      legendSVG
        .selectAll('rect')
        .data(uniqueLinks)
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
        .data(uniqueLinks)
        .join('text')
        .attr('class', (l: string) => l.replace(/\s/g, ''))
        .attr('height', 10)
        .attr('fill', '#000')
        .attr('x', 30)
        .attr('y', (l: string, i: number) => 20 + i * 15)
        .html((l: string) => l);

      const legendRect = legendSVG
        .append('g')
        .selectAll('rect')
        .data(uniqueLinks)
        .join('rect')
        .attr('style', 'cursor: pointer;')
        .attr('width', 200)
        .attr('height', 12)
        .attr('opacity', 0)
        .attr('x', 10)
        .attr('y', (d, i) => 10 + i * 15)
        .attr('active', 'no');

      legendRect.on('click', (l: string) => {
        const click = d3.selectAll(`.${l.replace(/\s/g, '')}`).attr('click');
        if (click === null) {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', true)
            .attr('click', 'clicked');
        } else {
          d3.selectAll(`.${l.replace(/\s/g, '')}`)
            .classed('legendSelected', false)
            .attr('click', 'null');
        }
      });
    },

    runMotifSearch(this: any) {
      if (this.start[0] + this.end[0] === 2) {
        console.log('QUERY:', this.start[1], this.end[1]);
      }
    },

    updateSchema(this: any) {
      d3.select('#networkGroup').selectAll('*').remove();
      this.initializeSchema();
    },

    // Hover schema nodes based on tree list hover
    hoverSchema() {
      const hoverClass =
        '#' + this.treeListHover.toString().toUpperCase().replace(' ', '');
      d3.selectAll('.treehover').classed('treehover', false);

      d3.select(hoverClass).attr('class', 'treehover').raise();
    },
  },
});
</script>

<template>
  <div>
    <svg id="schemaView" ref="schemaView" width="800" height="900" />
  </div>
</template>

<style scoped>
svg >>> circle {
  cursor: pointer;
}
/* 
svg >>> circle:hover {
  stroke: black;
  stroke-width: 2px;
} */

svg >>> circle.treehover {
  stroke: black;
  stroke-width: 2px;
}

svg >>> .legendSelected {
  fill: grey;
}
</style>