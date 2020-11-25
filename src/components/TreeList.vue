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
    rabbit: any;
    mouse: any;
    classifications: string[];
    currentClassification: string;
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      //class data will take an input as a csv probably
      rabbit: [
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
        { name: 'Vessel', parent: 'Vasculature' },
        { name: 'Volume', parent: '' },
        { name: 'WBC', parent: 'Vasculature' },
        { name: 'yAC', parent: 'AC' },
        { name: 'yAC Ai', parent: 'yAC' },
        { name: 'yAC IAC', parent: 'yAC' },
        { name: 'yAC SAC', parent: 'yAC' },
      ],
      mouse: [
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
        { name: 'Volume', parent: '' },
        { name: 'WBC', parent: 'Vasculature' },
        { name: 'yAC', parent: 'AC' },
        { name: 'yAC Ai', parent: 'yAC' },
        { name: 'yAC IAC', parent: 'yAC' },
        { name: 'yAC SAC', parent: 'yAC' },
      ],
      classifications: ['Rabbit', 'Mouse/Primate'],
      currentClassification: '',
    };
  },

  computed: {
    root(): any {
      let i = 0;
      let links: any[] = [];
      if (this.currentClassification == 'Rabbit') {
        links = JSON.parse(JSON.stringify(this.rabbit));
      } else {
        links = JSON.parse(JSON.stringify(this.mouse));
      }
      this.$emit('relationships', links);
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

      // Function to only show children, return after transition works
      // function collapse(d: any) {
      //   if (d.children) {
      //     d._children = d.children;
      //     d._children.forEach(collapse);
      //     d.children = null;
      //   }
      // }
      // root.children.forEach((c: any) => {
      //   if (c.children) {
      //     c.children.forEach(collapse);
      //   }
      // });

      return root;
    },
    nodesLength(): any {
      return this.root.descendants();
    },
    familyTree(): string[] {
      if (this.currentClassification == 'Rabbit') {
        const familyTree = this.rabbit.map((d: any) => d.name);
        return familyTree;
      } else {
        const familyTree = this.mouse.map((d: any) => d.name);
        return familyTree;
      }
    },
  },
  watch: {
    currentClassification() {
      this.update();
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
        `${-this.nodeSize} ${this.nodeSize * 28} ${this.height / 4} ${
          this.width / 4
        }`,
      );

    // Set up color scale
    const colorDomainVals: string[] = this.root
      .descendants()
      .map((c) => (c.children ? null : c.data.id));

    this.colorScale = d3
      .scaleOrdinal()
      .domain(colorDomainVals)
      .range(d3.schemeCategory10);
  },

  methods: {
    update(this: any) {
      d3.select('#treelist').selectAll('*').remove();
      const nodes = this.root.descendants();

      this.$emit('changeSchema', nodes.slice(1));
      const node = this.svg
        .selectAll('.option')
        .data(nodes, (d: any) => d.id || (d.id = d.data.id));

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

      const nodeEnter = node.enter().append('g').attr('class', 'option');

      nodeEnter
        .attr(
          'transform',
          (d: any) => `translate(0,${d.index * this.nodeSize})`,
        )
        .on('click', this.click)
        .on('mouseover', (d: any) => this.$emit('hoverSchema', d.data.id));

      nodeEnter
        .append('circle')
        .attr('cx', (d: any) => d.depth * this.nodeSize)
        .attr('r', 4)
        // .attr('fill', (d: any) => (d.children ? null : '#999'));
        .style('fill', (d: any) => {
          if (d.parent == null || d.parent.id == 'Volume') {
            console.log();
            return '#999';
          } else if (d.children) {
            return this.colorScale(d.id);
          } else {
            return this.colorScale(d.parent.id);
          }
        });

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
      const change: string[] = this.familyTree.filter((i) => i == d.id);
      allPaths.push(d.index);

      if (d.parent) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
          d._children.forEach((c: any) => {
            allPaths.push(c.index);
            change.push(c.id);
            if (c.children) {
              c.children.forEach((gc: any) => {
                allPaths.push(gc.index);
                change.push(gc.id);
              });
            }
          });
        } else {
          d.children = d._children;
          d.children.forEach((c: any) => {
            change.push(c.id);
            if (c.children) {
              c.children.forEach((gc: any) => {
                change.push(gc.id);
              });
            }
          });
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
    <v-col>
      <v-select
        :items="classifications"
        label="Pick Volume Type"
        v-model="currentClassification"
      ></v-select>
    </v-col>
    <svg id="treelist" ref="treelist" width="200" height="900" />
  </div>
</template>

<style scoped>
svg >>> .option {
  cursor: pointer;
}

svg >>> .option:hover {
  font-weight: bold;
  fill: orange;
}
</style>
