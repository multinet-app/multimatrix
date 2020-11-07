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
        { name: 'AC', parent: 'Neuron' },
        { name: 'Vasculature', parent: 'Volume' },
        { name: 'AC IPC', parent: 'AC' },
        { name: 'AC OFF', parent: 'AC' },
        { name: 'AC ON', parent: 'AC' },
        { name: 'AC ON OFF', parent: 'AC' },
        { name: 'AC TH1', parent: 'AC' },
        { name: 'Asc', parent: 'Glia' },
        { name: 'BC', parent: 'Neuron' },
        { name: 'CB', parent: 'BC' },
        { name: 'CB OFF', parent: 'CB' },
        { name: 'CB ON', parent: 'CB' },
        { name: 'CBa', parent: 'CB' },
        { name: 'CBb', parent: 'CB' },
        { name: 'ConePR', parent: 'PR' },
        { name: 'DS', parent: 'GC' },
        { name: 'EC', parent: 'Vasculature' },
        { name: 'GAC', parent: 'AC' },
        { name: 'GAC Aii', parent: 'GAC' },
        { name: 'GAC yAC', parent: 'AC' },
        { name: 'GC', parent: 'Neuron' },
        { name: 'GC OFF', parent: 'GC' },
        { name: 'GC ON', parent: 'GC' },
        { name: 'GC ON OFF', parent: 'GC' },
        { name: 'Glia', parent: 'Volume' },
        { name: 'HC', parent: 'Neuron' },
        { name: 'HCa', parent: 'HC' },
        { name: 'HCb', parent: 'HC' },
        { name: 'IBC', parent: 'Peri' },
        { name: 'IndPR', parent: 'PR' },
        { name: 'MC', parent: 'Glia' },
        { name: 'Neuron', parent: 'Volume' },
        { name: 'Null', parent: 'Volume' },
        { name: 'Peri', parent: 'Vasculature' },
        { name: 'PR', parent: 'Neuron' },
        { name: 'RBC', parent: 'Vasculature' },
        { name: 'RodBC', parent: 'BC' },
        { name: 'RodPR', parent: 'PR' },
        { name: 'tDS', parent: 'GC' },
        { name: 'uG', parent: 'Glia' },
        { name: 'Vessel', parent: 'Volume' },
        { name: 'Volume', parent: '' },
        { name: 'WBC', parent: 'Vasculature' },
        { name: 'yAC', parent: 'AC' },
        { name: 'yAC Ai', parent: 'yAC' },
        { name: 'yAC IAC', parent: 'yAC' },
        { name: 'yAC SAC', parent: 'yAC' },
      ],
    };
  },

  computed: {
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

    this.nodeSize = 17;
    this.duration = 500;
    this.width = d3.select(this.$refs.treelist).attr('width');
    this.height = d3.select(this.$refs.treelist).attr('height');

    this.nodeEnterTransition = d3
      .transition()
      .duration(750)
      .ease(d3.easeLinear);

    // Size the svgs
    this.svg = d3
      .select(this.$refs.treelist)
      .attr(
        'viewBox',
        `${-this.nodeSize / 2} ${this.nodeSize * 28} ${this.height / 4} ${
          this.width / 4
        }`,
      )
      .style('overflow', 'visible');

    this.update();
  },

  methods: {
    update(this: any) {
      let i = 0;
      const nodes = this.root.descendants();

      const node = this.svg
        .selectAll('.node')
        .data(nodes, (d: any) => d.id || (d.id = ++i));

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
        .on('click', this.click);

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
      const allPaths = [];
      allPaths.push(d.index);
      if (d.parent) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
          const allChildren = d.descendants();
          allChildren[0]['_children'].forEach(function (c: any) {
            allPaths.push(c.index);
            c.descendants().forEach((gc: any) => {
              allPaths.push(gc.index);
            });
          });
        } else {
          d.children = d._children;
          d._children = null;
        }
        allPaths.map((p) => d3.selectAll(`path.link${p}`).remove());
        d3.select(this).remove();
        this.update();
      }
    },
  },
});
</script>

<template>
  <div>
    <svg id="treelist" ref="treelist" width="200" height="900" />
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
