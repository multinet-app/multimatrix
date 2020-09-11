/* The Query allows users to create visual AQL queries. */
import * as d3 from 'd3';
import { Dimensions, Link, Network, Node, Cell, State } from '@/types';

declare const reorder: any;

export class Query {
  private network: Network;
  private attributeRows: any;
  private tooltip: any;
  private visMargins: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  private nodeFontSize: string = '10';
  private columnHeaders: any;
  private attributeScales: { [key: string]: any } = {};
  private colMargin: number = 5;
  private provenance: any;
  private orderType: any;
  private mouseOverEvents: any;

  constructor(
    network: Network,
    visMargins: { left: number; top: number; right: number; bottom: number },
  ) {
    this.network = network;
    this.visMargins = visMargins;

    // initialize schema view
    this.createSchema();
  }

  private createSchema(): void {
    let start: number[] = [0, 0];
    let end: number[] = [0, 0];

    // later have this resize automatically
    let width: number = 400;
    let height: number = 800;

    const svg: any = d3.select('#visquery');

    let motifSVG = svg
      .attr('width', width)
      .attr('height', height)
      .attr('transform', `translate(0, -${height / 4})`);

    motifSVG
      .append('rect') // Motif Box
      .attr('id', 'motif')
      .attr('width', width)
      .attr('height', height / 4)
      .attr('stroke', 'black')
      .attr('fill', 'none');

    // SIMULATION + FUNCTIONS
    let simulation = d3
      .forceSimulation(this.network.nodes)
      .force(
        'link',
        d3
          .forceLink()
          .id((d) => d.key)
          .links(this.network.links),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked);

    simulation.tick(300);

    function ticked() {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

      simulation.stop();
    }

    simulation.on('tick', ticked());

    function dragstarted(d) {
      d3.select(this).clone();
      d3.select(this).attr('stroke', 'black').classed('clone', true);
    }

    function dragged(d) {
      d3.select(this)
        .raise()
        .attr('cx', (d.x = d3.event.x))
        .attr('cy', (d.y = d3.event.y));
    }

    function dragended(d) {
      console.log(d);
      d3.select(this).attr('stroke', null);
      let id = '#' + d.key + '.clone';

      let yPos = d3.select(id).attr('cy');
      let xPos = d3.select(id).attr('cx');
      let motifWidth = d3.select('rect#motif').attr('width');
      let networkHeight = d3.select('rect#network').attr('width');
      console.log(id);

      if (yPos > networkHeight) {
        if (xPos < motifWidth / 2) {
          d3.select(id)
            .attr('cx', motifWidth / 4)
            .attr('cy', 900)
            .attr('r', 20);
          start[0] = 1;
          start[1] = d.key;
          runMotifSearch(start, end);
        } else if (xPos > motifWidth / 2 && xPos < motifWidth) {
          d3.select(id)
            .attr('cx', (motifWidth / 4) * 3)
            .attr('cy', 900)
            .attr('r', 20);
          end[0] = 1;
          end[1] = d.key;
          runMotifSearch(start, end);
        } else {
          d3.select(id).remove();
        }
      } else {
        d3.select(id).remove();
      }
    }

    function runMotifSearch(s, e) {
      if (start[0] + end[0] === 2) {
        console.log(start[1], end[1]); // need help graph searching
      }
    }
  }
  public updateQuery() {
    console.log('query!');
  }
}
