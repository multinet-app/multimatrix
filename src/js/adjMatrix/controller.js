// Work on importing class file
var Controller = /** @class */ (function () {
    function Controller() {
        this.hoverRow = {};
        this.hoverCol = {};
        this.datumID = 'id';
        this.clickedCells = new Set();
        this.sizeLayout();
        this.finishConstructing();
    }
    Controller.prototype.setupExports = function (base, task) {
        d3.select("#exportBaseConfig").on("click", function () {
            exportConfig(Object.keys(base), Object.keys(base.adjMatrix), false);
        });
        d3.select("#exportConfig").on("click", function () {
            exportConfig(Object.keys(task), Object.keys(task.adjMatrixValues), true);
        });
    };
    Controller.prototype.setupCSS = function (base) {
        return;
        /*set css values for 'clicked' nodes;
        //set fill or stroke of selected node;
    
        //find the appropriate style sheet
        var sheet = Object.values(document.styleSheets).find(s =>
          s.href.includes("styles.css")
        );
    
        // let nodeIsRect = config.style.nodeShape === 'rect';
        // sheet.addRule(".node", (nodeIsRect? 'rx: 2; ry:2'  : 'rx:20; ry:20' ) , 1);
    
          let ruleString = "fill :" + base.style.selectedNodeColor +" !important;";
          sheet.addRule(".rect.selected", ruleString, 1);
          */
    };
    Controller.prototype.finishConstructing = function () {
        this.view = new View(this); // initalize view,
        this.model = new Model(this); // start reading in data
    };
    Controller.prototype.loadTask = function (taskNum) {
        // edgeBars = true;
        // if (this.task.replyType.includes('singleNodeSelection') || this.task.replyType.includes('multipleNodeSelection')) {
        //   if (!this.configuration.nodeAttributes.includes('selected')) {
        //     this.configuration.nodeAttributes.unshift('selected');
        var obj = {
            "domain": [true, false],
            "range": ["#e86b45", '#fff'],
            "labels": ['answer', 'not answer'],
            'glyph': 'rect',
            'label': 'selected'
        };
        //     this.configuration.attributeScales.node['selected'] = obj;
        //   }
        // }
        // this.configuration.adjMatrix['toggle'] = false;
        // //this.configuration.adjMatrix.neighborSelect = true;
        // this.attrWidth = d3.min([150 * this.configuration.nodeAttributes.length, 650]);
        // this.configuration.state = {}
        // this.configuration.state.adjMatrix = {};
        // if (this.configuration.adjMatrix.sortKey == null || this.configuration.adjMatrix.sortKey == '') {
        var sortKey = 'name';
        // }
        this.sizeLayout();
        //configuration.adjMatrix.sortKey
        this.reload();
    };
    Controller.prototype.clear = function () {
        var _this = this;
        var action = {
            label: 'clear',
            action: function () {
                var currentState = _this.model.app.currentState();
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
                };
                return currentState;
            },
            args: []
        };
        this.model.provenance.applyAction(action);
    };
    Controller.prototype.sizeLayout = function () {
        var targetDiv = d3.select("#targetSize");
        var width = targetDiv.style("width").replace("px", ""), height = targetDiv.style("height").replace("px", "");
        var taskBarHeight = 74;
        var panelDimensions = {};
        /*panelDimensions.width = width * 0.245;*/
        panelDimensions.width = 480; //d3.select("#visPanel").style("width")//, panelDimensions.width + "px");
        panelDimensions.height = height - taskBarHeight;
        d3.select("#visPanel").style("width", panelDimensions.width + "px");
        d3.select("#visPanel").style("height", panelDimensions.height + "px");
        d3.select('#panelDiv').style('display', 'none');
        document.getElementById("visContent").style.width = '100vw';
        document.getElementById("visContent").style.overflowX = "scroll";
        this.visHeight = panelDimensions.height;
        this.visWidth = width - panelDimensions.width - 10;
        this.edgeWidth = this.visWidth - this.attrWidth;
        var filler = 0;
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
        d3.select('.adjMatrix.vis').style('width', (this.visWidth).toString() + 'px');
    };
    Controller.prototype.clearView = function () {
        d3.select('.tooltip').remove();
        d3.select('#topology').selectAll('*').remove();
        d3.select('#attributes').selectAll('*').remove();
        d3.select('#legend-svg').selectAll('*').remove();
    };
    Controller.prototype.reload = function () {
        this.clearView();
        d3.select('.loading').style('display', 'block');
        this.view = new View(this); // initalize view,
        this.model = new Model(this); //.reload();
        startTime = Date.now();
        //this.model = new Model(this); // start reading in data
    };
    /**
     * Passes the processed edge and node data to the view.
     * @return None
     */
    Controller.prototype.loadData = function (nodes, edges, matrix) {
        this.view.loadData(nodes, edges, matrix);
    };
    /**
     * Obtains the order from the model and returns it to the view.
     * @return [description]
     */
    Controller.prototype.getOrder = function () {
        return this.model.getOrder();
    };
    /**
     * Obtains the order from the model and returns it to the view.
     * @return [description]
     */
    Controller.prototype.changeOrder = function (order, node) {
        if (node === void 0) { node = false; }
        // this.configuration.adjMatrix.sortKey = order;
        // return this.model.changeOrder(order,node);
    };
    return Controller;
}());
function makeController() {
    window.controller = new Controller();
}
