/* The View displays the data given to it by the model. */
import * as d3 from 'd3';

export class View {
  public controller: any;
  private nodes: any;
  private edges: any;
  private matrix: any;
  private edgeWidth: number;
  private edgeHeight: number;
  private attributeWidth: number;
  private attributeHeight: number;
  private datumID: string;
  private mouseoverEvents: Array<any>;
  private clickFunction: any;

  private margins: { left: number, top: number, right: number, bottom: number };
  private orderings: [number];
  private attributes: any;
  private orderingScale: d3.ScaleBand<number>;
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales: any;
  private visWidth: number;
  private visHeight: number;

  private nodeFontSize: string = '12';
  private labelVar: string = '_key';

  constructor() {
    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };

    this.mouseoverEvents = [];
    // this.datumID = controller.datumID;

    // this.clickFunction = (d, i, nodes) => {
    //   let nodeID = this.controller.view.determineID(d);
    //   // remove hover or clicked from the class name of the objects that are interacted
    //   // this is necessary as the click events are attached to the hovered rect in attrRow
    //   let interaction = this.sanitizeInteraction(d3.select(nodes[i]).attr('class'));

    //   let action = this.controller.view.changeInteractionWrapper(nodeID, nodes[i], interaction);
    //   this.controller.model.provenance.applyAction(action);

