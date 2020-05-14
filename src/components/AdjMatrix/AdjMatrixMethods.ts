/* The View displays the data given to it by the model. */
import * as d3 from 'd3';
import * as ProvenanceLibrary from 'provenance-lib-core/lib/src/provenance-core/Provenance';
import 'science';
import 'reorder.js';
import { Dimensions, Link, Network, Node } from '@/types';

declare const reorder: any;

export class View {
  public attributeVariables: string[] = [];

  private selectedCells: any[] = [];
  private network: Network;
  private icons: { [key: string]: { [d: string]: string}};
  private sortKey: string;
  private edges: any;
  private matrix: Array<Array<{
    cellName: string,
    correspondingCell: string,
    rowID: string,
    colID: string,
    x: number,
    y: number,
    z: number,
  }>>;
  private edgeWidth: number = 0;
  private edgeHeight: number = 0;
  private attributeRows: any;
  private tooltip: any;
  private order: any;
  private margins: { left: number, top: number, right: number, bottom: number };
  private attributes: any;
  private orderingScale: d3.ScaleBand<number> = d3.scaleBand<number>();
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales!: { [key: string]: any };
  private nodeFontSize: string = '12';
  private columnHeaders: any;
  private attributeScales: { [key: string]: any } = {};
  private colMargin: number = 5;
  private visDimensions: Dimensions;
  private provenance: any;
  private idMap: { [key: string]: number};
  private hoverRow: {} = {};
  private hoverCol: {} = {};
  private isMultiEdge: any;
  private orderType: any;
  private highlightedNodes: { [key: string]: any[] } = {};
  private columnSelectedNodes: any[] = [];
  private mouseOverEvents: any;
  private maxNumConnections: number = -Infinity;

  constructor(network: Network, visDimensions: any, attributeVariables: string[]) {
    this.network = network;
    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };
    this.visDimensions = visDimensions;
    this.provenance = this.setUpProvenance();
    this.sortKey = 'name';
    this.matrix = [];
    this.idMap = {};
    this.attributeVariables = attributeVariables;

    this.icons = {
      quant: {
        d: 'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z',
      },
      alphabetical: {
        d: 'M401.1,331.2h-189c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.8C407.7,334.2,404.8,331.2,401.1,331.2z M223.7,344.3H266c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-42.3V344.3z M223.7,373H300c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-76.3V373.7z M263.6,447.8c0,2-1.6,3.6-3.6,3.6h-36.4v-18.8H260c2,0,3.6,1.6,3.6,3.6V447.8z M321.5,418.4c0,2-1.6,3.6-3.6,3.6h-94.2v-18.8h94.2c2,0,3.6,1.6,3.6,3.6V418.4z M392.6,449.5h-34.3V442l22.6-27h-21.7v-8.8h33.2v7.5l-21.5,27h21.7V449.5z M381,394.7l-3.7,6.4l-3.7-6.4h2.7v-14.6h2v14.6H381z M387,380l-3.4-9.7h-13.5l-3.3,9.7h-10.2l15.8-43.3h9l15.8,43.3H387z M371.8,363.4H382l-5.1-15.3L371.8,363.4z',
      },
      categorical: {
        d: 'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.4C407.7,333.7,404.7,330.7,401,330.7z M272.9,374.3h-52.4v-17.1h52.4V374.3z M272.9,354h-52.4v-17h52.4V354z M332.1,414.9h-52.4v-17h52.4V414.9z M332.1,394.6h-52.4v-17h52.4V394.6z M394.8,456.5h-52.4v-17h52.4V456.5z M394.8,434.9h-52.4v-17h52.4V434.9z',
      },
      cellSort: {
        d: 'M115.3,0H6.6C3,0,0,3,0,6.6V123c0,3.7,3,6.6,6.6,6.6h108.7c3.7,0,6.6-3,6.6-6.6V6.6C122,3,119,0,115.3,0zM37.8,128.5H15.1V1.2h22.7V128.5z',
      },
    };

    this.network.nodes.forEach((node: Node, index: number) => {
      node.index = index;
      this.idMap[node.id] = index;
    });

