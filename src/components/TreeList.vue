<script lang="ts">
import * as d3 from 'd3';
import Vue, { PropType } from 'vue';

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
    visMargins: { left: number; top: number; right: number; bottom: number };
    classData: any; //interface ClassData<T> {name: string; parent: string};
    //add data properties from visquerymethods.ts private member variables
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      //class data will take an input as a csv probably
      classData: [
        { name: 'RC1', parent: '' },
        { name: 'Bipolar', parent: 'Neuron' },
        { name: 'Amacrine', parent: 'Neuron' },
        { name: 'Photoreceptor', parent: 'Neuron' },
        { name: 'Horizontal', parent: 'Neuron' },
        { name: 'Ganglion', parent: 'Neuron' },
        { name: 'Null', parent: 'Neuron' },
        { name: 'CB', parent: 'Bipolar' },
        { name: 'RodBC', parent: 'Bipolar' },
        { name: 'CBb', parent: 'CB' },
        { name: 'CBa', parent: 'CB' },
        { name: 'GAC', parent: 'Amacrine' },
        { name: 'YAC', parent: 'Amacrine' },
        { name: 'non G/Y-AC', parent: 'Amacrine' },
        { name: 'AII', parent: 'GAC' },
        { name: 'IAC', parent: 'YAC' },
        { name: 'AI', parent: 'YAC' },
        { name: 'Rod', parent: 'Photoreceptor' },
        { name: 'Cone', parent: 'Photoreceptor' },
        { name: 'Indeterminate', parent: 'Photoreceptor' },
        { name: 'ON', parent: 'Ganglion' },
        { name: 'OFF', parent: 'Ganglion' },
        { name: 'ON/OFF', parent: 'Ganglion' },
        { name: 'Neuron', parent: 'RC1' },
        { name: 'Glia', parent: 'RC1' },
        { name: 'Müller glia', parent: 'Glia' },
        { name: 'Microglia', parent: 'Glia' },
        { name: 'Astrocytes', parent: 'Glia' },
        { name: 'Misnamed', parent: 'RC1' },
      ],
    };
  },

  computed: {
    // properties(this: any) {
    //   const { network } = this;
    //   return {
    //     network,
    //   };
    // },
    root(): any {
      let i = 0;
      const links = JSON.parse(JSON.stringify(this.classData));
      const childColumn = Object.keys(links[0])[0];
      const parentColumn = Object.keys(links[0])[1];

      const stratify = d3
        .stratify()
        .id((d: any) => d[childColumn])
        .parentId((d: any) => d[parentColumn]);

      const stratifiedData = stratify(links);

      const root = d3
        .hierarchy(stratifiedData)
        .eachBefore((d: any) => (d.index = i++));

      return root;
    },
    nodesLength(): any {
      return this.root.descendants();
    },
  },
  watch: {},

  async mounted(this: any) {
    // can add constructor stuff here
    this.root;
    this.nodesLength;
    this.browser.width =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;

    this.browser.height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    // Set up vars for tree
    // this.i = 0;
    this.nodeSize = 17;
    this.duration = 500;
    this.format = d3.format(',');
    this.width = 800;

    this.nodeEnterTransition = d3
      .transition()
      .duration(750)
      .ease(d3.easeLinear);

    this.columns = [
      {
        label: 'Size',
        value: (d: any) => this.format(d.value),
        // format,
        x: 280,
      },
      {
        label: 'Count',
        value: (d: any) => (d.children ? 0 : 1),
        format: (value: number, d: any) =>
          d.children ? this.format(value) : '-',
        x: 340,
      },
    ];

    // set up data to proper formate
    const links = this.classData;
    const childColumn = links.columns[0];
    const parentColumn = links.columns[1];

    const stratify = d3
      .stratify()
      .id((d: any) => d[childColumn])
      .parentId((d: any) => d[parentColumn]);

    this.data = stratify(links);

    this.root = d3
      .hierarchy(this.data)
      .eachBefore((d: any) => (d.index = this.i++));
    this.nodeslength = this.root.descendants();

    // Size the svgs
    this.svg = d3
      .select(this.$refs.treelist)
      .attr(
        'viewBox',
        `${-this.nodeSize / 2} ${(-this.nodeSize * 3) / 2} ${this.width} ${
          (this.nodeslength.length + 1) * this.nodeSize
        }`,
      )
      .style('overflow', 'visible');
    //   .attr('width', 800)
    //   .attr('height', 900)
    //   .attr('viewBox', `0 0 ${800} ${900}`);

    this.update(this, this.root);
  },

  methods: {
    // add the functions here
    update(this: any, source: any) {
      console.log(source);
      const nodes = source.descendants();
      const height = (nodes.length + 1) * this.nodeSize;
      this.svg.transition().attr('height', height);

      const node = this.svg
        .selectAll('.node')
        .data(nodes, (d: any) => d.id || (d.id = ++this.i));

      const link = this.svg
        .append('g')
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .selectAll('path')
        .data(this.root.links())
        .join('path')
        .attr(
          'd',
          (d: any) => `
            M${d.source.depth * this.nodeSize},${d.source.index * this.nodeSize}
            V${d.target.index * this.nodeSize}
            h${this.nodeSize}
        `,
        )
        .attr('class', (d: any) => `link${d.source.index}`);

      const nodeEnter = node.enter().append('g').attr('class', 'node');

      nodeEnter
        .attr(
          'transform',
          (d: any) => `translate(0,${d.index * this.nodeSize})`,
        )
        .on('click', (d: any) => this.click(this, d));

      nodeEnter
        .append('circle')
        .attr('cx', (d: any) => d.depth * this.nodeSize)
        .attr('r', 2.5)
        .attr('fill', (d: any) => (d.children ? null : '#999'));

      nodeEnter
        .append('text')
        .attr('dy', '0.32em')
        .attr('x', (d: any) => d.depth * this.nodeSize + 6)
        .text((d: any) => d.data.id);

      nodeEnter.append('title').text((d: any) =>
        d
          .ancestors()
          .reverse()
          .map((d: any) => d.data.id)
          .join('/'),
      );

      for (const { label, value, x } of this.columns) {
        //format,
        this.svg
          .append('text')
          .attr('dy', '0.32em')
          .attr('y', -this.nodeSize)
          .attr('x', x)
          .attr('text-anchor', 'end')
          .attr('font-weight', 'bold')
          .text(label);

        nodeEnter
          .append('text')
          .attr('dy', '0.32em')
          .attr('x', x)
          .attr('text-anchor', 'end')
          .attr('fill', (d: any) => (d.children ? null : '#555'))
          .data(this.root.copy().sum(value).descendants())
          .text((d: any) => this.format(d.value, d));
      }

      node
        .exit()
        .transition()
        .duration(this.duration)
        .style('opacity', 0)
        .remove();

      link
        .exit()
        .transition()
        .duration(this.duration)
        .style('opacity', 0)
        .remove();
    },

    click(this: any, d: any) {
      //   const that = this;
      const allPaths = [];
      allPaths.push(d.index);
      if (d.parent) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
          d._children.map((c: any) => allPaths.push(c.index));
        } else {
          d.children = d._children;
          d._children = null;
        }
        allPaths.map((p) => d3.selectAll(`path.link${p}`).remove());
        d3.select(this).remove();
        this.update(d);
      }
    },
  },
});
</script>

<template>
  <div>
    <svg id="treelist" ref="treelist" width="800" height="900" />
  </div>
</template>

<style scoped>
svg >>> .node {
  cursor: pointer;
}

svg >>> .node:hover {
  font-weight: bold;
  fill: orange;
}
</style>
