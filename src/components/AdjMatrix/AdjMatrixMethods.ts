/* The View displays the data given to it by the model. */
import { scaleBand, scaleLinear, scaleOrdinal, ScaleBand } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { select, selectAll } from 'd3-selection';
import { min, max, range } from 'd3-array';
import { axisTop } from 'd3-axis';
import * as ProvenanceLibrary from 'provenance-lib-core/lib/src/provenance-core/Provenance';
import 'science';
import 'reorder.js';
import { Dimensions, Link, Network, Node, Cell, State } from '@/types';

declare const reorder: any;

export class View {
  public visualizedAttributes: string[] = [];

  private network: Network;
  private icons: { [key: string]: { [d: string]: string}};
  private sortKey: string;
  private edges: any;
  private matrix: Cell[][];
  private edgeWidth: number = 0;
  private edgeHeight: number = 0;
  private attributeRows: any;
  private tooltip: any;
  private order: any;
  private margins: { left: number, top: number, right: number, bottom: number };
  private attributes: any;
  private orderingScale: ScaleBand<number> = scaleBand<number>();
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales!: { [key: string]: any };
  private nodeFontSize: string = '12';
  private columnHeaders: any;
  private attributeScales: { [key: string]: any } = {};
  private colMargin: number = 5;
  private provenance: any;
  private idMap: { [key: string]: number };
  private isMultiEdge: boolean;
  private orderType: any;
  private selectedNodesAndNeighbors: { [key: string]: string[] };
  private selectedElements: { [key: string]: string[] };
  private mouseOverEvents: any;
  private maxNumConnections: number = -Infinity;
  private matrixWidth: number;
  private matrixHeight: number;

  constructor(
    network: Network,
    visualizedAttributes: string[],
    matrixWidth: number,
    matrixHeight: number,
  ) {
    this.network = network;
    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };
    this.provenance = this.setUpProvenance();
    this.sortKey = 'name';
    this.matrix = [];
    this.idMap = {};
    this.isMultiEdge = false;
    this.selectedNodesAndNeighbors = {};
    this.selectedElements = {};
    this.visualizedAttributes = visualizedAttributes;
    this.matrixWidth = matrixWidth;
    this.matrixHeight = matrixHeight;

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

