/* The Model loads sorts and orders the data. */
import * as d3 from 'd3';

export class Model {
  public graphStructure: any;
  public icons: object;
  public controller: any;
  public sortKey: string;

  private data: any;
  private matrix: any;
  private nodes: any;
  private edges: any;
  private order: any;
  private idMap: any;
  private orderType: string;
  private scalarMatrix: any;
  private provenance: any;
  private app: any;
  private maxTracker: any;

  constructor(graphStructure: {nodes: object[], links: object[]}) {
    this.graphStructure = graphStructure;
    this.nodes = graphStructure.nodes;
    this.edges = graphStructure.links;
    this.sortKey = 'name';

    this.matrix = [];
    this.scalarMatrix = [];

    d3.image('../../assets/adj-matrix/alphabeticalSort.svg')
    .then(function(error: any, svg: any) {
      this.alphabeticalSortSvg = svg;
    })

    d3.image('../../assets/adj-matrix/categoricalSort.svg')
    .then(function(error: any, svg: any) {
      this.categoricalSortSvg = svg;
    })

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

    // this.populateSearchBox();
    this.idMap = {};

    // sorts adjacency matrix, if a cluster method, sort by shortname, then cluster later
    // let clusterFlag = false;
    // if ("clusterBary" in ['clusterBary', 'clusterLeaf', 'clusterSpectral']) {
    //   this.orderType = 'shortName';//this.controller.sortKey;
    //   clusterFlag = true;
    // } else {
    //   // this.orderType = this.controller.sortKey;
    // }

    // this.order = this.changeOrder(this.orderType);

    // sorts quantitative by descending value, sorts qualitative by alphabetical
    // if (!this.isQuant(this.orderType)) {
    //   this.nodes = this.nodes.sort((a, b) => a[this.orderType].localeCompare(b[this.orderType]));
    // } else {
    //   this.nodes = this.nodes.sort((a, b) => { return b[this.orderType] - a[this.orderType]; });
    // }

    this.nodes.forEach((node: {index: number, id: string}, index: number) => {
      node.index = index;
      this.idMap[node.id] = index;
    });

    // this.processData();

    // if (clusterFlag) {
    //   this.orderType = this.sortKey;
    //   this.order = this.changeOrder(this.orderType);
    // }

    // Check if the model exists yet. If not, we shouldn't be loading in the data
    // if (this.controller.model) {
    //   this.controller.loadData(this.nodes, this.edges, this.matrix);
    // }

    // [this.app, this.provenance] = this.setUpProvenance()

  }

  /**
   * Determines if the attribute is quantitative
   * @param  attr [string that corresponds to attribute type]
   * @return      [description]
   */
  private isQuant(attr) {
    // if not in list
    // if (!Object.keys(this.controller.attributeScales.node).includes(attr)) {
    //   return false;
    // } else if (this.controller.attributeScales.node[attr].range === undefined) {
    //   return true;
    // } else {
    //   return false;
    // }

    return false;
  }


  private populateSearchBox() {
    d3.select('#search-input')
    .attr('list', 'characters');
    
    let inputParent = d3.select('#search-input')
    .node()
    .parentNode;

    let datalist = d3.select(inputParent)
    .selectAll('#characters')
    .data([0]);

    let enterSelection = datalist.enter()
    .append('datalist')
    .attr('id', 'characters');

    datalist.exit().remove();

    datalist = enterSelection.merge(datalist);

    let options = datalist.selectAll('option').data(this.nodes);

    let optionsEnter = options.enter().append('option');
    options.exit().remove();

    options = optionsEnter.merge(options);
    options.attr('value', d => d._key);
    options.attr('id', d => d.id);

    d3.select('#search-input')
    .on('change', (d,i,nodes) => {
      let selectedOption = d3.select(nodes[i]).property('value');
    });
  }

  /**
   * returns an object containing the current provenance state.
   * @return [the provenance state]
   */
  private getApplicationState() {
    return this.provenance.graph().current.state
  }

