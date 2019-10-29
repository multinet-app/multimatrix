// Work on importing class file
class Controller {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private view: any;
  private model: any;
  private configuration: any;

  setupExports(base, task) {
    d3.select("#exportBaseConfig").on("click", function() {
      exportConfig(Object.keys(base), Object.keys(base.adjMatrix), false)
    });

    d3.select("#exportConfig").on("click", function() {
      exportConfig(Object.keys(task), Object.keys(task.adjMatrixValues), true)
    });
  }
  setupCSS(base) {
    return;
    /*set css values for 'clicked' nodes;
    //set fill or stroke of selected node;

    //find the appropriate style sheet
    var sheet = Object.values(document.styleSheets).find(s =>
      s.href.includes("styles.css")
    );

    // sheet.addRule(".node", (nodeIsRect? 'rx: 2; ry:2'  : 'rx:20; ry:20' ) , 1);

      let ruleString = "fill :" + base.style.selectedNodeColor +" !important;";
      sheet.addRule(".rect.selected", ruleString, 1);
      */

  }

  

  private tasks: any;
  private taskNum: number;

  loadTask(taskNum) {
    // edgeBars = true;
    // if (this.task.replyType.includes('singleNodeSelection') || this.task.replyType.includes('multipleNodeSelection')) {
    //   if (!this.configuration.nodeAttributes.includes('selected')) {
    //     this.configuration.nodeAttributes.unshift('selected');
        let obj = {
          "domain": [true, false],
          "range": ["#e86b45", '#fff'],
          "labels": ['answer', 'not answer'],
          'glyph': 'rect',
          'label': 'selected'
        }
    //     this.configuration.attributeScales.node['selected'] = obj;

    //   }


    // }
    // this.configuration.adjMatrix['toggle'] = false;
    // //this.configuration.adjMatrix.neighborSelect = true;

    // this.attrWidth = d3.min([150 * this.configuration.nodeAttributes.length, 650]);

    // this.configuration.state = {}
    // this.configuration.state.adjMatrix = {};
    // if (this.configuration.adjMatrix.sortKey == null || this.configuration.adjMatrix.sortKey == '') {
    let sortKey = 'name'
    // }

    this.sizeLayout();
    //configuration.adjMatrix.sortKey
  }

  private clickedCells: any;
  clear() {

      let action = {
        label: 'clear',
        action: () => {
          const currentState = this.model.app.currentState();
          //add time stamp to the state graph
          currentState.time = Date.now();
          currentState.event = 'clear';
          currentState.selections = {
            answerBox: {},
            attrRow: {},
            rowLabel: {},
            colLabel: {},
            cellcol: {},
            cellrow: {},
            search: {},
            neighborSelect: {},
            previousMouseovers: []
          }
          return currentState;
        },
        args: []
      }
      this.model.provenance.applyAction(action);


  }


  private hoverRow: any;
  private hoverCol: any;

  sizeLayout() {
    let targetDiv = d3.select("#targetSize");
    let width = targetDiv.style("width").replace("px", ""),
      height = targetDiv.style("height").replace("px", "");
    let taskBarHeight = 74;
    let panelDimensions = {}
    /*panelDimensions.width = width * 0.245;*/
    panelDimensions.width = 480//d3.select("#visPanel").style("width")//, panelDimensions.width + "px");
    panelDimensions.height = height - taskBarHeight;
    d3.select("#visPanel").style("width", panelDimensions.width + "px");
    d3.select("#visPanel").style("height", panelDimensions.height + "px");


    d3.select('#panelDiv').style('display', 'none');
    document.getElementById("visContent").style.width = '100vw';
    document.getElementById("visContent").style.overflowX = "scroll";

    this.visHeight = panelDimensions.height;
    this.visWidth = width - panelDimensions.width - 10;
    this.edgeWidth = this.visWidth - this.attrWidth;

    let filler = 0;
    if (panelDimensions.height < this.edgeWidth) {
      this.edgeWidth = panelDimensions.height;
      filler = this.visWidth - this.attrWidth - this.edgeWidth;
      this.visWidth = this.visWidth;
    }


    this.attributeProportion = this.attrWidth / (this.edgeWidth + this.attrWidth + filler);
    this.edgeProportion = this.edgeWidth / (this.edgeWidth + this.attrWidth + filler);

    if (this.edgeWidth < panelDimensions.height) {
      this.visHeight = this.visWidth * this.edgeProportion;
    }

    d3.select('.topocontainer').style('width', (100 * this.edgeProportion).toString() + '%');
    d3.select('.topocontainer').style('height', (this.visHeight).toString() + 'px');
    d3.select('.attrcontainer').style('width', (100 * this.attributeProportion).toString() + '%');
    d3.select('.attrcontainer').style('height', (this.visHeight).toString() + 'px');


    //d3.select('.adjMatrix.vis').style('width',width*0.8);
    d3.select('.adjMatrix.vis').style('width', (this.visWidth).toString() + 'px')
  }

  constructor() {
    console.log("constructing controller")
    this.hoverRow = {};
    this.hoverCol = {};
    this.datumID = 'id';
    this.clickedCells = new Set();

    this.sizeLayout();

    this.view = new View(this); // initalize view,
    console.log("added this.view")

    this.model = new Model(this); // start reading in data
    console.log("added this.model")

    this.model.reload();

    d3.select('.loading').style('display', 'block');
  }

  clearView() {
    d3.select('.tooltip').remove();
    d3.select('#topology').selectAll('*').remove();
    d3.select('#attributes').selectAll('*').remove();
    d3.select('#legend-svg').selectAll('*').remove();

  }

  reload() {
    console.log("reloading controller")
    this.clearView();
    d3.select('.loading').style('display', 'block');

    this.view = new View(this);
    console.log("controller.view exists")
    this.model = new Model(this);
    console.log("controller.model exists")
    startTime = Date.now();

    this.loadData();

    //this.model = new Model(this); // start reading in data
  }

  /**
   * Passes the processed edge and node data to the view.
   * @return None
   */
  loadData(nodes: any, edges: any, matrix: any) {
    this.view.loadData(nodes, edges, matrix);
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  getOrder() {
    return this.model.getOrder();
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  changeOrder(order: string, node : boolean = false) {
    // this.configuration.adjMatrix.sortKey = order;
    // return this.model.changeOrder(order,node);
  }
}

function makeController() {
  window.controller = new Controller();
}
