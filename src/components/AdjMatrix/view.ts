/* The View displays the data given to it by the model. */
import * as d3 from 'd3';

export class View {
  public controller: any;
  public selectedCells: any[] = [];
  public variableList: string[] = [];
  public attributeVariables: string[] = [];

  private nodes: any;
  private edges: any;
  private matrix: any;
  private edgeWidth: number = 0;
  private edgeHeight: number = 0;
  private mouseoverEvents: any[];
  private attributeRows: any;
  private tooltip: any;
  private columnScale: any;
  private order: any;
  private margins: { left: number, top: number, right: number, bottom: number };
  private attributes: any;
  private orderingScale: d3.ScaleBand<number> = d3.scaleBand<number>();
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales!: { [key: string]: any };
  private nodeFontSize: string = '12';
  private labelVar: string = '_key';
  private datumID: string = '';
  private columnHeaders: any;
  private attributeScales: { [key: string]: any } = {};
  private columnGlyphs: { [key: string]: any } = {};
  private colMargin: number = 5;

  constructor() {
    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };
    this.mouseoverEvents = [];
    this.columnScale = d3.scaleBand().range([0, 3]);
  }

  /**
   * Changes the input string by any conflicting class names given to the
   * elements that were interacted with.
   * @param  interaction class of the interacted element
   * @return             string - elements class name with no style classes
   */
  public sanitizeInteraction(interaction: string): string {
    interaction = interaction.replace(' hoveredCell', '');
    interaction = interaction.replace(' hovered', '');
    interaction = interaction.replace(' clicked', '');
    interaction = interaction.replace(' neighbor', '');
    return interaction;
  }

  // Update method for all non-data aspects
  public updateVis(): void {
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
  public loadData(nodes: any, edges: any, matrix: any): void {
    this.nodes = nodes;
    this.edges = edges;
    this.matrix = matrix;

    this.renderView();
  }

  /**
   * Initializes the adjacency matrix and row views with placeholder visualizations
   * @return none
   */
  public renderView(): void {
    this.initializeEdges();
    this.initializeAttributes();
  }

  public updateAttributes(): void {
    // Set the column widths and margin
    const attrWidth = parseFloat(d3.select('#attributes').attr('width'));
    const colWidth = attrWidth / this.attributeVariables.length - this.colMargin;

    // Update the variable scales
    for (const name of this.variableList) {
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
      .on('click', (d: any, i: number) => {
        this.sort(d);
      });

    // Calculate the variable scales
    this.attributeVariables.forEach((col, index) => {
      if (this.isQuantitative(col)) {
        const minimum = d3.min(this.nodes.map((node: any) => node[col])) || '0';
        const maximum = d3.max(this.nodes.map((node: any) => node[col])) || '0';
        const domain = [parseFloat(minimum), parseFloat(maximum)];

        const scale = d3.scaleLinear().domain(domain).range([0, colWidth]);
        scale.clamp(true);
        this.attributeScales[col] = scale;
      } else {
        const domain = [...new Set(this.nodes.map((node: { [key: string]: string }) => node[col]))];
        // append colored blocks
        // placeholder scale
        const range = this.controller.attributeScales.node[col].range;
        // const scale = d3.scaleOrdinal().domain(domain).range(range);
        // .domain([true,false]).range([barMargin.left, colWidth-barMargin.right]);

        // this.attributeScales[col] = scale;
      }
    });

    d3.selectAll('.attr-axis').remove();

    const placementScale = {};
    this.attributeVariables.forEach((col, index) => {
      if (!this.isQuantitative(col)) { // if not selected categorical
        // placementScale[col] = this.generateCategoricalLegend(col, columnWidths[col]);
      } else {
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

    this.columnGlyphs = {};
    /* Create data columns data */
    this.attributeVariables.forEach((col, index) => {
      if (!this.isQuantitative(col)) { // if categorical
        // this.createUpsetPlot(col, columnWidths[index], placementScale[col]);
        return;
      } else { // if quantitative
        this.columnGlyphs[col] = this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('height', this.orderingScale.bandwidth())
          .attr('width', (d: any) => this.attributeScales[col](d[col])) // width changed later on transition
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0) // as y is set by translate
          .attr('fill', (d: any) => '#8B8B8B')
          .on('mouseover', (d: any) => {
            // if (that.columnNames[d] && that.columnNames[d].length > maxcharacters) {
            // that.tooltip.transition().delay(1000).duration(200).style("opacity", .9);

            // let matrix = this.getScreenCTM()
            //   .translate(+this.getAttribute('x'), +this.getAttribute('y'));

            // that.tooltip.html(Math.round(d[col]))
            //   .style('left', (window.pageXOffset + matrix.e + columnWidths[col] / 2 - 35) + 'px')
            //   .style('top', (window.pageYOffset + matrix.f - 5) + 'px');

            // that.tooltip.transition()
            //   .duration(200)
            //   .style('opacity', .9);

            // attributeMouseOver(d);
          })
          .on('mouseout', (d: any) => {
            // that.tooltip.transition().duration(25).style('opacity', 0);
            // attributeMouseOut(d);
          });

        this.attributeRows
          .append('div')
          .attr('class', 'glyphLabel')
          .text((d: any, i: number) => d);
        }
      },
    );
  }

  private isQuantitative(varName: string): boolean {
    const uniqueValues = [...new Set(this.nodes.map((node: any) => parseFloat(node[varName])))];
    return uniqueValues.length > 5;
  }

  private clickFunction(d: any, i: number, nodes: any[]): void {
    const nodeID = d.id;
    const interaction = this.sanitizeInteraction(d3.select(nodes[i]).attr('class'));
    const action = this.changeInteractionWrapper(nodeID, nodes[i], interaction);
    this.controller.model.provenance.applyAction(action);
  }

  /**
   * initializes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  private initializeEdges(): void {
    // Set width and height based upon the calculated layout size. Grab the smaller of the 2
    const width = this.controller.visDimensions.width;
    const height = this.controller.visDimensions.height;
    const sideLength = width < height ? width : height;

    // Use the smallest side as the length of the matrix
    this.edgeWidth = sideLength - (this.margins.left + this.margins.right);
    this.edgeHeight = sideLength - (this.margins.top + this.margins.bottom);

    // Creates scalable SVG
    this.edges = d3.select('#matrix')
      .append('g')
      .attr('transform', `translate(${this.margins.left},${this.margins.top})`);

    // sets the vertical scale
    this.orderingScale = d3.scaleBand<number>().range([0, this.edgeHeight]).domain(d3.range(this.nodes.length));

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
    this.drawHighlightElements();


    // this.generateColorLegend();

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

  private drawHighlightElements(): void {
    // add the highlight rows
    this.edgeColumns
      .append('rect')
      .classed('topoCol', true)
      .attr('id', (d: any, i: number) => {
        return `topoCol${d[i].colid}`;
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
        return `topoRow${d[i].rowid}`;
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
  private drawEdgeBars(cells: any): void {
    // bind squares to cells for the mouse over effect
    const dividers = this.controller.isMultiEdge ? 2 : 1;

    // let squares = cells
    let offset = 0;
    let squareSize = this.orderingScale.bandwidth() - 2 * offset;

    for (let index = 0; index < dividers; index++) {

      const type = this.controller.isMultiEdge ? this.controller.attributeScales.edge.type.domain[index] : 'interacted';

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
   * Function to render the matrix edges as full squares
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  private drawFullSquares(cells: any): void {
    const squares = cells
      .append('rect')
      .attr('x', 0)// d => this.orderingScale(d.x))
      // .filter(d=>{return d.item >0})
      .attr('width', this.orderingScale.bandwidth())
      .attr('height', this.orderingScale.bandwidth());
      // .style("fill", 'white')

    squares
      .filter((d: any) => d.z === 0)
      .style('fill-opacity', (d: { z: number; }) => d.z);

  }

  /**
   * Renders a tool tip over the provided cell node
   * @param  cell  Data element corresponding to the cell
   * @param  i     Index of that
   * @param  nodes The node elements of the d3 selection
   * @return       none
   */
  private showEdgeTooltip(cell: any, i: number, nodes: any): void {
    const matrix = nodes[i].getScreenCTM()
      .translate(+nodes[i].getAttribute('x'), + nodes[i].getAttribute('y'));

    const message = nodes[i].id;

    if (message !== '') {
      const yOffset = 30;
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
  private hoverEdge(cell: any): void {
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
  private unhoverEdge(cell: { cellName: any; rowid: any; colid: any; }): void {
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
  private appendEdgeLabels(): void {
    this.edgeRows.append('text')
      .attr('class', 'rowLabel')
      .attr('id', (d: { [x: string]: { rowid: string; }; }, i: string | number) => {
        return `rowLabel${d[i].rowid}`;
      })
      .attr('z-index', 30)
      .attr('x', -3)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .style('font-size', this.nodeFontSize.toString() + 'pt')
      .text((d: any, i: string | number) => this.nodes[i]._key)
      .on('mouseout', (d: any, i: any, nodes: any) => this.mouseOverLabel(d, i, nodes))
      .on('mouseover', (d: any, i: any, nodes: any) => this.mouseOverLabel(d, i, nodes))
      .on('click', (d: any) => this.nodeClick(d));

    let verticalOffset = 187.5;
    const horizontalOffset = (this.orderingScale.bandwidth() / 2 - 4.5) / 0.075;
    this.edgeColumns.append('path')
      .attr('id', (d: Array<{ rowid: string; }>) => `sortIcon${d[0].rowid}`)
      .attr('class', 'sortIcon')
      .attr('d', this.controller.model.icons.cellSort.d)
      .style('fill', (d: any) => d === this.controller.model.orderType ? '#EBB769' : '#8B8B8B')
      .attr('transform', `scale(0.075)translate(${verticalOffset},${horizontalOffset})rotate(90)`)
      .on('click', (d: Array<{ rowid: any; }>, i: number, nodes: any[]) => {
        this.sort(d[0].rowid);
        const action = this.changeInteractionWrapper(null, nodes[i], 'neighborSelect');
        this.controller.model.provenance.applyAction(action);
      })
      .attr('cursor', 'pointer')
      .on('mouseout', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); })
      .on('mouseover', (d: any, i: any, nodes: any) => { this.mouseOverLabel(d, i, nodes); });

    verticalOffset = verticalOffset * 0.075 + 5;


    this.edgeColumns.append('text')
      .attr('id', (d: { [x: string]: { rowid: string; }; }, i: string | number) => {
        return `colLabel${d[i].rowid}`;
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

  private mouseOverLabel(data: Array<{ rowid: any; }>, i: string | number, nodes: { [x: string]: any; }): void {
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
      .attr('x1', -this.edgeWidth);

    lines.append('line')
      .attr('transform', (d: any, i: number) => {
        return `translate(0,${this.orderingScale(i)})`;
      })
      .attr('x2', this.edgeWidth + this.margins.right);

    gridLines
      .append('line')
      .attr('x1', this.edgeWidth)
      .attr('x2', this.edgeWidth)
      .attr('y1', 0)
      .attr('y2', this.edgeHeight + this.margins.bottom)
      .style('stroke', '#aaa')
      .style('opacity', 0.3);

    gridLines
      .append('line')
      .attr('x1', 0)
      .attr('x2', this.edgeWidth)
      .attr('y1', this.edgeHeight + this.margins.bottom)
      .attr('y2', this.edgeHeight + this.margins.bottom)
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

  private generateScaleLegend(type: string, numberOfEdge: number): void {
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

    const sampleNumbers = [0, 1, 3, 5];

    const svg = d3.select('#legend-svg').append('g')
      .attr('id', `legendLinear${type}`)
      .attr('transform', (d, i) => `translate(${xOffset},${yOffset})`)
      .on('click', (d) => {
        if (this.controller.adjMatrix.selectEdgeType === true) {
          const edgeType = this.controller.state.adjMatrix.selectedEdgeType === type ? 'all' : type;
          this.controller.state.adjMatrix.selectedEdgeType = edgeType;
          if (edgeType === 'all') {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
          } else {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
            d3.selectAll(`#legendLinear${type}`).select('.edgeLegendBorder').classed('selectedEdgeType', true);

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
      .text(`# of ${pluralType}`);
    const sideMargin = ((boxWidth) - (sampleNumbers.length * (rectWidth + 5))) / 2;

    const groups = svg.selectAll('g')
      .data(sampleNumbers)
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(${sideMargin + i * (rectWidth + 5)},15)`);

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

  private generateColorLegend(): void {
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

  private addHighlightNode(addingNode: string): void {
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

  /**
   * Old implementation to select the neighboring nodes.
   * @param  nodeID [description]
   * @return        [description]
   */
  private selectNeighborNodes(nodeID: string, neighbors: any): void {
    if (nodeID in this.controller.columnSelectedNodes) {

      // find all neighbors and remove them
      delete this.controller.columnSelectedNodes[nodeID];
    } else {
      this.addHighlightNode(nodeID);
      const newElement = { [nodeID]: neighbors};
      this.controller.columnSelectedNodes = Object.assign(this.controller.columnSelectedNodes, newElement);
    }
    this.renderHighlightNodesFromDict(this.controller.columnSelectedNodes, 'neighbor', 'Row');
  }

  /**
   * [sort description]
   * @return [description]
   */
  private sort(order: unknown): void {
    const nodeIDs = this.nodes.map((node: { id: any; }) => node.id);

    if (nodeIDs.includes(order)) {
      this.order = this.controller.changeOrder(order, true);
    } else {
      this.order = this.controller.changeOrder(order);
    }
    this.orderingScale.domain(this.order);

    const transitionTime = 500;

    d3.selectAll('#matrix g .row')
      .transition()
      .duration(transitionTime)
      .attr('transform', (d: any, i: number) => {
        if (i > this.order.length - 1) {
          return'translate(0, 0)';
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
      .data(this.nodes)
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
      .data(this.nodes)
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

    const attributeMouseOver = (d: any) => {
      this.addHighlightNodesToDict(this.controller.hoverRow, d.id, d.id);  // Add row (rowid)
      this.addHighlightNodesToDict(this.controller.hoverCol, d.id, d.id);  // Add row (rowid)

      this.mouseoverEvents.push({ time: new Date().getTime(), event: 'attrRow' + d.id });

      d3.selectAll('.hovered').classed('hovered', false);
      this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
      this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
    };

    const attributeMouseOut = (d: any) => {
      this.removeHighlightNodesToDict(this.controller.hoverRow, d.id, d.id);
      this.removeHighlightNodesToDict(this.controller.hoverCol, d.id, d.id);

      d3.selectAll('.hovered').classed('hovered', false);
      this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
      this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
    };

    this.attributeRows
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .classed('attrRow', true)
      .attr('id', (d: any, i: number) => `attrRow${d.id}`)
      .attr('width', attributeWidth)
      .attr('height', this.orderingScale.bandwidth()) // end addition
      .attr('fill-opacity', 0)
      .on('mouseover', (d: any) => attributeMouseOver(d))
      .on('mouseout', (d: any) => attributeMouseOut(d))
      .on('click', this.clickFunction);

    this.columnHeaders = this.attributes.append('g')
      .classed('column-headers', true);

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

    // Draw buttons for alternative sorts
    let initalY = -this.margins.left + 10;
    const buttonHeight = 15;
    const text = ['name', 'cluster', 'interacts'];
    const sortNames = ['shortName', 'clusterLeaf', 'edges'];
    const iconNames = ['alphabetical', 'categorical', 'quant'];
    for (let i = 0; i < 3; i++) {
      const button = this.edges.append('g')
        .attr('transform', `translate(${-this.margins.left},${initalY})`);
      button.attr('cursor', 'pointer');
      button.append('rect').attr('width', this.margins.left - 5).attr('height', buttonHeight).attr('fill', 'none').attr('stroke', 'gray').attr('stroke-width', 1);
      button.append('text').attr('x', 27).attr('y', 10).attr('font-size', 11).text(text[i]);
      const path = button.datum(sortNames[i]);
      path
        .append('path').attr('class', 'sortIcon').attr('d', (d: any) => {
          return this.controller.model.icons[iconNames[i]].d;
        })
        .style('fill', () => sortNames[i] === this.controller.model.orderType ? '#EBB769' : '#8B8B8B')
        .attr('transform', 'scale(0.1)translate(-195,-320)')
        .attr('cursor', 'pointer');
      button.on('click', () => {
        this.sort(sortNames[i]);
      });
      initalY += buttonHeight + 5;
    }
  }

  // function that updates the state, and includes a flag for when this was done through a search
 private nodeClick(node: any, search: boolean = false): void {

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

  private isSelected(node: any): boolean {
    const currentState = this.controller.model.getApplicationState();
    const clicked = currentState.clicked;
    return clicked.includes(node.id);
  }
}