  /**
   * Initializes the provenance library and sets observers.
   * @return [none]
   */
  private setUpProvenance() {
    const initialState = {
      workerID: workerID, // workerID is a global variable
      nodes: '',//array of nodes that keep track of their position, whether they were softSelect or hardSelected;
      search: '', //field to store the id of a searched node;
      startTime: Date.now(), //time this provenance graph was created and the task initialized;
      endTime: '', // time the submit button was pressed and the task ended;
      time: Date.now(), //timestamp for the current state of the graph;
      count: 0,
      clicked: [],
      sortKey: this.sortKey,
      selections: {
        answerBox: {},
        attrRow: {},
        rowLabel: {},
        colLabel: {},
        neighborSelect: {},
        cellcol: {},
        cellrow: {},
        search: {},
        previousMouseovers: []
      }
    };

    const provenance = ProvenanceLibrary.initProvenance(initialState);
    this.provenance = provenance;

    const app = this.getApplicationState();
    this.app = app;

    // creates the document with the name and worker ID

    let columnElements = ['topoCol'];
    let rowElements = ['topoRow', 'attrRow']

    let elementNamesFromSelection = {
      cellcol: rowElements.concat(columnElements),
      colLabel: rowElements.concat(columnElements).concat(['colLabel']),
      rowLabel: rowElements.concat(columnElements).concat(['rowLabel']),
      attrRow: rowElements.concat(['rowLabel']),
      cellrow: rowElements.concat(columnElements),
      neighborSelect: rowElements,
      answerBox: rowElements.concat(columnElements),
      search: rowElements.concat(columnElements)
    }

    function classAllHighlights(state) {

      let clickedElements = new Set();
      let answerElements = new Set();
      let neighborElements = new Set();

      for (node of state.clicked) {
        clickedElements.add('#colLabel' + node)
        clickedElements.add('#topoCol' + node)
        clickedElements.add('#topoRow' + node)
      }

      // go through each interacted element, and determine which rows/columns should
      // be highlighted due to it's interaction
      for (let selectionType in state.selections) {
        if(selectionType == 'previousMouseovers') continue;
        for (let index in elementNamesFromSelection[selectionType]) {
          let selectionElement = elementNamesFromSelection[selectionType][index];

          for (let node in state.selections[selectionType]) {
            if (selectionType == 'neighborSelect') {
              neighborElements.add('#' + selectionElement + node)
            } else {

              // if both in attrRow and rowLabel, don't highlight element
              if (selectionType == 'attrRow' || selectionType == 'rowLabel') {
                if (node in state.selections['attrRow'] && node in state.selections['rowLabel']) continue;
              }

              // clickedElements.add('#' + selectionElement + node)
            }
          }

        }
      }

      let clickedSelectorQuery = Array.from(clickedElements).join(',')
      // let answerSelectorQuery = Array.from(answerElements).join(',')
      // let neighborSelectQuery = Array.from(neighborElements).join(',')

      clickedSelectorQuery != [] ? d3.selectAll(clickedSelectorQuery).classed('clicked', true) : null;
      // answerSelectorQuery != [] ? d3.selectAll(answerSelectorQuery).classed('answer', true) : null;
      // neighborSelectQuery != [] ? d3.selectAll(neighborSelectQuery).classed('neighbor', true) : null;

      return;
    }

    function setUpObservers() {
      let updateHighlights = (state) => {
        d3.selectAll('.clicked').classed('clicked', false);
        d3.selectAll('.answer').classed('answer', false);
        d3.selectAll('.neighbor').classed('neighbor', false);

        classAllHighlights(state);
      };

      let updateCellClicks = (state) => {
        let cellNames = [];
        Object.keys(state.selections.cellcol).map(key => {
          let names = state.selections.cellcol[key];
          names.map(name => {
            let cellsNames = splitCellNames(name);
            cellNames = cellNames.concat(cellsNames)
          })

          //names.map(name=>{
          //})
        })
        let cellSelectorQuery = '#' + cellNames.join(',#')
        // if no cells selected, return
        d3.selectAll('.clickedCell').classed('clickedCell', false);
        if (cellSelectorQuery == '#') return;
        d3.selectAll(cellSelectorQuery).selectAll('.baseCell').classed('clickedCell', true)

      }

      provenance.addObserver('selections.attrRow', updateHighlights)
      provenance.addObserver('selections.rowLabel', updateHighlights)
      provenance.addObserver('selections.colLabel', updateHighlights)
      provenance.addObserver('selections.cellcol', updateHighlights)
      provenance.addObserver('selections.cellrow', updateHighlights)
      provenance.addObserver('selections.neighborSelect', updateHighlights)
      provenance.addObserver('selections.cellcol', updateCellClicks)

      provenance.addObserver('selections.search', updateHighlights)
      provenance.addObserver('selections.answerBox', updateHighlights)

      provenance.addObserver('clicked', updateHighlights)
    }
    setUpObservers();

    return [app, provenance];
  }