    // Kick off the rendering
    this.initializeEdges();
    this.initializeAttributes();
  }


  public updateAttributes(): void {
    // Set the column widths and margin
    const attrWidth = parseFloat(select('#attributes').attr('width'));
    const colWidth = attrWidth / this.visualizedAttributes.length - this.colMargin;

    // Update the column headers
    const columnHeaderGroups = this.columnHeaders
      .selectAll('text')
      .data(this.visualizedAttributes);

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
      .attr('x', (d: string, i: number) => (colWidth + this.colMargin) * i)
      .attr('width', colWidth)
      .on('click', (d: string) => this.sort(d));

    // Calculate the attribute scales
    this.visualizedAttributes.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        const minimum = min(this.network.nodes.map((node: Node) => node[col])) || '0';
        const maximum = max(this.network.nodes.map((node: Node) => node[col])) || '0';
        const domain = [parseFloat(minimum), parseFloat(maximum)];

        const scale = scaleLinear().domain(domain).range([0, colWidth]);
        scale.clamp(true);
        this.attributeScales[col] = scale;
      } else {
        const values: string[] = this.network.nodes.map((node: Node) => node[col]);
        const domain = [...new Set(values)];
        const scale = scaleOrdinal(schemeCategory10).domain(domain);

        this.attributeScales[col] = scale;
      }
    });

    selectAll('.attr-axis').remove();

    // Add the scale bar at the top of the attr column
    this.visualizedAttributes.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        const barScaleVis = this.attributes
          .append('g')
          .attr('class', 'attr-axis')
          .attr('transform', `translate(${(colWidth + this.colMargin) * index},-15)`)
          .call(axisTop(this.attributeScales[col])
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

    selectAll('.glyph').remove();
    /* Create data columns data */
    this.visualizedAttributes.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('height', this.orderingScale.bandwidth())
          .attr('width', (d: Node) => this.attributeScales[col](d[col]))
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0) // y is set by translate on the group
          .attr('fill', '#82b1ff')
          .attr('cursor', 'pointer')
          .on('mouseover', (d: Node) => this.hoverNode(d.id))
          .on('mouseout', (d: Node) => this.unHoverNode(d.id))
          .on('click', (d: Node) => {
            this.selectElement(d);
            this.selectNeighborNodes(d.id, d.neighbors);
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
          .attr('fill', (d: Node) => this.attributeScales[col](d[col]))
          .attr('cursor', 'pointer')
          .on('mouseover', (d: Node) => this.hoverNode(d.id))
          .on('mouseout', (d: Node) => this.unHoverNode(d.id))
          .on('click', (d: Node) => {
            this.selectElement(d);
            this.selectNeighborNodes(d.id, d.neighbors);
          });
      }
    });

    selectAll('.attrSortIcon').remove();

    // Add sort icons to the top of the header
    const path = this.columnHeaders
      .selectAll('path')
      .data(this.visualizedAttributes);

    path
      .enter()
      .append('path')
      .merge(path)
      .attr('class', `sortIcon attr attrSortIcon`)
      .attr('cursor', 'pointer')
      .attr('d', (d: string) => {
        const type = this.isQuantitative(d) ? 'quant' : 'categorical';
        return this.icons[type].d;
      })
      .attr('transform', (d: string, i: number) => `scale(0.1)translate(${(colWidth + this.colMargin) * i * 10 - 200}, -1100)`)
      .style('fill', '#8B8B8B')
      .on('click', (d: string) => this.sort(d));

  }


  private isQuantitative(varName: string): boolean {
    const uniqueValues = [...new Set(this.network.nodes.map((node: Node) => parseFloat(node[varName])))];
    return uniqueValues.length > 5;
  }


  /**
   * initializes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  private initializeEdges(): void {
    // Set width and height based upon the calculated layout size. Grab the smaller of the 2
    const sideLength = Math.min(this.matrixWidth, this.matrixHeight);

    // set the dimensions of a cell
    const cellSize = 11;

    // set the radius for cells
    const cellRadius = 2;

    // Use the smallest side as the length of the matrix
    this.edgeWidth = sideLength - (this.margins.left + this.margins.right);
    this.edgeHeight = sideLength - (this.margins.top + this.margins.bottom);

    // Creates scalable SVG
    this.edges = select('#matrix')
      .append('g')
      .attr('transform', `translate(${this.margins.left},${this.margins.top})`);

    // sets the vertical scale
    this.orderingScale = scaleBand<number>()
    .range([0, (this.network.nodes.length * cellSize)]).domain(range(0, this.network.nodes.length, 1));

    // creates column groupings
    this.edgeColumns = this.edges.selectAll('.column')
      .data(this.network.nodes)
      .enter().append('g')
      .attr('class', 'column')
      .attr('transform', (d: Node, i: number) => {
        return `translate(${this.orderingScale(i)})rotate(-90)`;
      });

    // Draw each row
    this.edgeRows = this.edges.selectAll('.rowContainer')
      .data(this.network.nodes)
      .enter()
      .append('g')
      .attr('class', 'rowContainer')
      .attr('transform', (d: Node, i: number) => {
        return `translate(0,${this.orderingScale(i)})`;
      });


    this.drawGridLines();

    // set the size of the highlight
    const matrixHighlight = this.network.nodes.length * cellSize;
    // add the highlight columns
    // this.edgeColumns
    //   .append('rect')
    //   .classed('topoCol', true)
    //   .attr('id', (d: Node) => `topoCol${d.id}`)
    //   .attr('x', -this.edgeHeight - this.margins.bottom)
    //   .attr('y', 0)
    //   .attr('width', this.edgeHeight + this.margins.bottom + this.margins.top)
    //   .attr('height', this.orderingScale.bandwidth())
    //   .attr('fill-opacity', 0);

    // added highlight rows
    this.edgeRows
      .append('rect')
      .classed('topoRow', true)
      .attr('id', (d: Node) => `topoRow${d.id}`)
      .attr('x', -this.margins.left)
      .attr('y', 0)
      .attr('width', matrixHighlight + this.margins.left + this.margins.right)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0);

    const cellColorScale = scaleLinear<string>()
      .domain([0, this.maxNumConnections])
      .range(['#feebe2', '#690000']); // TODO: colors here are arbitrary, change later

    this.edgeRows.selectAll('.cell')
      .data((d: Node, i: number) => this.matrix[i])
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('id', (d: Cell) => d.cellName)
      .attr('x', (d: Cell) => this.orderingScale(d.x))
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', cellRadius)
      .style('fill', (d: Cell) => cellColorScale(d.z))
      .style('fill-opacity', (d: Cell) => d.z)
      .on('mouseover', (d: Cell, i: number, nodes: any) => {
        this.showToolTip(d, i, nodes);
        this.hoverEdge(d);
      })
      .on('mouseout', (d: Cell) => {
        this.hideToolTip();
        this.unHoverEdge(d);
      })
      .on('click', this.selectElement)
      .attr('cursor', 'pointer');

    this.appendEdgeLabels();

    // Get tooltip
    this.tooltip = select('#tooltip');
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


  private hoverNode(nodeID: string): void {
    const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
    selectAll(cssSelector).classed('hovered', true);
  }


  private unHoverNode(nodeID: string): void {
    const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
    selectAll(cssSelector).classed('hovered', false);
  }


  private hoverEdge(cell: Cell): void {
    this.hoverNode(cell.rowID);
    this.hoverNode(cell.colID);
  }


  private unHoverEdge(cell: Cell): void {
    this.unHoverNode(cell.rowID);
    this.unHoverNode(cell.colID);
  }


  private selectElement(element: Cell | Node): void {
    let elementsToSelect: string[] = [];
    let newElement: { [key: string]: string[] };

    if (this.isCell(element)) {
      // Remove or add cell from selected cells
      if (element.cellName in this.selectedElements) {
        delete this.selectedElements[element.cellName];
      } else {
        // Get all the elements to be selected
        elementsToSelect = [
        `[id="attrRow${element.colID}"]`, `[id="topoRow${element.colID}"]`, `[id="topoCol${element.colID}"]`,
        `[id="colLabel${element.colID}"]`, `[id="rowLabel${element.colID}"]`,

        `[id="attrRow${element.rowID}"]`, `[id="topoRow${element.rowID}"]`, `[id="topoCol${element.rowID}"]`,
        `[id="colLabel${element.rowID}"]`, `[id="rowLabel${element.rowID}"]`,

        `[id="${element.cellName}"]`,
        ];
        newElement = { [element.cellName]: elementsToSelect};
        this.selectedElements = Object.assign(this.selectedElements, newElement);
      }
    } else {
      if (element.id in this.selectedElements) {
        delete this.selectedElements[element.id];
      } else {
        elementsToSelect = [
        `[id="attrRow${element.id}"]`, `[id="topoRow${element.id}"]`, `[id="topoCol${element.id}"]`,
        `[id="colLabel${element.id}"]`, `[id="rowLabel${element.id}"]`,
        ];
        newElement = { [element.id]: elementsToSelect};
        this.selectedElements = Object.assign(this.selectedElements, newElement);
      }
    }


    // Reset all nodes to not neighbor highlighted
    selectAll('.clicked')
      .classed('clicked', false);

    // Loop through the neighbor nodes to be highlighted and highlight them
    const selections: string[] = [];
    for (const elementID of Object.keys(this.selectedElements)) {
      for (const elementToSelect of this.selectedElements[elementID]) {
        selections.push(elementToSelect);
      }
    }

    if (selections.length > 0) {
      selectAll(selections.join(',')).classed('clicked', true);
    }
  }


  /**
   * Renders column labels and row labels to the matrix.
   * @return none
   */
  private appendEdgeLabels(): void {
    this.edgeRows.append('text')
      .attr('class', 'rowLabel')
      .attr('id', (d: Node) => `rowLabel${d.id}`)
      .attr('z-index', 30)
      .attr('x', -3)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .style('font-size', this.nodeFontSize.toString() + 'pt')
      .text((d: Node) => d._key)
      .on('mouseover', (d: Node) => this.hoverNode(d.id))
      .on('mouseout', (d: Node) => this.unHoverNode(d.id))
      .on('mouseover', (d: Node, i: number, nodes: any) => {
        this.showToolTip(d, i, nodes);
        this.hoverNode(d.id);
      })
      .on('mouseout', (d: Node) => {
        this.hideToolTip();
        this.unHoverNode(d.id);
      })
      .on('click', (d: Node) => {
        this.selectElement(d);
        this.selectNeighborNodes(d.id, d.neighbors);
      });

    let verticalOffset = 187.5;
    const horizontalOffset = (this.orderingScale.bandwidth() / 2 - 4.5) / 0.075;
    this.edgeColumns.append('path')
      .attr('id', (d: Node) => `sortIcon${d.id}`)
      .attr('class', 'sortIcon')
      .attr('d', this.icons.cellSort.d)
      .style('fill', (d: Node) => d === this.orderType ? '#EBB769' : '#8B8B8B')
      .attr('transform', `scale(0.075)translate(${verticalOffset},${horizontalOffset})rotate(90)`)
      .on('click', (d: Node) => {
        this.sort(d.id);
        const action = this.changeInteractionWrapper('neighborSelect');
        this.provenance.applyAction(action);
      })
      .attr('cursor', 'pointer')
      .on('mouseover', (d: Node, i: number, nodes: any) => {
        this.showToolTip(d, i, nodes);
        this.hoverNode(d.id);
      })
      .on('mouseout', (d: Node) => {
        this.hideToolTip();
        this.unHoverNode(d.id);
      });

    verticalOffset = verticalOffset * 0.075 + 5;


    this.edgeColumns.append('text')
      .attr('id', (d: Node) => `colLabel${d.id}`)
      .attr('class', 'colLabel')
      .attr('z-index', 30)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('x', verticalOffset)
      .attr('dy', '.32em')
      .attr('text-anchor', 'start')
      .style('font-size', this.nodeFontSize)
      .text((d: Node) => d._key)
      .on('click', (d: Node) => {
        this.selectElement(d);
        this.selectNeighborNodes(d.id, d.neighbors);
      })
      .on('mouseover', (d: Node, i: number, nodes: any) => {
        this.showToolTip(d, i, nodes);
        this.hoverNode(d.id);
      })
      .on('mouseout', (d: Node) => {
        this.hideToolTip();
        this.unHoverNode(d.id);
      });
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
  private changeInteractionWrapper(interactionType: string, cell?: Cell): any {
    return {
      label: interactionType,
      action: (interactID: string) => {
        const currentState = this.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = interactionType;
        const interactionName = interactionType; // cell, search, etc
        let interactedElement = interactionType;
        if (interactionName === 'cell' && cell !== undefined) {
          interactID = cell.colID;
          interactedElement = cell.cellName; // + cellData.rowID;

          this.changeInteraction(currentState, interactID, 'cellCol', interactedElement);
          this.changeInteraction(currentState, interactID, 'cellRow', interactedElement);
          if (cell.cellName !== cell.correspondingCell) {
            interactedElement = cell.correspondingCell; // + cellData.rowID;
            interactID = cell.rowID;

            this.changeInteraction(currentState, interactID, 'cellCol', interactedElement);
            this.changeInteraction(currentState, interactID, 'cellRow', interactedElement);
          }
          return currentState;

          // interactID = cellData.rowID;
          // interactionName = interactionName + 'row'
        } else if (interactionName === 'attrRow') {
          return interactionName;

        } else if (interactionName === 'neighborSelect') {
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
    state: State, nodeID: string,
    interaction: keyof State['selections'], interactionName: string = interaction,
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


  private selectNeighborNodes(nodeID: string, neighbors: string[]): void {
    // Remove or add node from column selected nodes
    if (nodeID in this.selectedNodesAndNeighbors) {
      delete this.selectedNodesAndNeighbors[nodeID];
    } else {
      const newElement = { [nodeID]: neighbors };
      this.selectedNodesAndNeighbors = Object.assign(this.selectedNodesAndNeighbors, newElement);
    }

    // Reset all nodes to not neighbor highlighted
    selectAll('.neighbor')
      .classed('neighbor', false);

    // Loop through the neighbor nodes to be highlighted and highlight them
    const selections: string[] = [];
    for (const node of Object.keys(this.selectedNodesAndNeighbors)) {
      for (const neighborNode of this.selectedNodesAndNeighbors[node]) {
        selections.push(`[id="attrRow${neighborNode}"]`);
        selections.push(`[id="topoRow${neighborNode}"]`);
        selections.push(`[id="nodeLabelRow${neighborNode}"]`);
      }
    }

    if (selections.length > 0) {
      selectAll(selections.join(',')).classed('neighbor', true);
    }
  }


  /**
   * [sort description]
   * @return [description]
   */
  private sort(order: string): void {
    const nodeIDs = this.network.nodes.map((node: Node) => node.id);

    this.order = this.changeOrder(order, nodeIDs.includes(order));
    this.orderingScale.domain(this.order);

    const transitionTime = 500;

    (selectAll('.rowContainer') as any)
      .transition()
      .duration(transitionTime)
      .attr('transform', (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`);

    (selectAll('.attrRowContainer') as any)
      .transition()
      .duration(transitionTime)
      .attr('transform', (d: Node, i: number) =>  `translate(0,${this.orderingScale(i)})`);

    // if any other method other than neighbors sort, sort the columns too
    if (!nodeIDs.includes(order)) {
      this.edges.selectAll('.column')
        .transition()
        .duration(transitionTime)
        .attr('transform', (d: any, i: number) => `translate(${this.orderingScale(i)},0)rotate(-90)`);

      (selectAll('.rowContainer') as any)
        .selectAll('.cell')
        .transition()
        .duration(transitionTime)
        .attr('x', (d: Node, i: number) => this.orderingScale(i));
    }

    selectAll('.sortIcon')
      .style('fill', '#8B8B8B')
      .filter((d: any) => d.id === order)
      .style('fill', '#EBB769');
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

    this.attributes = select('#attributes')
      .append('g')
      .attr('transform', `translate(0,${this.margins.top})`);

    // add zebras and highlight rows
    this.attributes.selectAll('.highlightRow')
      .data(this.network.nodes)
      .enter()
      .append('rect')
      .classed('highlightRow', true)
      .attr('x', 0)
      .attr('y', (d: Node, i: number) => this.orderingScale(i))
      .attr('width', attributeWidth)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill', (d: Node, i: number) => i % 2 === 0 ? '#fff' : '#eee');

    // Draw each row (translating the y coordinate)
    this.attributeRows = this.attributes
      .selectAll('.attrRowContainer')
      .data(this.network.nodes)
      .enter()
      .append('g')
      .attr('class', 'attrRowContainer')
      .attr('transform', (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`);

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
      .attr('id', (d: Node) => `attrRow${d.id}`)
      .attr('width', attributeWidth)
      .attr('height', this.orderingScale.bandwidth()) // end addition
      .attr('fill-opacity', 0)
      .attr('cursor', 'pointer')
      .on('mouseover', (d: Node, i: number, nodes: any) => {
        this.showToolTip(d, i, nodes);
        this.hoverNode(d.id);
      })
      .on('mouseout', (d: Node) => {
        this.hideToolTip();
        this.unHoverNode(d.id);
      })
      .on('click', (d: Node) => {
        this.selectElement(d);
        this.selectNeighborNodes(d.id, d.neighbors);
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


  private isSelected(node: Node): boolean {
    const currentState = this.getApplicationState();
    const clicked: string[] = currentState.clicked;
    return clicked.includes(node.id);
  }


  private showToolTip(d: Cell|Node, i: number, nodes: any): void {
    const matrix = nodes[i]
      .getScreenCTM()
      .translate(nodes[i].getAttribute('x'), nodes[i].getAttribute('y'));

    let message = '';

    if (this.isCell(d)) {
      // Get link source and target
      message = `
      Row ID: ${d.rowID} <br/>
      Col ID: ${d.colID} <br/>
      Number of edges: ${d.z}`;
    } else {
      // Get node id
      message = `ID: ${d.id}`;

      // Loop through other props to add to tooltip
      for (const key of Object.keys(d)) {
        if (!['_key', '_rev', 'id', 'neighbors'].includes(key)) {
          message += `<br/> ${this.capitalizeFirstLetter(key)}: ${d[key]}`;
        }
      }
    }

    this.tooltip.html(message);

    this.tooltip
      .style('left', `${window.pageXOffset + matrix.e}px`)
      .style('top', `${window.pageYOffset + matrix.f - this.tooltip.node().getBoundingClientRect().height}px`);

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

      const sortableNetwork = reorder.graph()
        .nodes(this.network.nodes)
        .links(links)
        .init();

      if (type === 'clusterBary') {
        const barycenter = reorder.barycenter_order(sortableNetwork);
        order = reorder.adjacent_exchange(sortableNetwork, barycenter[0], barycenter[1])[1];
      } else if (type === 'clusterSpectral') {
        order = reorder.spectral_order(sortableNetwork);
      } else if (type === 'clusterLeaf') {
        const mat = reorder.graph2mat(sortableNetwork);
        order = reorder.optimal_leaf_order()(mat);
      }
    } else if (this.sortKey === 'edges') {
      order = range(this.network.nodes.length)
      .sort((a, b) => this.network.nodes[b][type] - this.network.nodes[a][type]);
    } else if (isNode === true) {
      order = range(this.network.nodes.length)
      .sort((a, b) => this.network.nodes[a].id.localeCompare(this.network.nodes[b].id));
      order = range(this.network.nodes.length).sort((a, b) =>
        Number(this.network.nodes[b].neighbors.includes(type)) - Number(this.network.nodes[a].neighbors.includes(type)),
      );
    } else if (this.sortKey === 'shortName') {
      order = range(this.network.nodes.length).sort((a, b) =>
        this.network.nodes[a].id.localeCompare(this.network.nodes[b].id),
      );
    } else {
      order = range(this.network.nodes.length)
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
      },
    };

    const provenance = ProvenanceLibrary.initProvenance(initialState);
    this.provenance = provenance;

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
          cellName: `${rowNode.id}_${colNode.id}`,
          correspondingCell: `${colNode.id}_${rowNode.id}`,
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

    // Find max value of z
    this.matrix.forEach((row: Cell[]) => {
      row.forEach((cell: Cell) => {
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
  private getApplicationState(): State {
    return this.provenance.graph().current.state;
  }


  private changeOrder(type: string, node: boolean): number[] {
    const action = this.generateSortAction(type);
    this.provenance.applyAction(action);
    return this.sortObserver(type, node);
  }


  private generateSortAction(sortKey: string): { label: string, action: (key: string) => State, args: any[] } {
    return {
      label: 'sort',
      action: (key: string) => {
        const currentState = this.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = 'sort';

        currentState.sortKey = key;
        if (this.mouseOverEvents !== undefined) {
          this.mouseOverEvents.length = 0;
        }

        return currentState;
      },
      args: [sortKey],
    };
  }


  private isCell(element: any): element is Cell {
    return element.hasOwnProperty('cellName');
  }

  private capitalizeFirstLetter(word: string) {
    return word[0].toUpperCase() + word.slice(1);
  }
}
