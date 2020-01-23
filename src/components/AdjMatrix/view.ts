/* The View displays the data given to it by the model. */
import * as d3 from 'd3';

export class View {
  public controller: any;
  public selectedCells: any[] = [];

  private nodes: any;
  private edges: any;
  private matrix: any;
  private edgeWidth: number = 0;
  private edgeHeight: number = 0;
  private mouseoverEvents: any[];
  private clickFunction: any;
  private attributeScales: any;
  private columnWidths: any;
  private attributeRows: any;
  private tooltip: any;
  private columnScale: any;
  private order: any;
  private margins: { left: number, top: number, right: number, bottom: number };
  private attributes: any;
  private orderingScale: d3.ScaleBand<number> = d3.scaleBand<number>();
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales: any;
  private nodeFontSize: string = '12';
  private labelVar: string = '_key';
  private datumID: string = '';

  constructor() {
    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };
    this.mouseoverEvents = [];

    this.clickFunction = (d: any, i: number, nodes: any[]) => {
      const nodeID = d.id;
      const interaction = this.sanitizeInteraction(d3.select(nodes[i]).attr('class'));
      const action = this.changeInteractionWrapper(nodeID, nodes[i], interaction);
      this.controller.model.provenance.applyAction(action);
    };
  }

  /**
   * Changes the input string by any conflicting class names given to the
   * elements that were interacted with.
   * @param  interaction class of the interacted element
   * @return             string - elements class name with no style classes
   */
  public sanitizeInteraction(interaction: string) {
    interaction = interaction.replace(' hoveredCell', '');
    interaction = interaction.replace(' hovered', '');
    interaction = interaction.replace(' clicked', '');
    interaction = interaction.replace(' neighbor', '');
    return interaction;
  }

  // Update method for all non-data aspects
  public updateVis() {
    // Get the row and column labels
    let rows = d3.selectAll('.rowLabel');
    let columns = d3.selectAll('.colLabel');

    // Update font size
    rows = rows.style('font-size', this.nodeFontSize + 'pt');
    columns = columns.style('font-size', this.nodeFontSize + 'pt');

    // Update labels
    rows.text((d, i) => this.nodes[i][this.labelVar]);
    columns.text((d, i) => this.nodes[i][this.labelVar]);
  }

  /**
   * Takes in the data, and initializes visualization.
   * @param  data [description]
   * @return      [description]
   */
  public loadData(nodes: any, edges: any, matrix: any) {
    this.nodes = nodes;
    this.edges = edges;
    this.matrix = matrix;

    this.renderView();
  }

  /**
   * Initializes the adjacency matrix and row views with placeholder visualizations
   * @return none
   */
  public renderView() {
    this.initializeEdges();
    this.initializeAttributes();
  }

  /**
   * [selectHighlight description]
   * @param  nodeToSelect    the
   * @param  rowOrCol        String, "Row" or "Col"
   * @param  selectAttribute Boolean of to select attribute or topology highlight
   * @return                 [description]
   */
  public selectHighlight(nodeToSelect: any, rowOrCol: string, attrOrTopo: string = 'Attr', orientation: string = 'x') {
    const selection = d3.selectAll('.' + attrOrTopo + rowOrCol)
      .filter((d: any, i: number) => {
        if (attrOrTopo === 'Attr' && d.index === null) {
          // attr
          return nodeToSelect.index === d[i][orientation];
        }
        // topology
        return nodeToSelect.index === d.index;
      });
    return selection;
  }

  /**
   * initializes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  private initializeEdges() {
    // Set width and height based upon the calculated layout size. Grab the smaller of the 2
    const width = this.controller.visDimensions.width;
    const height = this.controller.visDimensions.height;
    const sideLength = width < height ? width : height;

    // Use the smallest side as the length of the matrix
    this.edgeWidth = sideLength - (this.margins.left + this.margins.right);
    this.edgeHeight = sideLength - (this.margins.top + this.margins.bottom);

    // Creates scalable SVG
    this.edges = d3.select('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height + '')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .append('g')
      .classed('svg-content', true)
      .attr('id', 'edgeMargin')
      .attr('transform', 'translate(' + this.margins.left + ',' + this.margins.top + ')');

    // sets the vertical scale
    this.orderingScale = d3.scaleBand<number>().range([0, this.edgeHeight]).domain(d3.range(this.nodes.length));

    // creates column groupings
    this.edgeColumns = this.edges.selectAll('.column')
      .data(this.matrix)
      .enter().append('g')
      .attr('class', 'column')
      .attr('transform', (d: any, i: number) => {
        return 'translate(' + this.orderingScale(i) + ')rotate(-90)';
      });

    // Draw each row
    this.edgeRows = this.edges.selectAll('.row')
      .data(this.matrix)
      .enter().append('g')
      .attr('class', 'row')
      .attr('transform', (d: any, i: number) => {
        return 'translate(0,' + this.orderingScale(i) + ')';
      });


    this.drawGridLines();
    this.drawHighlightElements();


    this.edgeScales = this.generateEdgeScales();


    this.generateColorLegend();

    const cells = this.edgeRows.selectAll('.cell')
      .data((d: any) => d)
      .enter().append('g')
      .attr('class', 'cell')
      .attr('id', (d: any) => d.cellName)
      .attr('transform', (d: any) => 'translate(' + this.orderingScale(d.x) + ',0)');

    cells
      .append('rect')
      .classed('baseCell', true)
      .attr('x', 0)
      .attr('height', this.orderingScale.bandwidth())
      .attr('width', this.orderingScale.bandwidth());

    // render edges
    // this.controller.adjMatrix.edgeBars ? this.drawEdgeBars(cells) :
    this.drawFullSquares(cells);

    cells
      .on('mouseover', (cell: any, i: number, nodes: any) => {
        this.showEdgeTooltip(cell, i, nodes);
        this.hoverEdge(cell);
      })
      .on('mouseout', (cell: any) => {
        this.tooltip.transition(25)
          .style('opacity', 0);

        this.unhoverEdge(cell);
      })
      .on('click', (d: any, i: number, nodes: any) => {
        // only trigger click if edge exists
        this.clickFunction(d, i, nodes);

      })
      .attr('cursor', 'pointer');

    this.controller.hoverRow = {};
    this.controller.hoverCol = {};

    // this.order = this.controller.getOrder();

    this.appendEdgeLabels();

    // add tooltip
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  private drawHighlightElements() {
    // add the highlight rows
    this.edgeColumns
      .append('rect')
      .classed('topoCol', true)
      .attr('id', (d: any, i: number) => {
        return 'topoCol' + d[i].colid;
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
        return 'topoRow' + d[i].rowid;
      })
      .attr('x', -this.margins.left)
      .attr('y', 0)
      .attr('width', this.edgeWidth + this.margins.right + this.margins.left)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0);
  }

  /**
   * Draws the nested edge bars
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  private drawEdgeBars(cells: any) {
    // bind squares to cells for the mouse over effect
    const dividers = this.controller.isMultiEdge ? 2 : 1;

    // let squares = cells
    let offset = 0;
    let squareSize = this.orderingScale.bandwidth() - 2 * offset;

    for (let index = 0; index < dividers; index++) {

      const type = this.controller.isMultiEdge ? this.controller.attributeScales.edge.type.domain[index] : 'interacted';

      cells
        .append('rect')
        .classed('nestedEdges nestedEdges' + type, true)
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
   * Function to render the matrix edges as full squares
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  private drawFullSquares(cells: any) {
    const squares = cells
      .append('rect')
      .attr('x', 0)// d => this.orderingScale(d.x))
      // .filter(d=>{return d.item >0})
      .attr('width', this.orderingScale.bandwidth())
      .attr('height', this.orderingScale.bandwidth());
      // .style("fill", 'white')

    squares
      .filter((d: any) => d.z === 0)
      .style('fill-opacity', (d: { z: any; }) => d.z);

  }

  /**
   * Renders a tool tip over the provided cell node
   * @param  cell  Data element corresponding to the cell
   * @param  i     Index of that
   * @param  nodes The node elements of the d3 selection
   * @return       none
   */
  private showEdgeTooltip(cell: any, i: number, nodes: any) {
    const matrix = nodes[i].getScreenCTM()
      .translate(+nodes[i].getAttribute('x'), + nodes[i].getAttribute('y'));

    // let interactedMessage = cell.interacted > 0 ? cell.interacted.toString() + " interactions" : '';//
    // if (cell.interacted === 1) {
    //   interactedMessage = interactedMessage.substring(0, interactedMessage.length - 1)
    // }
    // let retweetMessage = cell.retweet > 0 ? cell.retweet.toString() + " retweets" : '';//
    // if (cell.retweet === 1) {
    //   retweetMessage = retweetMessage.substring(0, retweetMessage.length - 1)
    // }
    // let mentionsMessage = cell.mentions > 0 ? cell.mentions.toString() + " mentions" : '';//
    // if (cell.mentions === 1) {
    //   mentionsMessage = mentionsMessage.substring(0, mentionsMessage.length - 1)
    // }

    const message = nodes[i].id;
    // [interactedMessage, retweetMessage, mentionsMessage].filter(Boolean).join("</br>");
    // retweetMessage+'</br>'+mentionsMessage

    if (message !== '') {
      const yOffset = /*(retweetMessage !== '' && mentionsMessage !== '') ? 45 :*/ 30;
      this.tooltip.html(message)
        .style('left', (window.pageXOffset + matrix.e - 45) + 'px')
        .style('top', (window.pageYOffset + matrix.f - yOffset) + 'px');

      this.tooltip.transition()
        .delay(100)
        .duration(200)
        .style('opacity', .9);
    }
  }

  /**
   * Renders hover interactions and logs interaction in mouseoverEvents.
   * @param  cell d3 datum corresponding to cell's data
   * @return      none
   */
  private hoverEdge(cell: any) {
    const cellIDs = [cell.cellName, cell.correspondingCell];

    this.selectedCells = cellIDs;
    this.selectedCells.map((elementID: string) => {
      d3.selectAll(`[id="${elementID}"]`).selectAll('.baseCell').classed('hoveredCell', true);
    });
    const cellID = cellIDs[0];

    this.addHighlightNodesToDict(this.controller.hoverRow, cell.rowid, cellID);  // Add row (rowid)

    if (cell.colid !== cell.rowid) {
      this.addHighlightNodesToDict(this.controller.hoverRow, cell.colid, cellID);  // Add row (colid)
      this.addHighlightNodesToDict(this.controller.hoverCol, cell.rowid, cellID);  // Add col (rowid)
    }

    // add mouseover events
    this.mouseoverEvents.push({ time: new Date().getTime(), event: cellID });

    this.addHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
  }

  /**
   * Removes interaction highlight from a cell mouseover
   * @param  cell d3 datum element corresponding to the cell's data
   * @return      none
   */
  private unhoverEdge(cell: { cellName: any; rowid: any; colid: any; }) {
    d3.selectAll('.hoveredCell').classed('hoveredCell', false);

    this.selectedCells = [];

    const cellID = cell.cellName;
    this.removeHighlightNodesToDict(this.controller.hoverRow, cell.rowid, cellID);  // Add row (rowid)
    if (cell.colid !== cell.rowid) {
      this.removeHighlightNodesToDict(this.controller.hoverRow, cell.colid, cellID);
      this.removeHighlightNodesToDict(this.controller.hoverCol, cell.rowid, cellID);  // Add col (rowid)
    }
    // Add row (colid)
    this.removeHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
    d3.selectAll('.hovered').classed('hovered', false);
  }
  /**
   * Renders column labels and row labels to the matrix.
   * @return none
   */
  private appendEdgeLabels() {
    this.edgeRows.append('text')
      .attr('class', 'rowLabel')
      .attr('id', (d: { [x: string]: { rowid: string; }; }, i: string | number) => {
        return 'rowLabel' + d[i].rowid;
      })
      .attr('z-index', 30)
      .attr('x', -3)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .style('font-size', this.nodeFontSize.toString() + 'pt')
      .text((d: any, i: string | number) => this.nodes[i]._key)
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('click', (d: any) => {
        // d3.select(nodes[i]).classed('clicked',!d3.select(nodes[i]).classed('clicked'))
        this.nodeClick(d);
      });

    let verticalOffset = 3;
    verticalOffset = 187.5;
    const horizontalOffset = this.nodes.length < 50 ? 540 : 0;
    this.edgeColumns.append('path')
      .attr('id', (d: Array<{ rowid: string; }>) => 'sortIcon' + d[0].rowid)
      .attr('class', 'sortIcon')
      .attr('d', this.controller.model.icons.cellSort.d)
      .style('fill', (d: any) => d === this.controller.model.orderType ? '#EBB769' : '#8B8B8B')
      .attr('transform', 'scale(0.075)translate(' + (verticalOffset) + ',' + (horizontalOffset) + ')rotate(90)')
      .on('click', (d: Array<{ rowid: any; }>, i: number, nodes: any[]) => {
        this.sort(d[0].rowid);
        const action = this.changeInteractionWrapper(null, nodes[i], 'neighborSelect');
        this.controller.model.provenance.applyAction(action);
      })
      .attr('cursor', 'pointer')
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); });

    verticalOffset = verticalOffset / 12.5 + 3;


    this.edgeColumns.append('text')
      .attr('id', (d: { [x: string]: { rowid: string; }; }, i: string | number) => {
        return 'colLabel' + d[i].rowid;
      })
      .attr('class', 'colLabel')
      .attr('z-index', 30)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('x', verticalOffset)
      .attr('dy', '.32em')
      .attr('text-anchor', 'start')
      .style('font-size', this.nodeFontSize)
      .text((d: any, i: string | number) => this.nodes[i]._key)
      .on('click', (d: any, i: string | number) => {
        this.nodeClick(d);
        this.selectNeighborNodes(this.nodes[i].id, this.nodes[i].neighbors);
      })
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); });
  }
  /**
   * renders the relevent highlights for mousing over a label. Logs the interaction
   * in mouseoverEvents.
   * @param  data  d3 data element
   * @param  i     d3 index
   * @param  nodes d3 nodes
   * @return       none
   */

  private mouseOverLabel(data: Array<{ rowid: any; }>, i: string | number, nodes: { [x: string]: any; }) {

    const elementID = data[0].rowid;
    const flag = this.addHighlightNodesToDict(this.controller.hoverRow, elementID, elementID);
    this.addHighlightNodesToDict(this.controller.hoverCol, elementID, elementID);

    // add interaction to mouseover events
    if (flag) {
      this.mouseoverEvents.push({ time: new Date().getTime(), event: d3.select(nodes[i]).attr('id') });
    }

    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
  }

  /**
   * Generates the edge scales for the topology matrix
   * @return An object where keys are strings of types and values are d3 scales
   */
  private generateEdgeScales() {
    const edgeScales = {};
    // this.controller.attributeScales.edge.type.domain.forEach(type => {
    //   // calculate the max
    //   let extent = [0, this.controller.attributeScales.edge.count.domain[1]];
    //   //model.maxTracker[type]]
    //   // set up scale
    //   let typeIndex = this.controller.attributeScales.edge.type.domain.indexOf(type);

    //   //let scale = d3.scaleLinear().domain(extent)
    // .range(["white", this.controller.attributeScales.edge.type.range[typeIndex]]);
    //   //let otherColors = ['#064B6E', '#4F0664', '#000000']

    //   let scale = d3.scaleSqrt().domain(extent)
    // .range("white", this.controller.attributeScales.edge.type.range[typeIndex]);

    //   scale.clamp(true);
    //   // store scales
    //   edgeScales[type] = scale;
    // });
    // return edgeScales;
  }

  /**
   * Draws the grid lines for the adjacency matrix.
   * @return none
   */
  private drawGridLines() {
    const gridLines = this.edges
      .append('g')
      .attr('class', 'gridLines');
    const lines = gridLines
      .selectAll('line')
      .data(this.matrix)
      .enter();

    lines.append('line')
      .attr('transform', (d: any, i: number) => {
        return 'translate(' + this.orderingScale(i) + ',' + '0' + ')rotate(-90)';
      })
      .attr('x1', -this.edgeWidth);
    /*.attr("stroke-width", 5)
    .attr('stroke','red')*/

    lines.append('line')
      .attr('transform', (d: any, i: number) => {
        return 'translate(0,' + this.orderingScale(i) + ')';
      })
      .attr('x2', this.edgeWidth + this.margins.right);
    // .attr("stroke-width", 2)
    // .attr('stroke','blue')

    const one = gridLines
      .append('line')
      .attr('x1', this.edgeWidth)
      .attr('x2', this.edgeWidth)
      .attr('y1', 0)
      .attr('y2', this.edgeHeight + this.margins.bottom)
      .style('stroke', '#aaa')
      .style('opacity', 0.3);

    const two = gridLines
      .append('line')
      .attr('x1', 0)
      .attr('x2', this.edgeWidth)
      .attr('y1', this.edgeHeight + this.margins.bottom)
      .attr('y2', this.edgeHeight + this.margins.bottom)
      .style('stroke', '#aaa')
      .style('opacity', 0.3);

  }

  /**
   * Renders the highlight rows and columns for the adjacency matrix.
   * @return [description]
   */



  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  private changeInteractionWrapper(nodeID: any, node: any, interactionType: any) {
    return {
      label: interactionType,
      action: (interactID: string) => {
        const currentState = this.controller.model.getApplicationState();
          // currentState.selections.previousMouseovers = this.mouseoverEvents;
        this.mouseoverEvents.length = 0;
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = interactionType;
        const interactionName = interactionType; // cell, search, etc
        let interactedElement = interactionType;
        if (interactionName === 'cell') {
          const cellData: any = d3.select(node).data()[0]; //
          interactID = cellData.colid;
          interactedElement = cellData.cellName; // + cellData.rowid;

          this.changeInteraction(currentState, interactID, interactionName + 'col', interactedElement);
          this.changeInteraction(currentState, interactID, interactionName + 'row', interactedElement);
          if (cellData.cellName !== cellData.correspondingCell) {
            interactedElement = cellData.correspondingCell; // + cellData.rowid;
            interactID = cellData.rowid;

            this.changeInteraction(currentState, interactID, interactionName + 'col', interactedElement);
            this.changeInteraction(currentState, interactID, interactionName + 'row', interactedElement);
          }
          return currentState;

          // interactID = cellData.rowid;
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
    state: { selections: { [x: string]: { [x: string]: string[]; }; }; },
    nodeID: string, interaction: string, interactionName: string = interaction,
  ) {
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

  private linspace(startValue: number, stopValue: number, cardinality: number) {
    const arr = [];
    const step = (stopValue - startValue) / (cardinality - 1);
    for (let i = 0; i < cardinality; i++) {
      arr.push(startValue + (step * i));
    }
    return arr;
  }

  private generateScaleLegend(type: string, numberOfEdge: number) {
    let yOffset = 10;
    let xOffset = 10;

    if (this.controller.adjMatrix.edgeBars && this.controller.isMultiEdge) {
      let legendFile = 'assets/adj-matrix/';
      legendFile += this.controller.isMultiEdge ? 'nestedSquaresLegend' : 'edgeBarsLegendSingleEdge';
      legendFile += '.png';
      d3.select('#legend-svg').append('g').append('svg:image')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 90)
        .attr('height', 120)
        .attr('xlink:href', legendFile);
      // return;
      xOffset = 100;
    }

    const rectWidth = 18;
    const rectHeight = 10;
    const legendWidth = 175;
    const legendHeight = 60;
    yOffset += legendHeight * numberOfEdge;

    const scale = this.edgeScales[type];
    const extent = scale.domain();
    const placeholder = 5;

    const sampleNumbers = [0, 1, 3, 5]; // this.linspace(extent[0], extent[1], number);

    const svg = d3.select('#legend-svg').append('g')
      .attr('id', 'legendLinear' + type)
      .attr('transform', (d, i) => 'translate(' + xOffset + ',' + yOffset + ')')
      .on('click', (d) => {
        if (this.controller.adjMatrix.selectEdgeType === true) { //
          const edgeType = this.controller.state.adjMatrix.selectedEdgeType === type ? 'all' : type;
          this.controller.state.adjMatrix.selectedEdgeType = edgeType;
          if (edgeType === 'all') {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
          } else {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
            d3.selectAll('#legendLinear' + type).select('.edgeLegendBorder').classed('selectedEdgeType', true);

          }
        }
      });
    const boxWidth = (placeholder + 1) * rectWidth + 15;

    svg.append('rect')
      .classed('edgeLegendBorder', true)
      .attr('stroke', 'gray')
      .attr('stroke-width', 1)
      .attr('width', boxWidth)
      .attr('height', 55)
      .attr('fill-opacity', 0)
      .attr('x', 0)
      .attr('y', -9)
      .attr('ry', 2)
      .attr('rx', 2);

    let pluralType = type;

    if (pluralType === 'retweet') {
      pluralType = 'retweets';
    } else if (pluralType === 'interacted') {
      pluralType = 'interactions';
    }

    svg.append('text')
      .attr('x', boxWidth / 2)
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .text('# of ' + pluralType);
    const sideMargin = ((boxWidth) - (sampleNumbers.length * (rectWidth + 5))) / 2;

    const groups = svg.selectAll('g')
      .data(sampleNumbers)
      .enter()
      .append('g')
      .attr('transform', (d, i) => 'translate(' + (sideMargin + i * (rectWidth + 5)) + ',' + 15 + ')');

    groups
      .append('rect')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', (d) => {
        return scale(d);
      })
      .attr('stroke', (d) => {
        return d === 0 ? '#bbb' : 'white';
      });

    groups
      .append('text')
      .attr('x', rectWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        return Math.round(d);
      });




  }

  private generateColorLegend() {
    let counter = 0;
    for (const type in this.edgeScales) {
      if (this.controller.isMultiEdge) {
        if (type === 'interacted') {
          continue;
        }
        this.generateScaleLegend(type, counter);
        counter += 1;

      } else {
        if (type !== 'interacted') {
          continue;
        }
        this.generateScaleLegend(type, counter);
      }
    }
  }

  /**
   * [selectRow description]
   * @param  node [description]
   * @return      [description]
   */
  private classHighlights(nodeID: string, rowOrCol: string = 'Row', className: string) {
    // select attr and topo highlight
    d3.selectAll('Attr' + rowOrCol + nodeID + ',' + 'Topo' + rowOrCol + nodeID)
      .classed(className, true);
    // d3.selectAll('#highlight' + 'Topo' + rowOrCol + nodeID)
    //  .classed(className, true);*

    // highlight row text
    // d3.selectAll('')rowOrCol
    // else highlight column text

  }








  /**
   * [highlightRow description]
   * @param  node [description]
   * @return      [description]
   */
  /*highlightRow(node) {
    let nodeID = node[this.datumID];
    if (nodeID === null) {
      nodeID = node.rowid;
    }
    // highlight attr
    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, 'topo');
  }

  highlightRowAndCol(node) {
    let nodeID = node.screen_name;
    if (node.screen_name === null) {
      nodeID = node.colid;
    }

    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, '', 'Col');
  }

  highlightNode(nodeID: string, attrOrTopo: string, rowOrCol: string = 'Row') {
    d3.selectAll('.' + attrOrTopo + rowOrCol + nodeID)
      .classed('hovered', true);
  }*/



  // u: BCC    BCCINVITADOS2019
  // p:

  // private selectedNodes : any;
  // DOESNT GET ADDED
  private addHighlightNode(addingNode: string) {
    // if node is in
    const nodeIndex = this.nodes.findIndex((item: { [x: string]: string; }, i: any) => {
      return item.id === addingNode;
    });

    for (let i = 0; i < this.matrix[0].length; i++) {
      if (true /*this.matrix[i][nodeIndex].z > 0*/) {
        const nodeID = this.matrix[i][nodeIndex].rowid;
        if (
          this.controller.highlightedNodes.hasOwnProperty(nodeID) &&
          !this.controller.highlightedNodes[nodeID].includes(addingNode)
        ) {
          // if array exists, add it
          this.controller.highlightedNodes[nodeID].push(addingNode);
        } else {
          // if array non exist, create it and add node
          this.controller.highlightedNodes[nodeID] = [addingNode];
        }
      }
    }
  }

  private nodeDictContainsPair(
    dict: { [x: string]: { add: (arg0: any) => any, has: (arg0: any) => any; }; },
    nodeToHighlight: string, interactedElement: any,
  ) {
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
  ) {
    // if node already in highlight, remove it
    if (this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      this.removeHighlightNodesToDict(dict, nodeToHighlight, interactedElement);
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

  private removeHighlightNodesToDict(
    dict: { [x: string]: any; }, nodeToHighlight: string, interactedElement: any,
  ) {
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

  private renderHighlightNodesFromDict(dict: { [x: string]: any; }, classToRender: string, rowOrCol: string = 'Row') {
    // unhighlight all other nodes
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
    if (cssSelector === '') {
      return;
    }
    d3.selectAll(cssSelector).classed(classToRender, true);
  }

  private selectNode(nodeID: string) {
    const index = this.controller.state.selectedNodes.indexOf(nodeID);

    if (index > -1) {
      this.controller.state.selectedNodes.splice(index, 1);
    } else {
      this.controller.state.selectedNodes.push(nodeID);
    }

    const attrRow = d3.selectAll('attr' + 'Row' + nodeID);
    attrRow
      .classed('selected', !attrRow.classed('selected'));

    const topoRow = d3.selectAll('topo' + 'Row' + nodeID);
    topoRow
      .classed('selected', !topoRow.classed('selected'));
  }

  /**
   * Old implementation to select the neighboring nodes.
   * @param  nodeID [description]
   * @return        [description]
   */
  private selectNeighborNodes(nodeID: string, neighbors: any) {
    if (nodeID in this.controller.columnSelectedNodes) {

      // find all neighbors and remove them
      delete this.controller.columnSelectedNodes[nodeID];
    } else {
      this.addHighlightNode(nodeID);
      const newElement = { [nodeID]: neighbors};
      this.controller.columnSelectedNodes = Object.assign(this.controller.columnSelectedNodes, newElement);
    }
    this.renderHighlightNodesFromDict(this.controller.columnSelectedNodes, 'neighbor', 'Row');
    /*let index = this.controller.state.selectedNodes.indexOf(nodeID);

    if(index > -1){ // if in selected node, remove it (unless it is )
      this.controller.state.selectedNodes.splice(index,1);
      //find all partner nodes
      // if still exists keep,
    } else {
      // add node
      this.controller.state.selectedNodes.push(nodeID);

    }

    let attrRow = d3.selectAll('#highlight'+'Attr'+'Row'+nodeID);
    attrRow
      .classed('selected',(d)=>{
        // need to remove if clicked, but not if clicked from another node
        // store hashmap with counts
        // iterate through each time a click and change values
        // if lengths > 0

        // Add all elements to set
        // at each click, readd and remove all

        // if already selected, remove  and uncolor nodes
        // if not, add and color nodes



        return !
      });//!attrRow.classed('selected')


    let topoRow = d3.selectAll('#highlight'+'Topo'+'Row'+nodeID);
    topoRow
        .classed('selected',!topoRow.classed('selected'));


        */
  }


  /**
   * [sort description]
   * @return [description]
   */
  private sort(order: unknown) {
    const nodeIDs = this.nodes.map((node: { id: any; }) => node.id);

    if (nodeIDs.includes(order)) {
      this.order = this.controller.changeOrder(order, true);
    } else {
      this.order = this.controller.changeOrder(order);
    }
    this.orderingScale.domain(this.order);


    const transitionTime = 500;

    d3.selectAll('g .row')
      .transition()
      .duration(transitionTime)
      // .delay((d, i) =>  this.orderingScale(i))
      .attr('transform', (d: any, i: number) => {
        if (i > this.order.length - 1) {
          return'translate(0, 0)';
        } else {
          return 'translate(0,' + this.orderingScale(i) + ')';
        }
      });



    // TODO: Fix this when we add the adjacent attributes
    // this.attributeRows
    //   //.transition()
    //   //.duration(transitionTime)
    //   //.delay((d, i) => { return this.orderingScale(i) * 4; })
    //   .attr("transform", (d, i) => { return "translate(0," + this.orderingScale(i) + ")"; })

    // update each highlightRowsIndex


    // if any other method other than neighbors sort
    if (!nodeIDs.includes(order)) {
      const t = this.edges;
      t.selectAll('.column')
        .attr('transform', (d: any, i: number) => 'translate(' + this.orderingScale(i) + ',0)rotate(-90)');
    }

    d3.selectAll('.sortIcon').style('fill', '#8B8B8B').filter((d) => d === order).style('fill', '#EBB769');
    if (!nodeIDs.includes(order)) {
      const cells = d3.selectAll('.cell')
        .attr('transform', (d: any, i: number) => {
          return 'translate(' + this.orderingScale(d.x) + ',0)';
        });
    } else {
      d3.select(`[id="sortIcon${order}"]`).style('fill', '#EBB769');
    }

  }


  /**
   * [initializeAttributes description]
   * @return [description]
   */
  private initializeAttributes() {
    // let width = this.controller.visWidth * this.controller.attributeProportion;
    // this.edgeWidth + this.margins.left + this.margins.right;
    // let height = this.controller.visHeight;//this.edgeHeight + this.margins.top + this.margins.bottom;
    // this.attributeWidth = width - (this.margins.left + this.margins.right) //* this.controller.attributeProportion;
    // this.attributeHeight = height - (this.margins.top + this.margins.bottom)// * this.controller.attributeProportion;

    // this.attributes = d3.select('#attributes').append("svg")
    //   .attr("viewBox", "0 0 " + (width) + " " + height + "")
    //   .attr("preserveAspectRatio", "xMinYMin meet")
    //   .append("g")
    //   .classed("svg-content", true)
    //   .attr('id', 'attributeMargin')
    //   .attr("transform", "translate(" + 0 + "," + this.margins.top + ")");


    // // add zebras and highlight rows
    // /*
    // this.attributes.selectAll('.highlightRow')
    //   .data(this.nodes)
    //   .enter()
    //   .append('rect')
    //   .classed('highlightRow', true)
    //   .attr('x', 0)
    //   .attr('y', (d, i) => this.orderingScale(i))
    //   .attr('width', this.attributeWidth)
    //   .attr('height', this.orderingScale.bandwidth())
    //   .attr('fill', (d, i) => { return i % 2 === 0 ? "#fff" : "#eee" })
    //   */

    // let barMargin = { top: 1, bottom: 1, left: 5, right: 5 }
    // let barHeight = this.orderingScale.bandwidth() - barMargin.top - barMargin.bottom;

    // // Draw each row (translating the y coordinate)
    // this.attributeRows = this.attributes.selectAll(".row")
    //   .data(this.nodes)
    //   .enter().append("g")
    //   .attr("class", "row")
    //   .attr("transform", (d, i) => {
    //     return "translate(0," + this.orderingScale(i) + ")";
    //   });

    // this.attributeRows.append("line")
    //   .attr("x1", 0)
    //   .attr("x2", this.controller.attrWidth)
    //   .attr('stroke', '2px')
    //   .attr('stroke-opacity', 0.3);

    // let attributeMouseOver = (d) => {
    //   this.addHighlightNodesToDict(this.controller.hoverRow, d[this.datumID], d[this.datumID]);  // Add row (rowid)
    //   this.addHighlightNodesToDict(this.controller.hoverCol, d[this.datumID], d[this.datumID]);  // Add row (rowid)

    //   this.mouseoverEvents.push({ time: new Date().getTime(), event: 'attrRow' + d[this.datumID] })

    //   d3.selectAll('.hovered').classed('hovered', false);
    //   this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
    //   this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
    // };

    // this.attributeMouseOver = attributeMouseOver;
    // let attributeMouseOut = (d) => {

    //   this.removeHighlightNodesToDict(this.controller.hoverRow, d[this.datumID], d[this.datumID]);

    //   d3.selectAll('.hovered').classed('hovered', false);

    //   this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');

    // };
    // this.attributeMouseOut = attributeMouseOut;

    // this.attributeRows.append('rect')
    //   .attr('x', 0)
    //   .attr('y', 0)
    //   .classed('attrRow', true)
    //   .attr('id', (d, i) => {
    //     return "attrRow" + d[this.datumID];
    //   })
    //   .attr('width', width)
    //   .attr('height', this.orderingScale.bandwidth()) // end addition
    //   .attr("fill-opacity", 0)
    //   .on('mouseover', attributeMouseOver)
    //   .on('mouseout', attributeMouseOut).on('click', this.clickFunction);

    // let columns = this.controller.nodeAttributes;


    // var formatCurrency = d3.format("$,.0f"),
    //   formatNumber = d3.format(",.0f");

    // // generate scales for each
    // let attributeScales = {};
    // this.columnScale = d3.scaleOrdinal().domain(columns)

    // // // Calculate Column Scale
    // // let columnRange = []
    // // let xRange = 0;


    // // let columnWidths = this.determineColumnWidths(columns); // ANSWER COLUMNS
    // // //450 / columns.length;
    // // this.columnWidths = columnWidths;

    // let categoricalAttributes = ["type", "continent"]
    // let quantitativeAttributes = ["followers_count", "friends_count", "statuses_count", "count_followers_in_query",
    // "favourites_count", "listed_count", "memberFor_days", "query_tweet_count"]

    // // columns.forEach((col, index) => {
    // //   // calculate range
    // //   columnRange.push(xRange);
    // //   let domain = this.controller.attributeScales.node[col].domain;

    // //   if (quantitativeAttributes.indexOf(col) > -1) {

    // //     let scale = d3.scaleLinear().domain(domain).range([barMargin.left, columnWidths[col] - barMargin.right]);
    // //     scale.clamp(true);
    // //     attributeScales[col] = scale;
    // //   } else {
    // //     // append colored blocks
    // //     // placeholder scale
    // //     let range = this.controller.attributeScales.node[col].range;
    // //     let scale = d3.scaleOrdinal().domain(domain).range(range);
    // //     //.domain([true,false]).range([barMargin.left, colWidth-barMargin.right]);

    // //     attributeScales[col] = scale;
    // //   }

    // //   xRange += columnWidths[col];
    // // })
    // // this.attributeScales = attributeScales;





    // let placementScale = {};

    // this.columnScale.range(columnRange);

    // for (let [column, scale] of Object.entries(attributeScales)) {
    //   if (categoricalAttributes.indexOf(column) > -1) { // if not selected categorical
    //     placementScale[column] = this.generateCategoricalLegend(column, columnWidths[column]);

    //   } else if (quantitativeAttributes.indexOf(column) > -1) {
    //     this.attributes.append("g")
    //       .attr("class", "attr-axis")
    //       .attr("transform", "translate(" + this.columnScale(column) + "," + -15 + ")")
    //       .call(d3.axisTop(scale)
    //         .tickValues(scale.domain())
    //         .tickFormat((d) => {
    //           if ((d / 1000) >= 1) {
    //             d = Math.round(d / 1000) + "K";
    //           }
    //           return d;
    //         }))
    //       .selectAll('text')
    //       .style("text-anchor", function(d, i) { return i % 2 ? "end" : "start" });
    //   }


    // }

    // this.columnGlyphs = {};

    // /* Create data columns data */
    // columns.forEach((column, index) => {
    //   let columnPosition = this.columnScale(column);

    //   if (categoricalAttributes.indexOf(column) > -1) { // if categorical
    //     this.createUpsetPlot(column, columnWidths[index], placementScale[column]);
    //     return;
    //   } else if (quantitativeAttributes.indexOf(column) > -1) { // if quantitative
    //     this.columnGlyphs[column] = this.attributeRows
    //       .append("rect")
    //       .attr("class", "glyph " + column)
    //       .attr('height', barHeight)
    //       .attr('width', 10) // width changed later on transition
    //       .attr('x', columnPosition + barMargin.left)
    //       .attr('y', barMargin.top) // as y is set by translate
    //       .attr('fill', d => {
    //         return this.controller.model.orderType === column ? '#EBB769' : '#8B8B8B'
    //       })
    //       .on('mouseover', function(d) {
    //         //if (that.columnNames[d] && that.columnNames[d].length > maxcharacters) {
    //         //that.tooltip.transition().delay(1000).duration(200).style("opacity", .9);

    //         let matrix = this.getScreenCTM()
    //           .translate(+this.getAttribute("x"), +this.getAttribute("y"));

    //         that.tooltip.html(Math.round(d[column]))
    //           .style("left", (window.pageXOffset + matrix.e + columnWidths[column] / 2 - 35) + "px")
    //           .style("top", (window.pageYOffset + matrix.f - 5) + "px");

    //         that.tooltip.transition()
    //           .duration(200)
    //           .style("opacity", .9);

    //         attributeMouseOver(d);
    //         //}
    //       })
    //       .on('mouseout', (d) => {
    //         that.tooltip.transition().duration(25).style("opacity", 0);
    //         attributeMouseOut(d);
    //       })
    //     this.columnGlyphs[column]
    //       .transition()
    //       .duration(2000)
    //       .attr('width', (d, i) => { return attributeScales[column](d[column]); })


    //     this.attributeRows
    //       .append("div")
    //       .attr("class", "glyphLabel")
    //       .text(function(d, i) {
    //         return (d);
    //       });
    //   } else {
    //     barMargin.left = 1;
    //     let answerBox = this.attributeRows
    //       .append('g')
    //       .attr("class", "answerBox")
    //       .attr("id", d => "answerBox" + d[this.datumID])
    //       .attr('transform', 'translate(' + (columnPosition + barMargin.left) + ',' + 0 + ')');
    //     if (this.controller.adjMatrix.toggle) {
    //       let rect = answerBox.append("rect")
    //         .attr("x", (columnWidths[column] / 4))
    // if column with is 1, we want this at 1/4, and 1/2 being mid point
    //         .attr("y", barMargin.top)
    //         .attr("rx", barHeight / 2)
    //         .attr("ry", barHeight / 2)
    //         .style("fill", "lightgray")
    //         .attr("width", columnWidths[column] / 2)
    //         .attr("height", barHeight)
    //         .attr('stroke', 'lightgray')
    //         .on('mouseover', attributeMouseOver)
    //         .on('mouseout', attributeMouseOut);

    //       let circle = answerBox.append("circle")
    //         .attr("cx", (1.15 * columnWidths[column] / 4))
    //         .attr("cy", barHeight / 2 + barMargin.top)
    //         .attr("r", barHeight / 2)
    //         .style("fill", "white")
    //         .style('stroke', 'lightgray');
    //     } else {
    //       let initalHeight = barHeight;
    //       let newBarHeight = d3.min([barHeight,15])
    //       let rect = answerBox.append("rect")
    //         .attr("x", (columnWidths[column] / 2) - newBarHeight / 2)
    // if column with is 1, we want this at 1/4, and 1/2 being mid point
    //         .attr("y", barMargin.top + (initalHeight-newBarHeight)/2)
    //         //.attr("rx", barHeight / 2)
    //         //.attr("ry", barHeight / 2)
    //         .style("fill", "white")
    //         .attr("width", newBarHeight)
    //         .attr("height", newBarHeight)
    //         .attr('stroke', 'lightgray')
    //         .on('mouseover', attributeMouseOver)
    //         .on('mouseout', attributeMouseOut);
    //     }

    //     answerBox
    //       .on('click', (d) => {
    //         let color = this.controller.attributeScales.node.selected.range[0];
    //         //if already answer
    //         let nodeID = d.id;

    //         /*Visual chagne */
    //         let answerStatus = false; // TODO, remove?
    //         if (this.controller.adjMatrix.toggle) {
    //           d3.select(nodes[i]).selectAll('circle').transition().duration(500)
    //             .attr("cx", (answerStatus ? 3 * columnWidths[column] / 4 : 1.15 * columnWidths[column] / 4))
    //             .style("fill", answerStatus ? color : "white");
    //           d3.select(nodes[i]).selectAll('rect').transition().duration(500)
    //             .style("fill", answerStatus ? "#8B8B8B" : "lightgray");
    //         } else {

    //         }


    //         this.nodeClick(d);

    //         //let action = this.changeInteractionWrapper(nodeID, i, nodes);
    //         //this.controller.model.provenance.applyAction(action);



    //         //d3.select(nodes[i]).transition().duration(500).attr('fill',)
    //       })

    //   }
    // });

    // // Add Verticle Dividers
    // this.attributes.selectAll('.column')
    //   .data(columns)
    //   .enter()
    //   .append('line')
    //   .style('stroke', '1px')
    //   .attr('x1', (d) => this.columnScale(d))
    //   .attr("y1", -20)
    //   .attr('x2', (d) => this.columnScale(d))
    //   .attr("y2", this.attributeHeight + this.margins.bottom)
    //   .attr('stroke-opacity', 0.4);

    // // Add headers



    // this.columnNames = {
    //   "followers_count": "Followers",
    //   "query_tweet_count": "On-Topic Tweets", // not going to be used (how active this person was on the conference)
    //   "friends_count": "Friends",
    //   "statuses_count": "Tweets",
    //   "favourites_count": "Liked Tweets",
    //   "count_followers_in_query": "In-Network Followers",
    //   "continent": "Continent",
    //   "type": "Type",
    //   "memberFor_days": "Account Age",
    //   "listed_count": "In Lists",
    //   "selected": "Answer"
    // }
    // let that = this;
    // function calculateMaxChars(numColumns) {
    //   switch (numColumns) {
    //     case 1:
    //       return { "characters": 20, "font": 13 }
    //     case 2:
    //       return { "characters": 20, "font": 13 }
    //     case 3:
    //       return { "characters": 20, "font": 12 }
    //     case 4:
    //       return { "characters": 19, "font": 12 }
    //     case 5:
    //       return { "characters": 18, "font": 12 }
    //     case 6:
    //       return { "characters": 16, "font": 11 }
    //     case 7:
    //       return { "characters": 14, "font": 10 }
    //     case 8:
    //       return { "characters": 12, "font": 10 }
    //     case 9:
    //       return { "characters": 10, "font": 10 }
    //     case 10:
    //       return { "characters": 8, "font": 10 }
    //     default:
    //       return { "characters": 8, "font": 10 }
    //   }
    // }
    // let options = calculateMaxChars(columns.length)// 10 attr => 8
    // let maxcharacters = options.characters;
    // let fontSize = options.font//*1.1;


    // //this.createColumnHeaders();
    // let columnHeaders = this.attributes.append('g')
    //   .classed('column-headers', true)
    // let columnHeaderGroups = columnHeaders.selectAll('.header')
    //   .data(columns)
    //   .enter()
    //   .append('g')
    //   .attr('transform', (d) => 'translate(' + (this.columnScale(d)) + ',' + (-65) + ')')

    // columnHeaderGroups
    //   .append('rect')
    //   .attr('width', d => this.columnWidths[d])
    //   .attr('height', 20)
    //   .attr('y', 0)
    //   .attr('x', 0)
    //   .attr('fill', 'none')
    //   .attr('stroke', 'lightgray')
    //   .attr('stroke-width', 1)

    // columnHeaderGroups
    //   .append('text')
    //   .classed('header', true)
    //   //.attr('y', -45)
    //   //.attr('x', (d) => this.columnScale(d) + barMargin.left)
    //   .style('font-size', this.nodeFontSize.toString() + 'px')
    //   .attr('text-anchor', 'middle')
    //   //.attr('transform','rotate(-10)')
    //   .text((d, i) => {
    //     if (this.columnNames[d] && this.columnNames[d].length > maxcharacters) {
    //       return this.columnNames[d].slice(0, maxcharacters - 2) + '...';// experimentally determine how big
    //     }
    //     return this.columnNames[d];
    //   })
    //   .attr('x', d => this.columnWidths[d] / 2)
    //   .attr('y', 14)
    //   .on('mouseover', function(d) {
    //     if (that.columnNames[d] && that.columnNames[d].length > maxcharacters) {
    //       that.tooltip.transition().duration(200).style("opacity", .9);

    //       let matrix = this.getScreenCTM()
    //         .translate(+this.getAttribute("x"), +this.getAttribute("y"));

    //       that.tooltip.transition()
    //         .duration(200)
    //         .style("opacity", .9);

    //       that.tooltip.html(that.columnNames[d])
    //         .style("left", (window.pageXOffset + matrix.e - 25) + "px")
    //         .style("top", (window.pageYOffset + matrix.f - 20) + "px");
    //     }
    //   })
    //   .on('mouseout', function(d) {
    //     that.tooltip.transition().duration(250).style("opacity", 0);
    //   })
    //   .on('click', (d) => {
    //     if (d !== 'selected') {
    //       this.sort(d);
    //     }
    //   })

    // columnHeaderGroups
    // if (columns.length < 6) {
    //   let path = columnHeaderGroups
    //     .filter(d => { return d !== 'selected' })
    //     .append('path')
    //     .attr('class', 'sortIcon')
    //     .attr('d', (d) => {
    //     // let variable = this.isCategorical(d) ? 'categorical' : 'quant'
    //     // return this.controller.model.icons[variable].d;
    //   }).style('fill', d => { return d === this.controller.model.orderType ? '#EBB769' : '#8B8B8B' })
    //   .attr("transform", "scale(0.1)translate(" + (-50) + "," + (-300) + ")")
    //   .on('click', (d) => {this.sort(d);})
    //   .attr('cursor', 'pointer');
    // }




    // let answerColumn = columnHeaders.selectAll('.header').filter(d => { return d === 'selected' })
    // answerColumn.attr('font-weight', 650)

    // let nonAnswerColumn = columnHeaders.selectAll('.header').filter(d => { return d !== 'selected' })
    // nonAnswerColumn.attr('cursor', 'pointer');
    this.controller.model.setUpProvenance();
    window.focus();

    // Draw buttons for alternative sorts
    let initalY = -this.margins.left + 10;
    const buttonHeight = 15;
    const text = ['name', 'cluster', 'interacts'];
    const sortNames = ['shortName', 'clusterLeaf', 'edges'];
    const iconNames = ['alphabetical', 'categorical', 'quant'];
    for (let i = 0; i < 3; i++) {
      const button = this.edges.append('g')
        .attr('transform', 'translate(' + (-this.margins.left) + ',' + (initalY) + ')');
      button.attr('cursor', 'pointer');
      button.append('rect').attr('width', this.margins.left - 5).attr('height', buttonHeight).attr('fill', 'none').attr('stroke', 'gray').attr('stroke-width', 1);
      button.append('text').attr('x', 27).attr('y', 10).attr('font-size', 11).text(text[i]);
      const path = button.datum(sortNames[i]);
      path
        .append('path').attr('class', 'sortIcon').attr('d', (d: any) => {
          return this.controller.model.icons[iconNames[i]].d;
        }).style('fill', () => sortNames[i] === this.controller.model.orderType ? '#EBB769' : '#8B8B8B').attr('transform', 'scale(0.1)translate(' + (-195) + ',' + (-320) + ')')/*.on('click', (d,i,nodes) => {
        this.sort(d);
      })*/.attr('cursor', 'pointer');
      button.on('click', () => {
        this.sort(sortNames[i]);
      });
      initalY += buttonHeight + 5;
    }








    // Append g's for table headers
    // For any data row, add

    /*.on("click", clicked)
    .select(".g-table-column")
    .classed("g-table-column-" + (sortOrder === d3.ascending ? "ascending" : "descending"), function(d) {
      return d === sortKey;
    });*/


  }

  private isCategorical(column: string) {
    return column === 'type' || column === 'continent' || column === 'selected';
  }

  // function that updates the state, and includes a flag for when this was done through a search
 private nodeClick(node: any, search: boolean = false) {

  if (node[0] !== undefined) {
    node = { id: node[0].rowid };
  }

  const previousState = this.controller.model.getApplicationState();
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
      const currentState = this.controller.model.getApplicationState();
      // Add time stamp to the state graph
      currentState.time = Date.now();
      // Add label describing what the event was
      currentState.event = label;
      // Update actual node data
      currentState.clicked = clicked;
      // currentState.userSelectedNeighbors = neighbors_and_edges.neighbors;
      // currentState.userSelectedEdges = neighbors_and_edges.edges;
      // If node was searched, push him to the search array
      // if (search) {
      //     currentState.search.push(node.id);
      // }
      return currentState;
    },
    args: [],
  };

  this.controller.model.provenance.applyAction(action);
  }

  private isSelected(node: any) {
    const currentState = this.controller.model.getApplicationState();
    const clicked = currentState.clicked;
    return clicked.includes(node.id);
  }

  private unhighlightAll() {
      // Deselect all neighbors
      this.controller.columnSelectedNodes = {};
      this.controller.view.renderHighlightNodesFromDict(this.controller.columnSelectedNodes, 'neighbor', 'Row');

      // Deselect all manually clicked nodes
      const clicked = this.controller.model.getApplicationState().clicked;
      for (const id of clicked) {
        const node = this.controller.model.nodes.find((d: { id: any; }) => d.id === id);
        this.nodeClick(node);
      }
  }


  private clearSelections() {
    const selected: any[] = [];
    const neighbors: any[] = [];
    const edges: any[] = [];
    const label = 'Cleared selections';

    const action = {
      label,
      action: () => {
        const currentState = this.controller.model.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        // Add label describing what the event was
        currentState.event = label;
        // Update actual node data
        currentState.selected = selected;
        currentState.userSelectedNeighbors = neighbors;
        currentState.userSelectedEdges = edges;
        return currentState;
      },
      args: [],
    };

    this.controller.model.provenance.applyAction(action);
  }
}