  private reload() {
    this.controller.loadData(this.nodes, this.edges, this.matrix);
  }


  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  private generateSortAction(sortKey) {
    return {
      label: 'sort',
      action: (sortKey) => {
        const currentState = this.getApplicationState();
        //add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = 'sort';

        currentState.sortKey = sortKey
        if(this.controller.view,this.controller.view.mouseoverEvents){
          currentState.selections.previousMouseovers = this.controller.view.mouseoverEvents;
          this.controller.view.mouseoverEvents.length = 0;
        }

        return currentState;
      },
      args: [sortKey]
    }
  }


  /**
   *   Determines the order of the current nodes
   * @param  type A string corresponding to the attribute screen_name to sort by.
   * @return      A numerical range in corrected order.
   */
  private changeOrder(type: string, node: boolean = false) {

    let action = this.generateSortAction(type);
    if(this.provenance){
      this.provenance.applyAction(action);
    }

    return this.sortObserver(type,node);
  }

  private sortObserver(type: string, node: boolean = false){
    let order;
    this.sortKey = type;
    this.orderType = type;
    if (type == 'clusterSpectral' || type == 'clusterBary' || type == 'clusterLeaf') {
      var graph = reorder.graph()
        .nodes(this.nodes)
        .links(this.edges)
        .init();

      if (type == 'clusterBary') {
        var barycenter = reorder.barycenter_order(graph);
        order = reorder.adjacent_exchange(graph, barycenter[0], barycenter[1])[1];
      } else if (type == 'clusterSpectral') {
        order = reorder.spectral_order(graph);
      } else if (type == 'clusterLeaf') {
        let mat = reorder.graph2mat(graph);
        order = reorder.optimal_leaf_order()(mat);
      }
      //order = reorder.optimal_leaf_order()(this.scalarMatrix);
    } else if (this.orderType == 'edges') {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[b][type] - this.nodes[a][type]);
    } else if (node == true) {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[a]['id'].localeCompare(this.nodes[b]['id']));
      order = d3.range(this.nodes.length).sort((a, b) => { return this.nodes[b]['neighbors'].includes(type) - this.nodes[a]['neighbors'].includes(type); });
    } else if (false /*!this.isQuant(this.orderType)*/) {// == "screen_name" || this.orderType == "name") {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[a][this.orderType].localeCompare(this.nodes[b][this.orderType]));
    } else {
      order = d3.range(this.nodes.length).sort((a, b) => { return this.nodes[b][type] - this.nodes[a][type]; });
    }

    this.order = order;
    return order;
  }


  /**
   * [processData description]
   * @return [description]
   */
  public processData() {
    // generate a hashmap of id's?
    // Set up node data
    this.nodes.forEach((rowNode, i) => {
      /* matrix used for edge attributes, otherwise should we hide */
      this.matrix[i] = this.nodes.map((colNode) => { return { cellName: 'cell' + rowNode.id + '_' + colNode.id, correspondingCell: 'cell' + colNode.id+ '_' + rowNode.id, rowid: rowNode.id, colid: colNode.id, x: colNode.index, y: rowNode.index, count: 0, z: 0, interacted: 0, retweet: 0, mentions: 0 }; });
      this.scalarMatrix[i] = this.nodes.map(function(colNode) { return 0; });
    });

    this.maxTracker = { 'reply': 0, 'retweet': 0, 'mentions': 0 }
    // Convert links to matrix; count character occurrences.
    this.edges.forEach((link) => {
      this.matrix[this.idMap[link.source]][this.idMap[link.target]][link.type] += link.count;
      this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;

      /* could be used for varying edge types */
      //this.maxTracker = { 'reply': 3, 'retweet': 3, 'mentions': 2 }
      this.matrix[this.idMap[link.source]][this.idMap[link.target]].z += 1;
      this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += 1;


      this.matrix[this.idMap[link.source]][this.idMap[link.target]].count += 1;
      this.matrix[this.idMap[link.target]][this.idMap[link.source]].count += 1;
      // if not directed, increment the other values
      // if (!isDirected) {
      //   this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += addValue;
      //   this.matrix[this.idMap[link.target]][this.idMap[link.source]][link.type] += link.count;
      //   this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;

      // }
      link.source = this.idMap[link.source];
      link.target = this.idMap[link.target];
    });
  }

  public getOrder() {
    return this.order;
  }

  /**
   * Returns the node data.
   * @return Node data in JSON Array
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Returns the edge data.
   * @return Edge data in JSON Array
   */
  getEdges() {
    return this.edges;
  }

}