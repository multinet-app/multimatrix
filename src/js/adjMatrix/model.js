var Model = /** @class */ (function () {
    function Model(controller) {
        var _a;
        var _this = this;
        this.controller = controller;
        this.graph = graph;
        this.nodes = graph.nodes;
        this.edges = graph.links;
        this.sortKey = "name";
        this.matrix = [];
        this.scalarMatrix = [];
        // d3.image('../../assets/adj-matrix/alphabeticalSort.svg')
        // .then(function(error, svg) {
        //   this.alphabeticalSortSvg = svg;
        // })
        // d3.image('../../assets/adj-matrix/categoricalSort.svg')
        // .then(function(error, svg) {
        //   this.categoricalSortSvg = svg;
        // })
        // = "M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3 C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z";
        this.icons = {
            'quant': {
                'd': "M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z"
            },
            'alphabetical': {
                'd': "M401.1,331.2h-189c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.8C407.7,334.2,404.8,331.2,401.1,331.2z M223.7,344.3H266c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-42.3V344.3z M223.7,373H300c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-76.3V373.7z M263.6,447.8c0,2-1.6,3.6-3.6,3.6h-36.4v-18.8H260c2,0,3.6,1.6,3.6,3.6V447.8z M321.5,418.4c0,2-1.6,3.6-3.6,3.6h-94.2v-18.8h94.2c2,0,3.6,1.6,3.6,3.6V418.4z M392.6,449.5h-34.3V442l22.6-27h-21.7v-8.8h33.2v7.5l-21.5,27h21.7V449.5z M381,394.7l-3.7,6.4l-3.7-6.4h2.7v-14.6h2v14.6H381z M387,380l-3.4-9.7h-13.5l-3.3,9.7h-10.2l15.8-43.3h9l15.8,43.3H387z M371.8,363.4H382l-5.1-15.3L371.8,363.4z"
            },
            'categorical': {
                'd': "M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.4C407.7,333.7,404.7,330.7,401,330.7z M272.9,374.3h-52.4v-17.1h52.4V374.3z M272.9,354h-52.4v-17h52.4V354z M332.1,414.9h-52.4v-17h52.4V414.9z M332.1,394.6h-52.4v-17h52.4V394.6z M394.8,456.5h-52.4v-17h52.4V456.5z M394.8,434.9h-52.4v-17h52.4V434.9z"
            },
            'cellSort': {
                'd': "M115.3,0H6.6C3,0,0,3,0,6.6V123c0,3.7,3,6.6,6.6,6.6h108.7c3.7,0,6.6-3,6.6-6.6V6.6C122,3,119,0,115.3,0zM37.8,128.5H15.1V1.2h22.7V128.5z"
            }
        };
        this.populateSearchBox();
        this.idMap = {};
        // sorts adjacency matrix, if a cluster method, sort by shortname, then cluster later
        var clusterFlag = false;
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
        this.nodes.forEach(function (node, index) {
            node.index = index;
            _this.idMap[node.id] = index;
        });
        this.processData();
        // if (clusterFlag) {
        //   this.orderType = this.sortKey;
        //   this.order = this.changeOrder(this.orderType);
        // }
        // Check if the model exists yet. If not, we shouldn't be loading in the data
        if (this.controller.model) {
            this.controller.loadData(this.nodes, this.edges, this.matrix);
        }
        _a = this.setUpProvenance(), this.app = _a[0], this.provenance = _a[1];
    }
    /**
     * Determines if the attribute is quantitative
     * @param  attr [string that corresponds to attribute type]
     * @return      [description]
     */
    Model.prototype.isQuant = function (attr) {
        // if not in list
        // if (!Object.keys(this.controller.attributeScales.node).includes(attr)) {
        //   return false;
        // } else if (this.controller.attributeScales.node[attr].range === undefined) {
        //   return true;
        // } else {
        //   return false;
        // }
        return false;
    };
    Model.prototype.populateSearchBox = function () {
        d3.select("#search-input")
            .attr("list", "characters");
        var inputParent = d3.select("#search-input")
            .node()
            .parentNode;
        var datalist = d3.select(inputParent)
            .selectAll('#characters')
            .data([0]);
        var enterSelection = datalist.enter()
            .append("datalist")
            .attr("id", "characters");
        datalist.exit().remove();
        datalist = enterSelection.merge(datalist);
        var options = datalist.selectAll("option").data(this.nodes);
        var optionsEnter = options.enter().append("option");
        options.exit().remove();
        options = optionsEnter.merge(options);
        options.attr("value", function (d) { return d.name; });
        options.attr("id", function (d) { return d.id; });
        d3.select("#search-input")
            .on("change", function (d, i, nodes) {
            var selectedOption = d3.select(nodes[i]).property("value");
        });
    };
    /**
     * returns an object containing the current provenance state.
     * @return [the provenance state]
     */
    Model.prototype.getApplicationState = function () {
        return this.provenance.graph().current.state;
    };
    /**
     * Initializes the provenance library and sets observers.
     * @return [none]
     */
    Model.prototype.setUpProvenance = function () {
        var initialState = {
            workerID: workerID,
            nodes: '',
            search: '',
            startTime: Date.now(),
            endTime: '',
            time: Date.now(),
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
        var provenance = ProvenanceLibrary.initProvenance(initialState);
        this.provenance = provenance;
        var app = this.getApplicationState();
        this.app = app;
        // creates the document with the name and worker ID
        var columnElements = ['topoCol'];
        var rowElements = ['topoRow', 'attrRow'];
        var elementNamesFromSelection = {
            cellcol: rowElements.concat(columnElements),
            colLabel: rowElements.concat(columnElements).concat(['colLabel']),
            rowLabel: rowElements.concat(columnElements).concat(['rowLabel']),
            attrRow: rowElements.concat(['rowLabel']),
            cellrow: rowElements.concat(columnElements),
            neighborSelect: rowElements,
            answerBox: rowElements.concat(columnElements),
            search: rowElements.concat(columnElements)
        };
        function classAllHighlights(state) {
            console.log("classallhighlights state", state);
            var clickedElements = new Set();
            var answerElements = new Set();
            var neighborElements = new Set();
            for (var _i = 0, _a = state.clicked; _i < _a.length; _i++) {
                node = _a[_i];
                clickedElements.add('#colLabel' + node);
                clickedElements.add('#topoCol' + node);
                clickedElements.add('#topoRow' + node);
            }
            // go through each interacted element, and determine which rows/columns should
            // be highlighted due to it's interaction
            for (var selectionType in state.selections) {
                if (selectionType == 'previousMouseovers')
                    continue;
                for (var index in elementNamesFromSelection[selectionType]) {
                    var selectionElement = elementNamesFromSelection[selectionType][index];
                    for (var node in state.selections[selectionType]) {
                        if (selectionType == 'neighborSelect') {
                            neighborElements.add('#' + selectionElement + node);
                        }
                        else {
                            // if both in attrRow and rowLabel, don't highlight element
                            if (selectionType == 'attrRow' || selectionType == 'rowLabel') {
                                if (node in state.selections['attrRow'] && node in state.selections['rowLabel'])
                                    continue;
                            }
                            // clickedElements.add('#' + selectionElement + node)
                        }
                    }
                }
            }
            var clickedSelectorQuery = Array.from(clickedElements).join(',');
            console.log(clickedSelectorQuery);
            // let answerSelectorQuery = Array.from(answerElements).join(',')
            // let neighborSelectQuery = Array.from(neighborElements).join(',')
            clickedSelectorQuery != [] ? d3.selectAll(clickedSelectorQuery).classed('clicked', true) : null;
            // answerSelectorQuery != [] ? d3.selectAll(answerSelectorQuery).classed('answer', true) : null;
            // neighborSelectQuery != [] ? d3.selectAll(neighborSelectQuery).classed('neighbor', true) : null;
            return;
        }
        function setUpObservers() {
            var updateHighlights = function (state) {
                d3.selectAll('.clicked').classed('clicked', false);
                d3.selectAll('.answer').classed('answer', false);
                d3.selectAll('.neighbor').classed('neighbor', false);
                classAllHighlights(state);
            };
            var updateCellClicks = function (state) {
                var cellNames = [];
                Object.keys(state.selections.cellcol).map(function (key) {
                    var names = state.selections.cellcol[key];
                    names.map(function (name) {
                        var cellsNames = splitCellNames(name);
                        cellNames = cellNames.concat(cellsNames);
                    });
                    //names.map(name=>{
                    //})
                });
                var cellSelectorQuery = '#' + cellNames.join(',#');
                // if no cells selected, return
                d3.selectAll('.clickedCell').classed('clickedCell', false);
                if (cellSelectorQuery == '#')
                    return;
                d3.selectAll(cellSelectorQuery).selectAll('.baseCell').classed('clickedCell', true);
            };
            provenance.addObserver("selections.attrRow", updateHighlights);
            provenance.addObserver("selections.rowLabel", updateHighlights);
            provenance.addObserver("selections.colLabel", updateHighlights);
            provenance.addObserver("selections.cellcol", updateHighlights);
            provenance.addObserver("selections.cellrow", updateHighlights);
            provenance.addObserver("selections.neighborSelect", updateHighlights);
            provenance.addObserver("selections.cellcol", updateCellClicks);
            provenance.addObserver("selections.search", updateHighlights);
            provenance.addObserver("selections.answerBox", updateHighlights);
            provenance.addObserver("clicked", classAllHighlights);
        }
        setUpObservers();
        return [app, provenance];
    };
    Model.prototype.reload = function () {
        this.controller.loadData(this.nodes, this.edges, this.matrix);
    };
    /**
     * [changeInteractionWrapper description]
     * @param  nodeID ID of the node being changed with
     * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
     * @param  interactionType class name of element interacted with
     * @return        [description]
     */
    Model.prototype.generateSortAction = function (sortKey) {
        var _this = this;
        return {
            label: 'sort',
            action: function (sortKey) {
                var currentState = _this.controller.model.app.currentState();
                //add time stamp to the state graph
                currentState.time = Date.now();
                currentState.event = 'sort';
                currentState.sortKey = sortKey;
                if (_this.controller.view, _this.controller.view.mouseoverEvents) {
                    currentState.selections.previousMouseovers = _this.controller.view.mouseoverEvents;
                    _this.controller.view.mouseoverEvents.length = 0;
                }
                return currentState;
            },
            args: [sortKey]
        };
    };
    /**
     *   Determines the order of the current nodes
     * @param  type A string corresponding to the attribute screen_name to sort by.
     * @return      A numerical range in corrected order.
     */
    Model.prototype.changeOrder = function (type, node) {
        if (node === void 0) { node = false; }
        var action = this.generateSortAction(type);
        if (this.provenance) {
            this.provenance.applyAction(action);
        }
        return this.sortObserver(type, node);
    };
    Model.prototype.sortObserver = function (type, node) {
        var _this = this;
        if (node === void 0) { node = false; }
        var order;
        // this.orderType = type;
        // this.sortKey = type;
        type = "edges";
        if (type == "clusterSpectral" || type == "clusterBary" || type == "clusterLeaf") {
            var graph = reorder.graph()
                .nodes(this.nodes)
                .links(this.edges)
                .init();
            if (type == "clusterBary") {
                var barycenter = reorder.barycenter_order(graph);
                order = reorder.adjacent_exchange(graph, barycenter[0], barycenter[1])[1];
            }
            else if (type == "clusterSpectral") {
                order = reorder.spectral_order(graph);
            }
            else if (type == "clusterLeaf") {
                var mat = reorder.graph2mat(graph);
                order = reorder.optimal_leaf_order()(mat);
            }
            //
            //order = reorder.optimal_leaf_order()(this.scalarMatrix);
        }
        else if (this.orderType == 'edges') {
            order = d3.range(this.nodes.length).sort(function (a, b) { return _this.nodes[b][type].length - _this.nodes[a][type].length; });
        }
        else if (node == true) {
            order = d3.range(this.nodes.length).sort(function (a, b) { return _this.nodes[a]['shortName'].localeCompare(_this.nodes[b]['shortName']); });
            order = d3.range(this.nodes.length).sort(function (a, b) { return _this.nodes[b]['neighbors'].includes(parseInt(type)) - _this.nodes[a]['neighbors'].includes(parseInt(type)); });
        }
        else if (false /*!this.isQuant(this.orderType)*/) { // == "screen_name" || this.orderType == "name") {
            order = d3.range(this.nodes.length).sort(function (a, b) { return _this.nodes[a][_this.orderType].localeCompare(_this.nodes[b][_this.orderType]); });
        }
        else {
            order = d3.range(this.nodes.length).sort(function (a, b) { return _this.nodes[b][type] - _this.nodes[a][type]; });
        }
        this.order = order;
        return order;
    };
    /**
     * [processData description]
     * @return [description]
     */
    Model.prototype.processData = function () {
        var _this = this;
        // generate a hashmap of id's?
        // Set up node data
        this.nodes.forEach(function (rowNode, i) {
            rowNode.count = 0;
            /* Numeric Conversion */
            rowNode.followers_count = +rowNode.followers_count;
            rowNode.query_tweet_count = +rowNode.query_tweet_count;
            rowNode.friends_count = +rowNode.friends_count;
            rowNode.statuses_count = +rowNode.statuses_count;
            rowNode.favourites_count = +rowNode.favourites_count;
            rowNode.count_followers_in_query = +rowNode.count_followers_in_query;
            //rowNode.id = +rowNode.id;
            rowNode.y = i;
            /* matrix used for edge attributes, otherwise should we hide */
            _this.matrix[i] = _this.nodes.map(function (colNode) { return { cellName: 'cell' + rowNode.id + '_' + colNode.id, correspondingCell: 'cell' + colNode.id + '_' + rowNode.id, rowid: rowNode.id, colid: colNode.id, x: colNode.index, y: rowNode.index, count: 0, z: 0, interacted: 0, retweet: 0, mentions: 0 }; });
            _this.scalarMatrix[i] = _this.nodes.map(function (colNode) { return 0; });
        });
        function checkEdge(edge) {
            if (typeof edge.source !== "number")
                return false;
            if (typeof edge.target !== "number")
                return false;
            return true;
        }
        this.edges = this.edges.filter(checkEdge);
        this.maxTracker = { 'reply': 0, 'retweet': 0, 'mentions': 0 };
        // Convert links to matrix; count character occurrences.
        this.edges.forEach(function (link) {
            var addValue = 1;
            _this.matrix[_this.idMap[link.source]][_this.idMap[link.target]][link.type] += link.count;
            //
            _this.scalarMatrix[_this.idMap[link.source]][_this.idMap[link.target]] += link.count;
            /* could be used for varying edge types */
            //this.maxTracker = { 'reply': 3, 'retweet': 3, 'mentions': 2 }
            _this.matrix[_this.idMap[link.source]][_this.idMap[link.target]].z += addValue;
            _this.matrix[_this.idMap[link.source]][_this.idMap[link.target]].count += 1;
            // if not directed, increment the other values
            // if (!isDirected) {
            //   this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += addValue;
            //   this.matrix[this.idMap[link.target]][this.idMap[link.source]][link.type] += link.count;
            //   this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;
            // }
            link.source = _this.idMap[link.source];
            link.target = _this.idMap[link.target];
        });
    };
    Model.prototype.getOrder = function () {
        return this.order;
    };
    /**
     * Returns the node data.
     * @return Node data in JSON Array
     */
    Model.prototype.getNodes = function () {
        return this.nodes;
    };
    /**
     * Returns the edge data.
     * @return Edge data in JSON Array
     */
    Model.prototype.getEdges = function () {
        return this.edges;
    };
    return Model;
}());