    // };
  }

  /**
   * Changes the input string by any conflicting class names given to the
   * elements that were interacted with.
   * @param  interaction class of the interacted element
   * @return             string - elements class name with no style classes
   */
  sanitizeInteraction(interaction: string) {
    interaction = interaction.replace(' hoveredCell', '');
    interaction = interaction.replace(' hovered', '');
    interaction = interaction.replace(' clicked', '');
    interaction = interaction.replace(' answer', '');
    interaction = interaction.replace(' neighbor', '');
    return interaction;
  }



  // Allows public getting
  get(attribute) {
    return this[attribute];
  };

  // Allows public setting
  set(attribute, value) {
    this[attribute] = value;
    return true;
  }

  // Update method for all non-data aspects
  updateVis() {
    // Get the row and column labels
    let rows = d3.selectAll('.rowLabel')
    let columns = d3.selectAll('.colLabel')

    // Update font size
    rows = rows.style('font-size', this.nodeFontSize + 'pt')
    columns = columns.style('font-size', this.nodeFontSize + 'pt')

    // Update labels
    rows.text((d, i) => this.nodes[i][this.labelVar])
    columns.text((d, i) => this.nodes[i][this.labelVar])
  }

  /**
   * Takes in the data, hides the loading screen, and
   * initializes visualization.
   * @param  data [description]
   * @return      [description]
   */
  loadData(nodes: any, edges: any, matrix: any) {
    this.nodes = nodes
    this.edges = edges;
    this.matrix = matrix;

    this.renderView();
  }

  /**
   * Initializes the adjacency matrix and row views with placeholder visualizations
   * @return none
   */
  renderView() {
    d3.select('.loading').style('display', 'block').style('opacity', 1);

    this.initializeEdges();
    this.initializeAttributes();

    d3.select('.loading').style('display', 'none');
  }

  /**
   * initializes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  initializeEdges() {
    // Set width and height based upon the calculated layout size. Grab the smaller of the 2
    let width = this.controller.visWidth
    let height = this.controller.visHeight;
    let sideLength = width < height ? width : height

    // Use the smallest side as the length of the matrix
    this.edgeWidth = sideLength - (this.margins.left + this.margins.right)
    this.edgeHeight = sideLength - (this.margins.top + this.margins.bottom)

    // Creates scalable SVG
    this.edges = d3.select('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height + '')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .append('g')
      .classed('svg-content', true)
      .attr('id', 'edgeMargin')
      .attr('transform', 'translate(' + this.margins.left + ',' + this.margins.top + ')')

    // sets the vertical scale
    this.orderingScale = d3.scaleBand<number>().range([0, this.edgeHeight]).domain(d3.range(this.nodes.length));

    // creates column groupings
    this.edgeColumns = this.edges.selectAll('.column')
      .data(this.matrix)
      .enter().append('g')
      .attr('class', 'column')
      .attr('transform', (d, i) => {
        return 'translate(' + this.orderingScale(i) + ')rotate(-90)';
      });

    // Draw each row
    this.edgeRows = this.edges.selectAll('.row')
      .data(this.matrix)
      .enter().append('g')
      .attr('class', 'row')
      .attr('transform', (d, i) => {
        return 'translate(0,' + this.orderingScale(i) + ')';
      });


    this.drawGridLines();
    this.drawHighlightElements();


    this.edgeScales = this.generateEdgeScales();


    this.generateColorLegend();

    var cells = this.edgeRows.selectAll('.cell')
      .data(d => { return d })
      .enter().append('g')
      .attr('class', 'cell')
      .attr('id', d => d.cellName)
      .attr('transform', d => 'translate(' + this.orderingScale(d.x) + ',0)')

    cells
      .append('rect')
      .classed('baseCell', true)
      .attr('x', d => 0)
      .attr('height', this.orderingScale.bandwidth())
      .attr('width', this.orderingScale.bandwidth())

    // render edges
    // this.controller.adjMatrix.edgeBars ? this.drawEdgeBars(cells) : 
    this.drawFullSquares(cells);

    cells
      .on('mouseover', (cell, i, nodes) => {
        this.showEdgeTooltip(cell, i, nodes);
        this.hoverEdge(cell)
      })
      .on('mouseout', (cell) => {
        this.tooltip.transition(25)
          .style('opacity', 0);

        this.unhoverEdge(cell);
      })
      .on('click', (d, i, nodes) => {
        // only trigger click if edge exists
        this.clickFunction(d, i ,nodes);

      })
      .attr('cursor', 'pointer')

    this.controller.answerRow = {}
    this.controller.hoverRow = {}
    this.controller.hoverCol = {}

    // this.order = this.controller.getOrder();

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
  drawEdgeBars(cells: any) {
    // bind squares to cells for the mouse over effect
    let dividers = this.controller.isMultiEdge ? 2 : 1;

    //let squares = cells
    let offset = 0;
    let squareSize = this.orderingScale.bandwidth() - 2 * offset;

    for (let index = 0; index < dividers; index++) {

      let type = this.controller.isMultiEdge ? this.controller.attributeScales.edge.type.domain[index] : 'interacted';

      cells
        .append('rect')
        .classed('nestedEdges nestedEdges' + type, true)
        .attr('x', offset)// index * this.orderingScale.bandwidth() / dividers })
        .attr('y', (d) => {
          return offset//this.orderingScale.bandwidth() - scale(d[type]);
        })
        .attr('height', squareSize)//)
        .attr('width', squareSize)
        .attr('fill', d => this.edgeScales[type](d[type]));

      // adjust offset and square size for the next edge type
      offset = squareSize / 4;
      squareSize = squareSize - 2 * offset;

    }

    // remove all edge rectangles that have no interactions
    cells
      .selectAll('.nestedEdges')
      .filter(d => {
        return d.mentions == 0 && d.retweet == 0 && d.interacted == 0;
      })
      .remove();
  }
  /**
   * Function to render the matrix edges as full squares
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  drawFullSquares(cells) {
    let squares = cells
      .append('rect')
      .attr('x', 0)//d => this.orderingScale(d.x))
      //.filter(d=>{return d.item >0})
      .attr('width', this.orderingScale.bandwidth())
      .attr('height', this.orderingScale.bandwidth())
      // .style("fill", 'white')
    squares
      .filter(d => d.z == 0)
      .style('fill-opacity', d => d.z);

    this.setSquareColors('all');

  }

  /**
   * Renders a tool tip over the provided cell node
   * @param  cell  Data element corresponding to the cell
   * @param  i     Index of that
   * @param  nodes The node elements of the d3 selection
   * @return       none
   */
  showEdgeTooltip(cell, i, nodes) {
    let matrix = nodes[i].getScreenCTM()
      .translate(+nodes[i].getAttribute('x'), +nodes[i].getAttribute('y'));

    // let interactedMessage = cell.interacted > 0 ? cell.interacted.toString() + " interactions" : '';//
    // if (cell.interacted == 1) {
    //   interactedMessage = interactedMessage.substring(0, interactedMessage.length - 1)
    // }
    // let retweetMessage = cell.retweet > 0 ? cell.retweet.toString() + " retweets" : '';//
    // if (cell.retweet == 1) {
    //   retweetMessage = retweetMessage.substring(0, retweetMessage.length - 1)
    // }
    // let mentionsMessage = cell.mentions > 0 ? cell.mentions.toString() + " mentions" : '';//
    // if (cell.mentions == 1) {
    //   mentionsMessage = mentionsMessage.substring(0, mentionsMessage.length - 1)
    // }

    let message = nodes[i].id
    // [interactedMessage, retweetMessage, mentionsMessage].filter(Boolean).join("</br>");//retweetMessage+'</br>'+mentionsMessage

    if (message !== '') {
      let yOffset = /*(retweetMessage !== '' && mentionsMessage !== '') ? 45 :*/ 30;
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
  hoverEdge(cell) {
    let cellIDs = [cell.cellName, cell.correspondingCell];

    this.selectedCells = cellIDs;
    this.selectedCells.map(cellID => {
      d3.selectAll('#' + cellID).selectAll('.baseCell').classed('hoveredCell', true);
    })
    let cellID = cellIDs[0];

    this.addHighlightNodesToDict(this.controller.hoverRow, cell.rowid, cellID);  // Add row (rowid)
    if (cell.colid !== cell.rowid) {
      this.addHighlightNodesToDict(this.controller.hoverRow, cell.colid, cellID);  // Add row (colid)
      this.addHighlightNodesToDict(this.controller.hoverCol, cell.rowid, cellID);  // Add col (rowid)
    }

    // add mouseover events
    this.mouseoverEvents.push({ time: new Date().getTime(), event: cellID })

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
  unhoverEdge(cell) {
    d3.selectAll('.hoveredCell').classed('hoveredCell', false);

    this.selectedCells = [];

    let cellID = cell.cellName;
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
  appendEdgeLabels() {
    this.edgeRows.append('text')
      .attr('class', 'rowLabel')
      .attr('id', (d, i) => {
        return 'rowLabel' + d[i].rowid;
      })
      .attr('z-index', 30)
      .attr('x', -3)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('dy', '.32em')
      .attr('text-anchor', 'end')
      .style('font-size', this.nodeFontSize.toString() + 'pt')
      .text((d, i) => this.nodes[i]._key)
      .on('mouseout', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) })
      .on('mouseover', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) })
      .on('click', (d) => {
        //d3.select(nodes[i]).classed('clicked',!d3.select(nodes[i]).classed('clicked'))
        nodeClick(d);
      })

    let verticalOffset = 3;
      verticalOffset = 187.5;
      let horizontalOffset = this.nodes.length < 50 ? 540 : 0;
      this.edgeColumns.append('path')
      .attr('id', d=>'sortIcon' + d[0].rowid)
      .attr('class', 'sortIcon')
      .attr('d', this.controller.model.icons['cellSort'].d)
        //.style('fill', d => {return d == this.controller.model.orderType ? '#EBB769' : '#8B8B8B' })
        .attr('transform', 'scale(0.075)translate(' + (verticalOffset) + ',' + (horizontalOffset) + ')rotate(90)')
        .on('click', (d) => {
          this.sort(d[0].rowid);
          //nodeClick(d);
          /*var e = document.createEvent('UIEvents');
          e.initUIEvent('click', true, true, /* ... *///);
          /*d3.select('#colLabel'+d[0].rowid).node().dispatchEvent(e);*/

          let action = this.controller.view.changeInteractionWrapper(null, nodes[i], 'neighborSelect');
          this.controller.model.provenance.applyAction(action);
        }).attr('cursor', 'pointer')
        .on('mouseout', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) })
        .on('mouseover', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) });
        ;
      verticalOffset = verticalOffset/12.5 + 3;
    

    this.edgeColumns.append('text')
      .attr('id', (d, i) => {
        return 'colLabel' + d[i].rowid;
      })
      .attr('class', 'colLabel')
      .attr('z-index', 30)
      .attr('y', this.orderingScale.bandwidth() / 2)
      .attr('x', verticalOffset)
      .attr('dy', '.32em')
      .attr('text-anchor', 'start')
      .style('font-size', this.nodeFontSize)
      .text((d, i) => this.nodes[i]._key)
      .on('click', (d, i) => {
          nodeClick(d);
          this.selectNeighborNodes(this.nodes[i].id, this.nodes[i].neighbors)
      })
      .on('mouseout', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) })
      .on('mouseover', (d, i, nodes) => { this.mouseOverLabel(d, i, nodes) });
  }
  /**
   * renders the relevent highlights for mousing over a label. Logs the interaction
   * in mouseoverEvents.
   * @param  data  d3 data element
   * @param  i     d3 index
   * @param  nodes d3 nodes
   * @return       none
   */

  mouseOverLabel(data, i, nodes) {

    let elementID = data[0].rowid;
    let flag = this.addHighlightNodesToDict(this.controller.hoverRow, elementID, elementID);
    this.addHighlightNodesToDict(this.controller.hoverCol, elementID, elementID);

    // add interaction to mouseover events
    flag ? this.mouseoverEvents.push({ time: new Date().getTime(), event: d3.select(nodes[i]).attr('id') }) : null;

    d3.selectAll('.hovered').classed('hovered', false);
    this.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
    this.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
  }

  /**
   * Generates the edge scales for the topology matrix
   * @return An object where keys are strings of types and values are d3 scales
   */
  generateEdgeScales() {
    let edgeScales = {};
    // this.controller.attributeScales.edge.type.domain.forEach(type => {
    //   // calculate the max
    //   let extent = [0, this.controller.attributeScales.edge.count.domain[1]];
    //   //model.maxTracker[type]]
    //   // set up scale
    //   let typeIndex = this.controller.attributeScales.edge.type.domain.indexOf(type);

    //   //let scale = d3.scaleLinear().domain(extent).range(["white", this.controller.attributeScales.edge.type.range[typeIndex]]);
    //   //let otherColors = ['#064B6E', '#4F0664', '#000000']

    //   let scale = d3.scaleSqrt().domain(extent).range("white", this.controller.attributeScales.edge.type.range[typeIndex]);

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
  drawGridLines() {
    let gridLines = this.edges
      .append('g')
      .attr('class', 'gridLines')
    let lines = gridLines
      .selectAll('line')
      .data(this.matrix)
      .enter()

    lines.append('line')
      .attr('transform', (d, i) => {
        return 'translate(' + this.orderingScale(i) + ',' + '0' + ')rotate(-90)';
      })
      .attr('x1', -this.edgeWidth)
    /*.attr("stroke-width", 5)
    .attr('stroke','red')*/

    lines.append('line')
      .attr('transform', (d, i) => {
        return 'translate(0,' + this.orderingScale(i) + ')';
      })
      .attr('x2', this.edgeWidth + this.margins.right)
    //.attr("stroke-width", 2)
    //.attr('stroke','blue')

    let one = gridLines
      .append('line')
      .attr('x1', this.edgeWidth)
      .attr('x2', this.edgeWidth)
      .attr('y1', 0)
      .attr('y2', this.edgeHeight + this.margins.bottom)
      .style('stroke', '#aaa')
      .style('opacity', 0.3)

    let two = gridLines
      .append('line')
      .attr('x1', 0)
      .attr('x2', this.edgeWidth)
      .attr('y1', this.edgeHeight + this.margins.bottom)
      .attr('y2', this.edgeHeight + this.margins.bottom)
      .style('stroke', '#aaa')
      .style('opacity', 0.3)
    // adds column lines
    /*this.edgeColumns.append("line")
      .attr("x1", -this.edgeWidth)
      .attr("z-index", 10);
    // append final line to end of topology matrix

    this.edges
      .append("line")
      .attr("x1", this.edgeWidth)
      .attr("x2", this.edgeWidth)
      .attr("y1", 0)
      .attr("y2", this.edgeHeight)

    // append horizontal grid lines
    this.edgeRows.append("line")
    .attr("x2", this.edgeWidth + this.margins.right);*/

  }

  /**
   * Renders the highlight rows and columns for the adjacency matrix.
   * @return [description]
   */
  drawHighlightElements() {
    // add the highlight rows
    this.edgeColumns
      .append('rect')
      .classed('topoCol', true)
      .attr('id', (d, i) => {
        return 'topoCol' + d[i].colid;
      })
      .attr('x', -this.edgeHeight - this.margins.bottom)
      .attr('y', 0)
      .attr('width', this.edgeHeight + this.margins.bottom + this.margins.top) // these are swapped as the columns have a rotation
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0)
    // added highlight rows
    this.edgeRows
      .append('rect')
      .classed('topoRow', true)
      .attr('id', (d, i) => {
        return 'topoRow' + d[i].rowid;
      })
      .attr('x', -this.margins.left)
      .attr('y', 0)
      .attr('width', this.edgeWidth + this.margins.right + this.margins.left)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0)
  }


  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  changeInteractionWrapper(nodeID, node, interactionType) {
    return {
      label: interactionType,
      action: (nodeID) => {
        const currentState = this.controller.model.getApplicationState();
          // currentState.selections.previousMouseovers = this.mouseoverEvents;
          this.mouseoverEvents.length = 0;
        //add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = interactionType;
        let interactionName = interactionType //cell, search, etc
        let interactedElement = interactionType
        if (interactionName == 'cell') {
          let cellData = d3.select(node).data()[0]; //
          nodeID = cellData.colid;
          interactedElement = cellData.cellName;// + cellData.rowid;

          this.changeInteraction(currentState, nodeID, interactionName + 'col', interactedElement);
          this.changeInteraction(currentState, nodeID, interactionName + 'row', interactedElement);
          if (cellData.cellName != cellData.correspondingCell) {
            interactedElement = cellData.correspondingCell;// + cellData.rowid;
            nodeID = cellData.rowid;

            this.changeInteraction(currentState, nodeID, interactionName + 'col', interactedElement);
            this.changeInteraction(currentState, nodeID, interactionName + 'row', interactedElement);
          }
          return currentState

          //nodeID = cellData.rowid;
          //interactionName = interactionName + 'row'
        } else if (interactionName == 'neighborSelect') {

          //this.controller.model.provenance.applyAction(action);
          let columnData = d3.select(node).data()[0];
          interactedElement = 'colClick' + d3.select(node).data()[0][0].rowid;
          columnData.map(node => {
            if (node.mentions != 0 || node.interacted != 0 || node.retweet != 0) {
              let neighbor = node.colid;
              this.changeInteraction(currentState, neighbor, interactionName, interactedElement);

            }
          })
          return currentState;

        } else if (interactionName == 'attrRow'){
          interactionName

        }
        this.changeInteraction(currentState, nodeID, interactionName, interactedElement);
        return currentState;
      },
      args: [nodeID]
    }
  }

  /**
   * Used to determine the ID based upon the datum element.
   * @param  data data returned as the first argument of d3 selection
   * @return      a list containing the id (ID's) of data elements
   */
  determineID(data) {
    // if attr Row
    if (data[this.datumID]) {
      return data[this.datumID]
    } else if (data.colid) { // if cell
      return data.colid + data.rowid;
    } else { // if colLabel or rowLabel
      return data[0].rowid;
    }
  }
  alreadyCellInState(state, nodeID) {
    let cellNames = splitCellNames(nodeID);
    let flag = false;
    cellNames.map(name => {
      if (state.selections['cell'][name]) {
        delete state.selections['cell'][name]
        flag = true;
      }
    })
    return flag;
  }
  /**
   * Adds the interacted node to the state object.
   * @param  state           [description]
   * @param  nodeID          [description]
   * @param  interaction     [description]
   * @param  interactionName [description]
   * @return                 [description]
   */
  changeInteraction(state, nodeID: string, interaction: string, interactionName: string = interaction) {

    // if there have been any mouseover events since the last submitted action, log them in provenance
    //if (this.mouseoverEvents.length > 1) {

    //}


    if (nodeID in state.selections[interaction]) {
      // Remove element if in list, if list is empty, delete key
      let currentIndex = state.selections[interaction][nodeID].indexOf(interactionName);
      if (currentIndex > -1) {
        state.selections[interaction][nodeID].splice(currentIndex, 1);
        if (state.selections[interaction][nodeID].length == 0) delete state.selections[interaction][nodeID];
      } else {
        state.selections[interaction][nodeID].push(interactionName);
      }
    } else {
      state.selections[interaction][nodeID] = [interactionName];
    }
  }



  /**
   * [mouseoverEdge description]
   * @return [description]
   */
  mouseoverEdge() {

  }
  linspace(startValue, stopValue, cardinality) {
    var arr = [];
    var step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
      arr.push(startValue + (step * i));
    }
    return arr;
  }

  setSquareColors(type) {

  }

  generateScaleLegend(type, numberOfEdge) {
    let yOffset = 10;
    let xOffset = 10;

    if (this.controller.adjMatrix.edgeBars && this.controller.isMultiEdge) {
      let legendFile = 'assets/adj-matrix/';
      legendFile += this.controller.isMultiEdge ? 'nestedSquaresLegend' : 'edgeBarsLegendSingleEdge'
      legendFile += '.png';
      d3.select('#legend-svg').append('g').append('svg:image')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 90)
        .attr('height', 120)
        .attr('xlink:href', legendFile)
      //return;
      xOffset = 100;
    }

    let rectWidth = 18;
    let rectHeight = 10;
    let legendWidth = 175;
    let legendHeight = 60;
    yOffset += legendHeight * numberOfEdge;

    let scale = this.edgeScales[type];
    let extent = scale.domain();
    let number = 5

    let sampleNumbers = [0, 1, 3, 5]//this.linspace(extent[0], extent[1], number);

    let svg = d3.select('#legend-svg').append('g')
      .attr('id', 'legendLinear' + type)
      .attr('transform', (d, i) => 'translate(' + xOffset + ',' + yOffset + ')')
      .on('click', (d) => {
        if (this.controller.adjMatrix.selectEdgeType == true) { //
          let edgeType = this.controller.state.adjMatrix.selectedEdgeType == type ? 'all' : type;
          this.controller.state.adjMatrix.selectedEdgeType = edgeType;
          this.setSquareColors(edgeType);
          if (edgeType == 'all') {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
          } else {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
            d3.selectAll('#legendLinear' + type).select('.edgeLegendBorder').classed('selectedEdgeType', true)

          }
        }
      });
    let boxWidth = (number + 1) * rectWidth + 15

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
      .attr('rx', 2)

    let pluralType = type;

    if (pluralType == 'retweet') {
      pluralType = 'retweets';
    } else if (pluralType == 'interacted') {
      pluralType = 'interactions';
    }

    svg.append('text')
      .attr('x', boxWidth / 2)
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .text('# of ' + pluralType)
    let sideMargin = ((boxWidth) - (sampleNumbers.length * (rectWidth + 5))) / 2

    let groups = svg.selectAll('g')
      .data(sampleNumbers)
      .enter()
      .append('g')
      .attr('transform', (d, i) => 'translate(' + (sideMargin + i * (rectWidth + 5)) + ',' + 15 + ')')

    groups
      .append('rect')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', (d) => {
        return scale(d);
      })
      .attr('stroke', (d) => {
        return d == 0 ? '#bbb' : 'white';
      })

    groups
      .append('text')
      .attr('x', rectWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .text(d => {
        return Math.round(d);
      })




  }

  generateColorLegend() {
    let counter = 0;
    for (let type in this.edgeScales) {
      if (this.controller.isMultiEdge) {
        if (type == 'interacted') {
          continue;
        }
        this.generateScaleLegend(type, counter)
        counter += 1;

      } else {
        if (type != 'interacted') {
          continue;
        }
        this.generateScaleLegend(type, counter)
      }
    }
  }

  /**
   * [selectRow description]
   * @param  node [description]
   * @return      [description]
   */
  classHighlights(nodeID, rowOrCol: string = 'Row', className: string) {
    // select attr and topo highlight
    d3.selectAll('Attr' + rowOrCol + nodeID + ',' + 'Topo' + rowOrCol + nodeID)
      .classed(className, true);
    //d3.selectAll('#highlight' + 'Topo' + rowOrCol + nodeID)
    //  .classed(className, true);*

    // highlight row text
    //d3.selectAll('')rowOrCol
    // else highlight column text

  }








  /**
   * [highlightRow description]
   * @param  node [description]
   * @return      [description]
   */
  /*highlightRow(node) {
    let nodeID = node[this.datumID];
    if (nodeID == null) {
      nodeID = node.rowid;
    }
    // highlight attr
    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, 'topo');
  }

  highlightRowAndCol(node) {
    let nodeID = node.screen_name;
    if (node.screen_name == null) {
      nodeID = node.colid;
    }

    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, '', 'Col');
  }

  highlightNode(nodeID: string, attrOrTopo: string, rowOrCol: string = 'Row') {
    d3.selectAll('.' + attrOrTopo + rowOrCol + nodeID)
      .classed('hovered', true);
  }*/



  //u: BCC    BCCINVITADOS2019
  //p:

  //private selectedNodes : any;
  // DOESNT GET ADDED
  addHighlightNode(addingNode: string) {
    // if node is in
    let nodeIndex = this.nodes.findIndex(function(item, i) {
      return item['id'] == addingNode;
    });
    for (let i = 0; i < this.matrix[0].length; i++) {
      if (true /*this.matrix[i][nodeIndex].z > 0*/) {
        let nodeID = this.matrix[i][nodeIndex].rowid;
        if (this.controller.highlightedNodes.hasOwnProperty(nodeID) && !this.controller.highlightedNodes[nodeID].includes(addingNode)) {
          // if array exists, add it
          this.controller.highlightedNodes[nodeID].push(addingNode);
        } else {
          // if array non exist, create it and add node
          this.controller.highlightedNodes[nodeID] = [addingNode];
        }
      }
    }
  }

  nodeDictContainsPair(dict, nodeToHighlight, interactedElement) {
    if (nodeToHighlight in dict) {
      return dict[nodeToHighlight].has(interactedElement)
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
  addHighlightNodesToDict(dict, nodeToHighlight, interactedElement) {
    // if node already in highlight, remove it
    if (this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      this.removeHighlightNodesToDict(dict, nodeToHighlight, interactedElement)
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

  removeHighlightNodesToDict(dict, nodeToHighlight, interactedElement) {
    // if node is not in list, simply return
    if (!this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      return;
    }

    // if there are other elements highlighting the node to highlight
    if (dict[nodeToHighlight].size > 1) { // if set has more than 1 object
      dict[nodeToHighlight].delete(interactedElement); // delete element from set
    }
    else {
      delete dict[nodeToHighlight];
    }
  }

  renderHighlightNodesFromDict(dict, classToRender, rowOrCol: string = 'Row') {
    //unhighlight all other nodes
    if (classToRender != 'hovered') {
      d3.selectAll(`.${classToRender}`)
        .classed(classToRender, false)
    }

    //highlight correct nodes
    let cssSelector = '';
    for (let node in dict) {
      if(Array.isArray(dict[node])){
        for (let nodeID of dict[node]) {
          if (rowOrCol == 'Row') {
            cssSelector += '#attr' + rowOrCol + nodeID + ',';
          }
          cssSelector += '#topo' + rowOrCol + nodeID + ','

          if (rowOrCol == 'Row') {
            cssSelector += '#nodeLabelRow' + nodeID + ','
          }
        }
      } else {
        if (rowOrCol == 'Row') {
          cssSelector += '#attr' + rowOrCol + node + ',';
        }
        cssSelector += '#topo' + rowOrCol + node + ','

        if (rowOrCol == 'Row') {
          cssSelector += '#nodeLabelRow' + node + ','
        }
      }
    }
    // remove last comma
    cssSelector = cssSelector.substring(0, cssSelector.length - 1);
    if (cssSelector == '') {
      return;
    }
    d3.selectAll(cssSelector).classed(classToRender, true);

  }

  selectNode(nodeID: string) {
    let index = this.controller.state.selectedNodes.indexOf(nodeID)

    if (index > -1) {
      this.controller.state.selectedNodes.splice(index, 1);
    } else {
      this.controller.state.selectedNodes.push(nodeID);
    }

    let attrRow = d3.selectAll('attr' + 'Row' + nodeID);
    attrRow
      .classed('selected', !attrRow.classed('selected'));

    let topoRow = d3.selectAll('topo' + 'Row' + nodeID);
    topoRow
      .classed('selected', !topoRow.classed('selected'));
  }

  selectColumnNode(nodeID) {
    // highlight
  }

  /**
   * Old implementation to select the neighboring nodes.
   * @param  nodeID [description]
   * @return        [description]
   */
  selectNeighborNodes(nodeID, neighbors) {
    if (nodeID in this.controller.columnSelectedNodes) {

      // find all neighbors and remove them
      delete this.controller.columnSelectedNodes[nodeID]
    } else {
      this.addHighlightNode(nodeID);
      let newElement = {}
      newElement[nodeID] = neighbors
      this.controller.columnSelectedNodes = Object.assign(this.controller.columnSelectedNodes, newElement)
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




  private attributeRows: any;
  private tooltip: any;
  private barWidthScale: any;
  private columnScale: any;
  private order: any;

  /**
   * [sort description]
   * @return [description]
   */
  sort(order) {
    let nodeIDs = this.nodes.map(node=>node.id);
    if(nodeIDs.includes(order)){
      this.order = this.controller.changeOrder(order,true);
      (order);
    } else {
      this.order = this.controller.changeOrder(order);
    }
    this.orderingScale.domain(this.order);
    

    let transitionTime = 500;
    d3.selectAll('.row')
      .transition()
      .duration(transitionTime)
      // .delay((d , i) => { return this.orderingScale(i) * 4; })
      .attr('transform', (d, i) => {
        if (i > this.order.length - 1) return;
        return 'translate(0,' + this.orderingScale(i) + ')';
      })



    // TODO: Fix this when we add the adjacent attributes
    // this.attributeRows
    //   //.transition()
    //   //.duration(transitionTime)
    //   //.delay((d, i) => { return this.orderingScale(i) * 4; })
    //   .attr("transform", (d, i) => { return "translate(0," + this.orderingScale(i) + ")"; })

    // update each highlightRowsIndex


    // if any other method other than neighbors sort
    if(!nodeIDs.includes(order)) {
      var t = this.edges//.transition().duration(transitionTime);
      t.selectAll('.column')
        //.delay((d, i) => { return this.orderingScale(i) * 4; })
        .attr('transform', (d, i) => { return 'translate(' + this.orderingScale(i) + ',0)rotate(-90)'; });
    }

    // change glyph coloring for sort
    // d3.selectAll('.glyph').attr('fill', '#8B8B8B');
    // // for quantitative values, change their color
    // if (this.controller.view.columnGlyphs[order]) {
    //   this.controller.view.columnGlyphs[order].attr('fill', '#EBB769');
    // }

    d3.selectAll('.sortIcon').style('fill', '#8B8B8B').filter(d => d == order).style('fill', '#EBB769')
    if(!nodeIDs.includes(order)){
      let cells = d3.selectAll('.cell')//.selectAll('rect')
        //.transition()
        //.duration(transitionTime)
        //.delay((d, i) => { return this.orderingScale(i) * 4; })
        //.delay((d) => { return this.orderingScale(d.x) * 4; })
        .attr('transform', (d, i) => {
          return 'translate(' + this.orderingScale(d.x) + ',0)'
        });
    } else {
      d3.select('#sortIcon'+order).style('fill','#EBB769')
    }

  }

  private columnscreen_names: {};
  private attributeScales: any;
  private columnWidths: any;
  /**
   * [initializeAttributes description]
   * @return [description]
   */
  initializeAttributes() {
    // let width = this.controller.visWidth * this.controller.attributeProportion;//this.edgeWidth + this.margins.left + this.margins.right;
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
    //   .attr('fill', (d, i) => { return i % 2 == 0 ? "#fff" : "#eee" })
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

    //   this.removeHighlightNodesToDict(this.controller.hoverRow, d[this.datumID], d[this.datumID]);  // Add row (rowid)
    //   this.removeHighlightNodesToDict(this.controller.hoverCol, d[this.datumID], d[this.datumID]);  // Add row (rowid)

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

    // //columns.unshift('selected'); // ANSWER COLUMNS

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
    // let quantitativeAttributes = ["followers_count", "friends_count", "statuses_count", "count_followers_in_query", "favourites_count", "listed_count", "memberFor_days", "query_tweet_count"]

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

    // // need max and min of each column
    // /*this.barWidthScale = d3.scaleLinear()
    //   .domain([0, 1400])
    //   .range([0, 140]);*/





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
    //         return this.controller.model.orderType == column ? '#EBB769' : '#8B8B8B'
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
    //         .attr("x", (columnWidths[column] / 4)) // if column with is 1, we want this at 1/4, and 1/2 being mid point
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
    //         .attr("x", (columnWidths[column] / 2) - newBarHeight / 2) // if column with is 1, we want this at 1/4, and 1/2 being mid point
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
    //         let nodeID = this.determineID(d);

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


    //         nodeClick(d);

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
    //   }).style('fill', d => { return d == this.controller.model.orderType ? '#EBB769' : '#8B8B8B' })
    //   .attr("transform", "scale(0.1)translate(" + (-50) + "," + (-300) + ")")
    //   .on('click', (d) => {this.sort(d);})
    //   .attr('cursor', 'pointer');
    // }




    // let answerColumn = columnHeaders.selectAll('.header').filter(d => { return d == 'selected' })
    // answerColumn.attr('font-weight', 650)

    // let nonAnswerColumn = columnHeaders.selectAll('.header').filter(d => { return d !== 'selected' })
    // nonAnswerColumn.attr('cursor', 'pointer');

    d3.select('.loading').style('display', 'none');
    this.controller.model.setUpProvenance();
    window.focus();

    // Draw buttons for alternative sorts
    let initalY = -this.margins.left + 10;
    let buttonHeight = 15;
    let text = ['name', 'cluster', 'interacts'];
    let sortNames = ['shortName', 'clusterLeaf', 'edges']
    let iconNames = ['alphabetical', 'categorical', 'quant']
    for (let i = 0; i < 3; i++) {
      let button = this.edges.append('g')
        .attr('transform', 'translate(' + (-this.margins.left) + ',' + (initalY) + ')')
      button.attr('cursor', 'pointer')
      button.append('rect').attr('width', this.margins.left - 5).attr('height', buttonHeight).attr('fill', 'none').attr('stroke', 'gray').attr('stroke-width', 1)
      button.append('text').attr('x', 27).attr('y', 10).attr('font-size', 11).text(text[i]);
      let path = button.datum(sortNames[i])
      let realPath = path
        .append('path').attr('class', 'sortIcon').attr('d', (d) => {
          return this.controller.model.icons[iconNames[i]].d;
        }).style('fill', () => { return sortNames[i] == this.controller.model.orderType ? '#EBB769' : '#8B8B8B' }).attr('transform', 'scale(0.1)translate(' + (-195) + ',' + (-320) + ')')/*.on('click', (d,i,nodes) => {
        this.sort(d);
      })*/.attr('cursor', 'pointer');
      button.on('click', () => {
        this.sort(sortNames[i]);
      })
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

  isCategorical(column) {
    return column == 'type' || column == 'continent' || column == 'selected';
  }

  determineColumnWidths(columns) {

    let widths = {};
    // set all column widths to 0
    // set all categorical column width to their width, keep track of total width
    // set all other columns widths based off width - categorical

    let widthOffset = this.controller.attrWidth / columns.length;

    let totalCategoricalWidth = 0;
    let bandwidthScale = 2

    if (this.nodes.length < 50) {
      bandwidthScale = (1 / 3);
    }
    let itemSize = d3.min([(bandwidthScale * bandwidth), 30]);
    let bandwidth = this.orderingScale.bandwidth();

    // fill in categorical column sizes
    for (let i = 0; i < columns.length; i++) {
      let column = columns[i];
      // if column is categorical
      if (this.isCategorical(column)) {
        let width = itemSize * (this.controller.attributeScales.node[column].domain.length + 1.5) + 20

        if (column == 'selected') {
          width = 60;
        }

        // place max size of width
        width = d3.min([160, width]);
        widths[column] = width;
        totalCategoricalWidth += width; // add width
      }
    }

    let quantitativeWidth = this.controller.attrWidth - totalCategoricalWidth,
      quantitativeColumns = columns.length - Object.keys(widths).length,
      quantitativeColumnSize = quantitativeWidth / quantitativeColumns;

    // fill in remaining columns based off the size remaining for quantitative variables
    for (let i = 0; i < columns.length; i++) {
      let column = columns[i];
      if (!(column in widths)) {
        widths[column] = quantitativeColumnSize;
      }
    }
    return widths;


    // add categorical column width
  }



  createUpsetPlot(column, columnWidth, placementScaleForAttr) {
    let columnPosition = this.columnScale(column);
    let topMargin = 1;
    let height = this.orderingScale.bandwidth() - 2 * topMargin;
    let bandwidthScale = this.nodes.length < 50 ? (1 / 3) : 2;
    let width = this.orderingScale.bandwidth() * bandwidthScale
    let numberCategories = this.controller.attributeScales.node[column].domain.length

    let legendItemSize = (this.columnWidths[column]) / (numberCategories + 1.5)///bandwidth * bandwidthScale;

    for (let index = 0; index < placementScaleForAttr.length; index++) {
      this.attributeRows
        .append('rect')
        .attr('x', placementScaleForAttr[index].position)
        .attr('y', 1)
        .attr('fill', (d) => {
          return d[column] == placementScaleForAttr[index].value ? this.attributeScales[column](d[column]) : '#dddddd'; // gray version: '#333333'
        })
        .attr('width', legendItemSize)
        .attr('height', height)
        .on('mouseover', (d, i, nodes) => {
          if (d[column] == placementScaleForAttr[index].value) {
            let matrix = nodes[i].getScreenCTM()
              .translate(+nodes[i].getAttribute('x'), +nodes[i].getAttribute('y'));

            this.tooltip.html(d[column])
              .style('left', (window.pageXOffset + matrix.e - 25) + 'px')
              .style('top', (window.pageYOffset + matrix.f - 25) + 'px');

            this.tooltip.transition()
              .duration(200)
              .style('opacity', .9);
          }


          this.attributeMouseOver(d);
        })
        .on('mouseout', (d, i, nodes) => {
          this.tooltip.transition()
            .duration(25)
            .style('opacity', 0);
          //that.tooltip.transition().duration(25).style("opacity", 0);

          this.attributeMouseOut(d);
        });
    }


    return;
  }

  generateCategoricalLegend(attribute, legendWidth) {
    let numberCategories = this.controller.attributeScales.node[attribute].domain.length

    let attributeInfo = this.controller.attributeScales.node[attribute];
    let dividers = attributeInfo.domain.length;

    let legendHeight = d3.min([25, this.orderingScale.bandwidth()]);

    let bandwidthScale = 2
    if (this.nodes.length < 50) {
      bandwidthScale = (1 / 3);
    }

    let bandwidth = this.orderingScale.bandwidth();

    let marginEquivalents = 1.5;

    let legendItemSize = (this.columnWidths[attribute] - 5) / (dividers + marginEquivalents)///bandwidth * bandwidthScale;
    let height = d3.min([bandwidth * bandwidthScale, legendHeight]);

    //(legendWidth) / (dividers + 3/bandwidthScale);
    let margin = marginEquivalents * legendItemSize / dividers;

    let xRange = [];

    let rects = this.attributes.append('g')
      .attr('transform', 'translate(' + (this.columnScale(attribute) + 1 * margin) + ',' + (-legendHeight - 5) + ')'); //

    for (let i = 0; i < dividers; i++) {
      let rect1 = rects
        .append('g')
        .attr('transform', 'translate(' + (i * (legendItemSize + margin)) + ',0)')

      xRange.push({
        'attr': attribute,
        'value': attributeInfo.domain[i],
        'position': (this.columnScale(attribute) + 1 * margin) + (i * (legendItemSize + margin))
      });

      rect1
        .append('rect')
        .attr('x', 0)//(legendItemSize + margin)/2 -this.orderingScale.bandwidth()
        .attr('y', 0)
        .attr('fill', attributeInfo.range[i])
        .attr('width', legendItemSize)
        .attr('height', height)

      rect1
        .append('text')
        .text(attributeInfo.legendLabels[i])
        .attr('x', legendItemSize / 2)
        .attr('y', -3)
        .attr('text-anchor', 'middle')
        .style('font-size', 11)
      //.attr('transform', 'rotate(-90)')
      rect1.on('mouseover', (d, index, nodes) => {
        let matrix = nodes[index].getScreenCTM()
          .translate(+nodes[index].getAttribute('x'), +nodes[index].getAttribute('y'));

        this.tooltip.html(attributeInfo.domain[i])
          .style('left', (window.pageXOffset + matrix.e - 45) + 'px')
          .style('top', (window.pageYOffset + matrix.f - 20) + 'px');
        this.tooltip.transition()
          .duration(200)
          .style('opacity', .9);
      })
        .on('mouseout', () => {
          this.tooltip.transition(25)
            .style('opacity', 0);
        })
    }

    return xRange;
  }

  /**
   * [selectHighlight description]
   * @param  nodeToSelect    the
   * @param  rowOrCol        String, "Row" or "Col"
   * @param  selectAttribute Boolean of to select attribute or topology highlight
   * @return                 [description]
   */
  selectHighlight(nodeToSelect: any, rowOrCol: string, attrOrTopo: string = 'Attr', orientation: string = 'x') {
    let selection = d3.selectAll('.' + attrOrTopo + rowOrCol)
      .filter((d, i) => {
        if (attrOrTopo == 'Attr' && d.index == null) {
          // attr
          return nodeToSelect.index == d[i][orientation];
        }
        //topology
        return nodeToSelect.index == d.index;
      })
    return selection;
  }
}
