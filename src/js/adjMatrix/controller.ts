// Work on importing class file
class Controller {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private view: any;
  private model: any;
  public configToggle: boolean;
  private sortKey: any;
  private clickedCells: any;
  private hoverRow: any;
  private hoverCol: any;

  setupExports(base, task) {
    d3.select("#exportBaseConfig").on("click", function() {
      exportConfig(Object.keys(base), Object.keys(base.adjMatrix), false)
    });

    d3.select("#exportConfig").on("click", function() {
      exportConfig(Object.keys(task), Object.keys(task.adjMatrixValues), true)
    });
  }

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

  sizeLayout() {
    let targetDiv = d3.select("#targetSize");
    let width = targetDiv.style("width").replace("px", "");
    let height = targetDiv.style("height").replace("px", "");
    let taskBarHeight = 74;
    let panelDimensions = {}
    panelDimensions.width = 480;
    panelDimensions.height = height - taskBarHeight;
    d3.select("#visPanel").style("width: 100vw;");
    d3.select("#visPanel").style("height: 100vh;");

    document.getElementById("visContent").style.width = '100vw';
    // document.getElementById("visContent").style.overflowX = "scroll";

    this.visHeight = panelDimensions.height;
    this.visWidth = width - panelDimensions.width - 15;
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
    this.hoverRow = {};
    this.hoverCol = {};
    this.datumID = 'id';
    this.clickedCells = new Set()

    this.configToggle = configPanel === "true";

    this.sizeLayout();

    this.view = new View(this); // initialize view,
    this.model = new Model(this); // start reading in data

    d3.select('.loading').style('display', 'block');
    this.model.reload();
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
    this.sortKey = order;
    return this.model.changeOrder(order,node);
  }
}

function makeController() {
  window.controller = new Controller();
  addConfigPanel();
}