    this.processData();
    this.loadData();
  }

  /**
   * Takes in the data, and initializes visualization.
   * @param  data [description]
   * @return      [description]
   */
  public loadData(): void {
    // Kick off the rendering
    this.initializeEdges();
    this.initializeAttributes();
  }

  public updateAttributes(): void {
    // Set the column widths and margin
    const attrWidth = parseFloat(d3.select('#attributes').attr('width'));
    const colWidth = attrWidth / this.attributeVariables.length - this.colMargin;

    // Update the variable scales
    for (const name of this.attributeVariables) {
      this.attributeScales[name] = d3.scaleLinear();
    }

    // Update the column headers
    const columnHeaderGroups = this.columnHeaders
      .selectAll('text')
      .data(this.attributeVariables);

    columnHeaderGroups
      .exit()
      .remove();

    columnHeaderGroups
      .enter()
      .append('text')
      .merge(columnHeaderGroups)
      .style('font-size', '14px')
      .style('text-transform', 'capitalize')
      .style('word-wrap', 'break-word')
      .attr('text-anchor', 'left')
      .attr('transform', 'translate(0,-65)')
      .attr('cursor', 'pointer')
      .text((d: string) => d)
      .attr('y', 16)
      .attr('x', (d: any, i: number) => (colWidth + this.colMargin) * i)
      .attr('width', colWidth)
      .on('click', (d: any, i: number) => this.sort(d));

    // Calculate the variable scales
    this.attributeVariables.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        const minimum = d3.min(this.network.nodes.map((node: Node) => node[col])) || '0';
        const maximum = d3.max(this.network.nodes.map((node: Node) => node[col])) || '0';
        const domain = [parseFloat(minimum), parseFloat(maximum)];

        const scale = d3.scaleLinear().domain(domain).range([0, colWidth]);
        scale.clamp(true);
        this.attributeScales[col] = scale;
      } else {
        const values: string[] = this.network.nodes.map((node: Node) => node[col]);
        const domain = [...new Set(values)];
        const scale = d3.scaleOrdinal(d3.schemeCategory10).domain(domain);

        this.attributeScales[col] = scale;
      }
    });

    d3.selectAll('.attr-axis').remove();

    // Add the scale bar at the top of the attr column
    this.attributeVariables.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        const barScaleVis = this.attributes
          .append('g')
          .attr('class', 'attr-axis')
          .attr('transform', `translate(${(colWidth + this.colMargin) * index},-15)`)
          .call(d3.axisTop(this.attributeScales[col])
            .tickValues(this.attributeScales[col].domain())
            .tickFormat((d: any) => {
              if ((d / 1000) >= 1) {
                d = Math.round(d / 1000) + 'K';
              }
              return parseFloat(d).toFixed(4);
            }))
          .selectAll('text')
          .style('text-anchor', (d: any, i: number) => i % 2 ? 'end' : 'start');
      }
    });

    d3.selectAll('.glyph').remove();
    /* Create data columns data */
    this.attributeVariables.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('height', this.orderingScale.bandwidth())
          .attr('width', (d: any) => this.attributeScales[col](d[col]))
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0) // y is set by translate on the group
          .attr('fill', (d: any) => '#82b1ff')
          .attr('cursor', 'pointer')
          .on('mouseover', (d: any, i: number, nodes: any) => this.attributeMouseOver(d, i, nodes))
          .on('mouseout', (d: any) => this.attributeMouseOut(d))
          .on('click', (d: any, i: number) => {
            this.nodeClick(d);
            this.selectNeighborNodes(this.network.nodes[i].id, this.network.nodes[i].neighbors);
          });
      } else {
        this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0)
          .attr('fill', '#dddddd')
          .attr('width', colWidth)
          .attr('height', this.orderingScale.bandwidth())
          .attr('fill', (d: any) => this.attributeScales[col](d[col]))
          .attr('cursor', 'pointer')
          .on('mouseover', (d: any, i: number, nodes: any) => this.attributeMouseOver(d, i, nodes))
          .on('mouseout', (d: any) => this.attributeMouseOut(d))
          .on('click', (d: any, i: number) => {
            this.nodeClick(d);
            this.selectNeighborNodes(this.network.nodes[i].id, this.network.nodes[i].neighbors);
          });
      }
    });

    d3.selectAll('.attrSortIcon').remove();

    // Add sort icons to the top of the header
    const path = this.columnHeaders
      .selectAll('path')
      .data(this.attributeVariables);

    path
      .enter()
      .append('path')
      .merge(path)
      .attr('class', `sortIcon attr attrSortIcon`)
      .attr('cursor', 'pointer')
      .attr('d', (d: any) => {
        const variable = this.isQuantitative(d) ? 'quant' : 'categorical';
        return this.icons[variable].d;
      })
      .attr('transform', (d: any, i: number) => `scale(0.1)translate(${(colWidth + this.colMargin) * i * 10 - 200}, -1100)`)
      .style('fill', (d: any) => '#8B8B8B')
      .on('click', (d: any) => this.sort(d));

  }

  private isQuantitative(varName: string): boolean {
    const uniqueValues = [...new Set(this.network.nodes.map((node: any) => parseFloat(node[varName])))];
    return uniqueValues.length > 5;
  }

  /**
   * initializes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  private initializeEdges(): void {
    // Set width and height based upon the calculated layout size. Grab the smaller of the 2
    const width = this.visDimensions.width;
    const height = this.visDimensions.height;
    const sideLength = width < height ? width : height;

    // Use the smallest side as the length of the matrix
    this.edgeWidth = sideLength - (this.margins.left + this.margins.right);
    this.edgeHeight = sideLength - (this.margins.top + this.margins.bottom);

    // Creates scalable SVG
    this.edges = d3.select('#matrix')
      .append('g')
      .attr('transform', `translate(${this.margins.left},${this.margins.top})`);

    // sets the vertical scale
    this.orderingScale = d3.scaleBand<number>()
    .range([0, this.edgeHeight]).domain(d3.range(0, this.network.nodes.length, 1));

    // creates column groupings
    this.edgeColumns = this.edges.selectAll('.column')
      .data(this.matrix)
      .enter().append('g')
      .attr('class', 'column')
      .attr('transform', (d: any, i: number) => {
        return `translate(${this.orderingScale(i)})rotate(-90)`;
      });

    // Draw each row
    this.edgeRows = this.edges.selectAll('.row')
      .data(this.matrix)
      .enter()
      .append('g')
      .attr('class', 'row')
      .attr('transform', (d: any, i: number) => {
        return `translate(0,${this.orderingScale(i)})`;
      });


    this.drawGridLines();

    // add the highlight rows
    this.edgeColumns
      .append('rect')
      .classed('topoCol', true)
      .attr('id', (d: any, i: number) => {
        return `topoCol${d[i].colID}`;
      })
      .attr('x', -this.edgeHeight - this.margins.bottom)
      .attr('y', 0)
      .attr('width', this.edgeHeight + this.margins.bottom + this.margins.top)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0);

    // added highlight rows
    this.edgeRows
      .append('rect')
      .classed('topoRow', true)
      .attr('id', (d: any, i: number) => {
        return `topoRow${d[i].rowID}`;
      })
      .attr('x', -this.margins.left)
      .attr('y', 0)
      .attr('width', this.edgeWidth + this.margins.right + this.margins.left)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0);

    const cells = this.edgeRows.selectAll('.cell')
      .data((d: any) => d)
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('id', (d: any) => d.cellName)
      .attr('transform', (d: any) => `translate(${this.orderingScale(d.x)},0)`);

    cells
      .append('rect')
      .classed('baseCell', true)
      .attr('x', 0)
      .attr('height', this.orderingScale.bandwidth())
      .attr('width', this.orderingScale.bandwidth());

    const cellColorScale = d3.scaleLinear<number,string>()
      .domain([0,this.maxNumConnections])
      .range(["#feebe2", "#690000"]); // TODO: colors here are arbitrary, change later

    const squares = cells
      .append('rect')
      .attr('x', 0)// d => this.orderingScale(d.x))
      // .filter(d=>{return d.item >0})
      .attr('width', this.orderingScale.bandwidth())
      .attr('height', this.orderingScale.bandwidth())
      .style('fill', (d: { z: number; }) => cellColorScale(d.z));

    squares
      .filter((d: any) => d.z === 0)
      .style('fill-opacity', (d: { z: number; }) => d.z);

    cells
      .on('mouseover', (cell: any, i: number, nodes: any) => {
        this.showToolTip(cell, i, nodes);
        this.hoverEdge(cell);
      })
      .on('mouseout', (cell: any) => {
        this.hideToolTip();
        this.unHoverEdge(cell);
      })
      .on('click', (d: any, i: number, nodes: any) => {
        const interaction = d3.select(nodes[i]).attr('class');
        const action = this.changeInteractionWrapper(d.id, nodes[i], interaction);
        this.provenance.applyAction(action);
      })
      .attr('cursor', 'pointer');

    this.hoverRow = {};
    this.hoverCol = {};

    this.appendEdgeLabels();

    // add tooltip
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  /**
   * Draws the nested edge bars
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  private drawEdgeBars(cells: any): void {
    // bind squares to cells for the mouse over effect
    const dividers = this.isMultiEdge ? 2 : 1;

    // let squares = cells
    let offset = 0;
    let squareSize = this.orderingScale.bandwidth() - 2 * offset;

    for (let index = 0; index < dividers; index++) {

      const type = this.isMultiEdge ? this.attributeScales.edge.type.domain[index] : 'interacted';

      cells
        .append('rect')
        .classed(`nestedEdges nestedEdges${type}`, true)
        .attr('x', offset)
        .attr('y', (d: any) => {
          return offset;
        })
        .attr('height', squareSize)
        .attr('width', squareSize)
        .attr('fill', (d: any) => this.edgeScales[type](d[type]));

      // adjust offset and square size for the next edge type
      offset = squareSize / 4;
      squareSize = squareSize - 2 * offset;

    }

    // remove all edge rectangles that have no interactions
    cells
      .selectAll('.nestedEdges')
      .filter((d: any) => {
        return d.mentions === 0 && d.retweet === 0 && d.interacted === 0;
      })
      .remove();
  }

  /**
   * Renders hover interactions and logs interaction in mouseoverEvents.
   * @param  cell d3 datum corresponding to cell's data
   * @return      none
   */
  private hoverEdge(cell: any): void {
    const cellIDs = [cell.cellName, cell.correspondingCell];

    this.selectedCells = cellIDs;
    this.selectedCells.map((elementID: string) => {
      d3.selectAll(`[id="${elementID}"]`).selectAll('.baseCell').classed('hoveredCell', true);
    });
    const cellID = cellIDs[0];

    // Add the nodes to be highlighted to the object
    this.addHighlightNodesToDict(this.hoverRow, cell.rowID, cellID);
    this.addHighlightNodesToDict(this.hoverCol, cell.colID, cellID);

    // If we're not on diagonal, highlight the other cell + row + column
    if (cell.colID !== cell.rowID) {
      this.addHighlightNodesToDict(this.hoverRow, cell.colID, cellID);
      this.addHighlightNodesToDict(this.hoverCol, cell.rowID, cellID);
    }

    //
    this.renderHighlightNodesFromDict(this.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.hoverCol, 'hovered', 'Col');
  }

  /**
   * Removes interaction highlight from a cell mouseover
   * @param  cell d3 datum element corresponding to the cell's data
   * @return      none
   */
  private unHoverEdge(cell: { cellName: any; rowID: any; colID: any; }): void {
    d3.selectAll('.hoveredCell').classed('hoveredCell', false);

    this.selectedCells = [];

    const cellID = cell.cellName;
    this.removeHighlightNodesFromDict(this.hoverRow, cell.rowID, cellID);  // Add row (rowID)
    this.removeHighlightNodesFromDict(this.hoverCol, cell.colID, cellID);  // Add col (colID)

    // If we're not on the diagonal, un-highlight the other cell + row + column
    if (cell.colID !== cell.rowID) {
      this.removeHighlightNodesFromDict(this.hoverRow, cell.colID, cellID);
      this.removeHighlightNodesFromDict(this.hoverCol, cell.rowID, cellID);
    }

    d3.selectAll('.hovered').classed('hovered', false);
  }

  /**
   * Renders column labels and row labels to the matrix.
   * @return none
   */
  private appendEdgeLabels(): void {
    this.edgeRows.append('text')
      .attr('class', 'rowLabel')
      .attr('id', (d: { [x: string]: { rowID: string; }; }, i: number) => {
        return `rowLabel${d[i].rowID}`;
      })
      .attr('z-index', 30)
      .attr('x', -3)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .style('font-size', this.nodeFontSize.toString() + 'pt')
      .text((d: any, i: number) => this.network.nodes[i]._key)
      .on('mouseout', (d: any, i: any, nodes: any) => this.mouseOverLabel(d, i, nodes))
      .on('mouseover', (d: any, i: any, nodes: any) => this.mouseOverLabel(d, i, nodes))
      .on('click', (d: any, i: number) => {
        this.nodeClick(d);
        this.selectNeighborNodes(this.network.nodes[i].id, this.network.nodes[i].neighbors);
      });

    let verticalOffset = 187.5;
    const horizontalOffset = (this.orderingScale.bandwidth() / 2 - 4.5) / 0.075;
    this.edgeColumns.append('path')
      .attr('id', (d: Array<{ rowID: string; }>) => `sortIcon${d[0].rowID}`)
      .attr('class', 'sortIcon')
      .attr('d', this.icons.cellSort.d)
      .style('fill', (d: any) => d === this.orderType ? '#EBB769' : '#8B8B8B')
      .attr('transform', `scale(0.075)translate(${verticalOffset},${horizontalOffset})rotate(90)`)
      .on('click', (d: Array<{ rowID: any; }>, i: number, nodes: any[]) => {
        this.sort(d[0].rowID);
        const action = this.changeInteractionWrapper(null, nodes[i], 'neighborSelect');
        this.provenance.applyAction(action);
      })
      .attr('cursor', 'pointer')
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); });

    verticalOffset = verticalOffset * 0.075 + 5;


    this.edgeColumns.append('text')
      .attr('id', (d: { [x: string]: { rowID: string; }; }, i: number) => {
        return `colLabel${d[i].rowID}`;
      })
      .attr('class', 'colLabel')
      .attr('z-index', 30)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('x', verticalOffset)
      .attr('dy', '.32em')
      .attr('text-anchor', 'start')
      .style('font-size', this.nodeFontSize)
      .text((d: any, i: number) => this.network.nodes[i]._key)
      .on('click', (d: any, i: number) => {
        this.nodeClick(d);
        this.selectNeighborNodes(this.network.nodes[i].id, this.network.nodes[i].neighbors);
      })
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); });
  }

  /**
   * renders the relevant highlights for mousing over a label. Logs the interaction
   * in mouseoverEvents.
   * @param  data  d3 data element
   * @param  i     d3 index
   * @param  nodes d3 nodes
   * @return       none
   */

  private mouseOverLabel(data: Array<{ rowID: any; }>, i: number, nodes: { [x: string]: any; }): void {
    const elementID = data[0].rowID;
    const flag = this.addHighlightNodesToDict(this.hoverRow, elementID, elementID);
    this.addHighlightNodesToDict(this.hoverCol, elementID, elementID);

    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.hoverCol, 'hovered', 'Col');
  }

  /**
   * Draws the grid lines for the adjacency matrix.
   * @return none
   */
  private drawGridLines(): void {
    const gridLines = this.edges
      .append('g')
      .attr('class', 'gridLines');

    const lines = gridLines
      .selectAll('line')
      .data(this.matrix)
      .enter();

    lines.append('line')
      .attr('transform', (d: any, i: number) => {
        return `translate(${this.orderingScale(i)},0)rotate(-90)`;
      })
      .attr('x1', -this.orderingScale.range()[1]);

    lines.append('line')
      .attr('transform', (d: any, i: number) => {
        return `translate(0,${this.orderingScale(i)})`;
      })
      .attr('x2', this.orderingScale.range()[1]);

    gridLines
      .append('line')
      .attr('x1', this.orderingScale.range()[1])
      .attr('x2', this.orderingScale.range()[1])
      .attr('y1', 0)
      .attr('y2', this.orderingScale.range()[1])
      .style('stroke', '#aaa')
      .style('opacity', 0.3);

    gridLines
      .append('line')
      .attr('x1', 0)
      .attr('x2', this.orderingScale.range()[1])
      .attr('y1', this.orderingScale.range()[1])
      .attr('y2', this.orderingScale.range()[1])
      .style('stroke', '#aaa')
      .style('opacity', 0.3);

  }

  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  private changeInteractionWrapper(nodeID: any, node: any, interactionType: any): any {
    return {
      label: interactionType,
      action: (interactID: string) => {
        const currentState = this.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = interactionType;
        const interactionName = interactionType; // cell, search, etc
        let interactedElement = interactionType;
        if (interactionName === 'cell') {
          const cellData: any = d3.select(node).data()[0]; //
          interactID = cellData.colID;
          interactedElement = cellData.cellName; // + cellData.rowID;

          this.changeInteraction(currentState, interactID, interactionName + 'col', interactedElement);
          this.changeInteraction(currentState, interactID, interactionName + 'row', interactedElement);
          if (cellData.cellName !== cellData.correspondingCell) {
            interactedElement = cellData.correspondingCell; // + cellData.rowID;
            interactID = cellData.rowID;

            this.changeInteraction(currentState, interactID, interactionName + 'col', interactedElement);
            this.changeInteraction(currentState, interactID, interactionName + 'row', interactedElement);
          }
          return currentState;

          // interactID = cellData.rowID;
          // interactionName = interactionName + 'row'
        } else if (interactionName === 'attrRow') {
          return interactionName;

        } else {
          this.changeInteraction(currentState, interactID, interactionName, interactedElement);
          return currentState;
        }
      },
    };
  }

  /**
   * Adds the interacted node to the state object.
   * @param  state           [description]
   * @param  nodeID          [description]
   * @param  interaction     [description]
   * @param  interactionName [description]
   * @return                 [description]
   */
  private changeInteraction(
    state: any,
    nodeID: string, interaction: string, interactionName: string = interaction,
  ): void {
    if (nodeID in state.selections[interaction]) {
      // Remove element if in list, if list is empty, delete key
      const currentIndex = state.selections[interaction][nodeID].indexOf(interactionName);
      if (currentIndex > -1) {
        state.selections[interaction][nodeID].splice(currentIndex, 1);
        if (state.selections[interaction][nodeID].length === 0) {
          delete state.selections[interaction][nodeID];
        }
      } else {
        state.selections[interaction][nodeID].push(interactionName);
      }
    } else {
      state.selections[interaction][nodeID] = [interactionName];
    }
  }

  private addHighlightNode(addingNode: string): void {
    // if node is in
    const nodeIndex = this.network.nodes.findIndex((item: { [x: string]: string; }, i: any) => {
      return item.id === addingNode;
    });

    for (let i = 0; i < this.matrix[0].length; i++) {
      if (true /*this.matrix[i][nodeIndex].z > 0*/) {
        const nodeID = this.matrix[i][nodeIndex].rowID;
        if (
          this.highlightedNodes.hasOwnProperty(nodeID) &&
          !this.highlightedNodes[nodeID].includes(addingNode)
        ) {
          // if array exists, add it
          this.highlightedNodes[nodeID].push(addingNode);
        } else {
          // if array non exist, create it and add node
          this.highlightedNodes[nodeID] = [addingNode];
        }
      }
    }
  }

  private nodeDictContainsPair(
    dict: { [x: string]: { add: (arg0: any) => any, has: (arg0: any) => any; }; },
    nodeToHighlight: string, interactedElement: any,
  ): boolean {
    if (nodeToHighlight in dict) {
      return dict[nodeToHighlight].has(interactedElement);
    }
    return false;
  }

  /**
   * If an interactedElement has not been interacted with, it will add the nodeToHighlight
   * to the provided highlight dict. If it has, it will remove it and return false. Otherwise,
   * it will add the interacted element connection to the nodeToHighlight.
   * @param  dict       The underlying storage to show which
   * @param  nodeToHighlight  [description]
   * @param  interactedElement [description]
   * @return            [description]
   */
  private addHighlightNodesToDict(
    dict: { [x: string]: { add: (arg0: any) => any, has: (arg0: any) => any; }; },
    nodeToHighlight: string, interactedElement: any,
  ): boolean {
    // if node already in highlight, remove it
    if (this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      this.removeHighlightNodesFromDict(dict, nodeToHighlight, interactedElement);
      return false;
    }

    // create new set if set exists
    if (!(nodeToHighlight in dict)) {

      dict[nodeToHighlight] = new Set();
    }
    // add element to set
    dict[nodeToHighlight].add(interactedElement);
    return true;
  }

  private removeHighlightNodesFromDict(
    dict: { [x: string]: any; }, nodeToHighlight: string, interactedElement: any,
  ): void {
    // if node is not in list, simply return
    if (!this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      return;
    }

    // if there are other elements highlighting the node to highlight
    if (dict[nodeToHighlight].size > 1) { // if set has more than 1 object
      dict[nodeToHighlight].delete(interactedElement); // delete element from set
    } else {
      delete dict[nodeToHighlight];
    }
  }

  private renderHighlightNodesFromDict(
    dict: { [x: string]: any; }, classToRender: string, rowOrCol: string = 'Row',
  ): void {
    // Un-highlight all other nodes
    if (classToRender !== 'hovered') {
      d3.selectAll(`.${classToRender}`)
        .classed(classToRender, false);
    }

    // highlight correct nodes
    let cssSelector = '';
    for (const node in dict) {
      if (Array.isArray(dict[node])) {
        for (const nodeID of dict[node]) {
          if (rowOrCol === 'Row') {
            cssSelector += `[id="attr${rowOrCol}${nodeID}"],`;
          }
          cssSelector += `[id="topo${rowOrCol}${nodeID}"],`;

          if (rowOrCol === 'Row') {
            cssSelector += `[id="nodeLabelRow${nodeID}"],`;
          }
        }
      } else {
        if (rowOrCol === 'Row') {
          cssSelector += `[id="attr${rowOrCol}${node}"],`;
        }
        cssSelector += `[id="topo${rowOrCol}${node}"],`;

        if (rowOrCol === 'Row') {
          cssSelector += `[id="nodeLabelRow${node}"],`;
        }
      }
    }
    // remove last comma
    cssSelector = cssSelector.substring(0, cssSelector.length - 1);

    if (cssSelector !== '') {
      d3.selectAll(cssSelector).classed(classToRender, true);
    }
  }

  /**
   * Old implementation to select the neighboring nodes.
   * @param  nodeID [description]
   * @return        [description]
   */
  private selectNeighborNodes(nodeID: string, neighbors: any): void {
    if (nodeID in this.columnSelectedNodes) {

      // find all neighbors and remove them
      this.columnSelectedNodes = this.columnSelectedNodes.filter((d: any) => d.id !== nodeID);
    } else {
      this.addHighlightNode(nodeID);
      const newElement = { [nodeID]: neighbors};
      this.columnSelectedNodes = Object.assign(this.columnSelectedNodes, newElement);
    }
    this.renderHighlightNodesFromDict(this.columnSelectedNodes, 'neighbor', 'Row');
  }

  /**
   * [sort description]
   * @return [description]
   */
  private sort(order: string): void {
    const nodeIDs = this.network.nodes.map((node: { id: any; }) => node.id);

    if (nodeIDs.includes(order)) {
      this.order = this.changeOrder(order, true);
    } else {
      this.order = this.changeOrder(order);
    }
    this.orderingScale.domain(this.order);

    const transitionTime = 500;

    d3.selectAll('#matrix g .row')
      .transition()
      .duration(transitionTime)
      .attr('transform', (d: any, i: number) => {
        if (i > this.order.length - 1) {
          return 'translate(0, 0)';
        } else {
          return `translate(0,${this.orderingScale(i)})`;
        }
      });

    this.attributeRows
      .transition()
      .duration(transitionTime)
      .attr('transform', (d: any, i: number) =>  `translate(0,${this.orderingScale(i)})`);

    // if any other method other than neighbors sort
    if (!nodeIDs.includes(order)) {
      const t = this.edges;
      t.selectAll('.column')
        .attr('transform', (d: any, i: number) => `translate(${this.orderingScale(i)},0)rotate(-90)`);
    }

    d3.selectAll('.sortIcon').style('fill', '#8B8B8B').filter((d) => d === order).style('fill', '#EBB769');
    if (!nodeIDs.includes(order)) {
      const cells = d3.selectAll('.cell')
        .attr('transform', (d: any, i: number) => {
          return `translate(${this.orderingScale(d.x)},0)`;
        });
    } else {
      d3.select(`[id="sortIcon${order}"]`).style('fill', '#EBB769');
    }
  }

  /**
   * [initializeAttributes description]
   * @return [description]
   */
  private initializeAttributes(): void {
    // let width = this.controller.visWidth * this.controller.attributeProportion;
    // this.edgeWidth + this.margins.left + this.margins.right;
    // let height = this.controller.visHeight;//this.edgeHeight + this.margins.top + this.margins.bottom;
    // this.attributeWidth = width - (this.margins.left + this.margins.right) //* this.controller.attributeProportion;
    // this.attributeHeight = height - (this.margins.top + this.margins.bottom)// * this.controller.attributeProportion;

    const attributeWidth = 1000; // Just has to be larger than the attributes panel (so that we render to the edge)

    this.attributes = d3.select('#attributes')
      .append('g')
      .attr('transform', `translate(0,${this.margins.top})`);

    // add zebras and highlight rows
    this.attributes.selectAll('.highlightRow')
      .data(this.network.nodes)
      .enter()
      .append('rect')
      .classed('highlightRow', true)
      .attr('x', 0)
      .attr('y', (d: any, i: number) => this.orderingScale(i))
      .attr('width', attributeWidth)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill', (d: any, i: number) => i % 2 === 0 ? '#fff' : '#eee');

    // Draw each row (translating the y coordinate)
    this.attributeRows = this.attributes
      .selectAll('.row')
      .data(this.network.nodes)
      .enter()
      .append('g')
      .attr('class', 'row')
      .attr('transform', (d: any, i: number) => `translate(0,${this.orderingScale(i)})`);

    this.attributeRows
      .append('line')
      .attr('x1', 0)
      .attr('x2', attributeWidth)
      .attr('stroke', '2px')
      .attr('stroke-opacity', 0.3);

    this.attributeRows
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .classed('attrRow', true)
      .attr('id', (d: any, i: number) => `attrRow${d.id}`)
      .attr('width', attributeWidth)
      .attr('height', this.orderingScale.bandwidth()) // end addition
      .attr('fill-opacity', 0)
      .attr('cursor', 'pointer')
      .on('mouseover', (d: any, i: number, nodes: any) => this.attributeMouseOver(d, i, nodes))
      .on('mouseout', (d: any) => this.attributeMouseOut(d))
      .on('click', (d: any, i: number) => {
        this.nodeClick(d);
        this.selectNeighborNodes(this.network.nodes[i].id, this.network.nodes[i].neighbors);
      });

    this.columnHeaders = this.attributes.append('g')
      .classed('column-headers', true);

    // Draw buttons for alternative sorts
    let initialY = -this.margins.left + 10;
    const buttonHeight = 15;
    const text = ['name', 'cluster', 'interacts'];
    const sortNames = ['shortName', 'clusterLeaf', 'edges'];
    const iconNames = ['alphabetical', 'categorical', 'quant'];
    for (let i = 0; i < 3; i++) {
      const button = this.edges.append('g')
        .attr('transform', `translate(${-this.margins.left},${initialY})`);
      button.attr('cursor', 'pointer');
      button.append('rect').attr('width', this.margins.left - 5).attr('height', buttonHeight).attr('fill', 'none').attr('stroke', 'gray').attr('stroke-width', 1);
      button.append('text').attr('x', 27).attr('y', 10).attr('font-size', 11).text(text[i]);
      const path = button.datum(sortNames[i]);
      path
        .append('path').attr('class', 'sortIcon').attr('d', (d: any) => {
          return this.icons[iconNames[i]].d;
        })
        .style('fill', () => sortNames[i] === this.orderType ? '#EBB769' : '#8B8B8B')
        .attr('transform', 'scale(0.1)translate(-195,-320)')
        .attr('cursor', 'pointer');
      button.on('click', () => this.sort(sortNames[i]));
      initialY += buttonHeight + 5;
    }
  }

  // function that updates the state, and includes a flag for when this was done through a search
 private nodeClick(node: {id: never}, search: boolean = false): void {
  const previousState = this.getApplicationState();
  let clicked = previousState.clicked;
  const wasSelected = this.isSelected(node);

  if (wasSelected) {
    clicked = clicked.filter((s: any) => s !== node.id);
  } else {
    clicked.push(node.id);
  }

  const label = search ?
    'Searched for Node' :
    wasSelected ?
    'Unselect Node' :
    'Select Node';

  const action = {
    label,
    action: () => {
      const currentState = this.getApplicationState();
      // Add time stamp to the state graph
      currentState.time = Date.now();
      // Add label describing what the event was
      currentState.event = label;
      // Update actual node data
      currentState.clicked = clicked;
      // If node was searched, push him to the search array
      // if (search) {
      //     currentState.search.push(node.id);
      // }
      return currentState;
    },
    args: [],
  };

  this.provenance.applyAction(action);
  }

  private isSelected(node: {id: never}): boolean {
    const currentState = this.getApplicationState();
    const clicked = currentState.clicked;
    return clicked.includes(node.id);
  }

  private attributeMouseOver(d: any, i: number, nodes: any): void {
    this.addHighlightNodesToDict(this.hoverRow, d.id, d.id);  // Add row (rowID)
    this.addHighlightNodesToDict(this.hoverCol, d.id, d.id);  // Add row (rowID)

    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.hoverCol, 'hovered', 'Col');

    this.showToolTip(d, i, nodes);
  }

  private attributeMouseOut(d: any): void {
    this.removeHighlightNodesFromDict(this.hoverRow, d.id, d.id);
    this.removeHighlightNodesFromDict(this.hoverCol, d.id, d.id);

    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.hoverCol, 'hovered', 'Col');

    this.hideToolTip();
  }

  private showToolTip(d: any, i: number, nodes: any): void {
    const matrix = nodes[i].getScreenCTM()
      .translate(+nodes[i].getAttribute('x'), + nodes[i].getAttribute('y'));

    const message = d.cellName !== undefined ? d.cellName : d.id;

    this.tooltip.html(message)
      .style('left', (window.pageXOffset + matrix.e - 45) + 'px')
      .style('top', (window.pageYOffset + matrix.f - 30) + 'px');

    this.tooltip.transition()
      .delay(100)
      .duration(200)
      .style('opacity', .9);
  }

  private hideToolTip(): void {
    this.tooltip.transition(25)
    .style('opacity', 0);
  }

  private sortObserver(type: string, isNode: boolean = false): number[] {
    let order;
    this.sortKey = type;
    if (type === 'clusterSpectral' || type === 'clusterBary' || type === 'clusterLeaf') {
      const links: any[] = Array(this.network.links.length);

      this.network.links.forEach((link: Link, index: number) => {
        links[index] = {
          source: this.network.nodes.find((node: Node) => node.id === link.source),
          target: this.network.nodes.find((node: Node) => node.id === link.target),
        };
      });

      const graph = reorder.graph()
        .nodes(this.network.nodes)
        .links(links)
        .init();

      if (type === 'clusterBary') {
        const barycenter = reorder.barycenter_order(graph);
        order = reorder.adjacent_exchange(graph, barycenter[0], barycenter[1])[1];
      } else if (type === 'clusterSpectral') {
        order = reorder.spectral_order(graph);
      } else if (type === 'clusterLeaf') {
        const mat = reorder.graph2mat(graph);
        order = reorder.optimal_leaf_order()(mat);
      }
    } else if (this.sortKey === 'edges') {
      order = d3
      .range(this.network.nodes.length)
      .sort((a, b) => this.network.nodes[b][type] - this.network.nodes[a][type]);
    } else if (isNode === true) {
      order = d3
      .range(this.network.nodes.length)
      .sort((a, b) => this.network.nodes[a].id.localeCompare(this.network.nodes[b].id));
      order = d3.range(this.network.nodes.length).sort((a, b) =>
        this.network.nodes[b].neighbors.includes(type) - this.network.nodes[a].neighbors.includes(type),
      );
    } else if (this.sortKey === 'shortName') {
      order = d3.range(this.network.nodes.length).sort((a, b) =>
        this.network.nodes[a].id.localeCompare(this.network.nodes[b].id),
      );
    } else {
      order = d3
      .range(this.network.nodes.length)
      .sort((a, b) => this.network.nodes[b][type] - this.network.nodes[a][type]);
    }
    this.order = order;
    return order;
  }

  /**
   * Initializes the provenance library and sets observers.
   * @return [none]
   */
  private setUpProvenance(): any {
    const initialState = {
      workerID: 1, // workerID is a global variable
      nodes: '', // array of nodes that keep track of their position, whether they were softSelect or hardSelected;
      search: '', // field to store the id of a searched node;
      startTime: Date.now(), // time this provenance graph was created and the task initialized;
      endTime: '', // time the submit button was pressed and the task ended;
      time: Date.now(), // timestamp for the current state of the graph;
      count: 0,
      clicked: [],
      sortKey: this.sortKey,
      selections: {
        attrRow: {},
        rowLabel: {},
        colLabel: {},
        neighborSelect: {},
        cellCol: {},
        cellRow: {},
        search: {},
        previousMouseOvers: [],
      },
    };

    const provenance = ProvenanceLibrary.initProvenance(initialState);
    this.provenance = provenance;

    const columnElements = ['topoCol'];
    const rowElements = ['topoRow', 'attrRow'];

    const elementNamesFromSelection: any = {
      cellCol: rowElements.concat(columnElements),
      colLabel: rowElements.concat(columnElements).concat(['colLabel']),
      rowLabel: rowElements.concat(columnElements).concat(['rowLabel']),
      attrRow: rowElements.concat(['rowLabel']),
      cellRow: rowElements.concat(columnElements),
      neighborSelect: rowElements,
      search: rowElements.concat(columnElements),
    };

    function classAllHighlights(state: any): void {

      const clickedElements = new Set();
      const neighborElements = new Set();

      for (const node of state.clicked) {
        clickedElements.add(`[id="colLabel${node}"]`);
        clickedElements.add(`[id="topoCol${node}"]`);
        clickedElements.add(`[id="topoRow${node}"]`);
        clickedElements.add(`[id="attrRow${node}"]`);
      }

      // go through each interacted element, and determine which rows/columns should
      // be highlighted due to it's interaction
      for (const selectionType in state.selections) {
        if (selectionType === 'previousMouseOvers') {
          continue;
        }
        for (const selectionElement of elementNamesFromSelection[selectionType]) {
          for (const node in state.selections[selectionType]) {
            if (selectionType === 'neighborSelect') {
              neighborElements.add(`[id="${selectionElement}${node}"]`);
            } else {
              // if both in attrRow and rowLabel, don't highlight element
              if (selectionType === 'attrRow' || selectionType === 'rowLabel') {
                if (node in state.selections.attrRow && node in state.selections.rowLabel) { continue; }
              }
              clickedElements.add(`[id="${selectionElement}${node}"]`);
            }
          }
        }
      }

      const clickedSelectorQuery = Array.from(clickedElements).join(',');
      if (clickedSelectorQuery !== '') {
        d3.selectAll(clickedSelectorQuery).classed('clicked', true);
      }
    }


    function setUpObservers(): any {
      const updateHighlights = (state: any) => {
        d3.selectAll('.clicked').classed('clicked', false);
        classAllHighlights(state);
      };

      // Updates individual cell highlighting
      const updateCellClicks = (state: any) => {
        let cellNames: any[] = [];

        // Go through each highlighted cell (both sides of matrix) and add cell to highlight
        Object.keys(state.selections.cellCol).map((key) => {
          const names = state.selections.cellCol[key];
          cellNames = cellNames.concat(names);
        });

        // Concat all the cells to highlight into one query
        const cellSelectorQuery = `[id="${cellNames.join('"],[id="')}"]`;

        // Set all cells to un-clicked
        d3.selectAll('.clickedCell').classed('clickedCell', false);

        // Highlight cells if we have any in our query, else do nothing
        if (cellSelectorQuery !== '[id=""]') {
          d3.selectAll(cellSelectorQuery).selectAll('.baseCell').classed('clickedCell', true);
        }
      };

      provenance.addObserver('selections.attrRow', updateHighlights);
      provenance.addObserver('selections.rowLabel', updateHighlights);
      provenance.addObserver('selections.colLabel', updateHighlights);
      provenance.addObserver('selections.cellCol', updateHighlights);
      provenance.addObserver('selections.cellRow', updateHighlights);
      provenance.addObserver('selections.neighborSelect', updateHighlights);
      provenance.addObserver('selections.cellCol', updateCellClicks);
      provenance.addObserver('selections.search', updateHighlights);
      provenance.addObserver('clicked', updateHighlights);
    }
    setUpObservers();
    return provenance;
  }

  /**
   * Initializes the matrix and fills it with link occurrences.
   * @return [description]
   */
  private processData(): void {
    this.network.nodes.forEach((rowNode: Node, i: number) => {
      this.matrix[i] = this.network.nodes.map((colNode: Node) => {
        return {
          cellName: `cell${rowNode.id}_${colNode.id}`,
          correspondingCell: `cell${colNode.id}_${rowNode.id}`,
          rowID: rowNode.id,
          colID: colNode.id,
          x: colNode.index,
          y: rowNode.index,
          z: 0,
        }; });
    });

    // Count occurrences of links and store it in the matrix
    this.network.links.forEach(
      (link: Link) => {
        this.matrix[this.idMap[link.source]][this.idMap[link.target]].z += 1;
        this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += 1;
      },
    );

    // find max value of z
    this.matrix.forEach(
      (row: Array<{z: number, [key: string]: any}>) => {
        row.forEach(
          (cell: {z: number, [key: string]: any}) => {
            if (cell.z > this.maxNumConnections) {
              this.maxNumConnections = cell.z;
            }
          });
      });
  }

  /**
   * returns an object containing the current provenance state.
   * @return [the provenance state]
   */
  private getApplicationState(): {
    workerID: number;
    nodes: string;
    search: string;
    startTime: number;
    endTime: string;
    time: number;
    event: string;
    count: number;
    clicked: never[];
    sortKey: string;
    selections: {
        attrRow: {},
        rowLabel: {},
        colLabel: {},
        neighborSelect: {},
        cellCol: {},
        cellRow: {},
        search: {},
        previousMouseOvers: [],
    };
  } {
    return this.provenance.graph().current.state;
  }

  private changeOrder(type: string, node: boolean = false): number[] {
    const action = this.generateSortAction(type);
    if (this.provenance) {
      this.provenance.applyAction(action);
    }
    return this.sortObserver(type, node);
  }

  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  private generateSortAction(sortKey: string): {label: string, action: any, args: any[]} {
    return {
      label: 'sort',
      action: (key: any) => {
        const currentState = this.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = 'sort';

        currentState.sortKey = key;
        if (this.mouseOverEvents !== undefined) {
          currentState.selections.previousMouseOvers = this.mouseOverEvents;
          this.mouseOverEvents.length = 0;
        }

        return currentState;
      },
      args: [sortKey],
    };
  }
}
