// Remove config panel if not in query string
function toggleConfig(configToggle) {
    if (configToggle === "false" || configToggle === "0" || !configToggle) {
        d3.selectAll('.development')
            .style("display", "None")
        configToggle = !configToggle
    } else {
        d3.selectAll('.development')
            .style("display", "")
        configToggle = !configToggle
    }

    return configToggle;
}

// Search for a node in the datalist
function searchForNode() {
    console.log("in search")
    let selectedOption = d3.select('.searchInput').property("value").trim();

    //empty search box;
    if (selectedOption.length === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Please enter a node name to search for!");
        return;
    }

    let searchSuccess = searchFor(selectedOption);

    if (searchSuccess === -1) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Could not find a node with that name!");
    }

    if (searchSuccess === 1) {
        d3.select(".searchMsg").style("display", "none");
    }

    if (searchSuccess === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text(selectedOption + " is already selected.");
    }

    return searchSuccess;
}

//function that searches for and 'clicks' on node, returns -1 if can't find that node, 0 if nodes is already selected, 1 if node exists and was not selected
function searchFor(selectedOption) {
    node = window.controller.model.graph.nodes.find(n => n.name.toLowerCase() === selectedOption.toLowerCase());

    if (node === undefined) {
        return -1;
    } else if (isSelected(node)) {
        return 0
    } else {
        nodeClick(node, true);
        return 1
    }
}

// function that checks the state to see if the node is selected
function isSelected(node) {
    const currentState = window.controller.model.getApplicationState();
    let clicked = currentState.clicked;
    return clicked.includes(node.id);
}

//function that updates the state, and includes a flag for when this was done through a search
function nodeClick(node, search = false) {
    console.log("in nodeclick")
        // console.log(node[0].rowid)

    if (node[0] != undefined) {
        node = { "id": node[0].rowid }
    }

    const currentState = window.controller.model.getApplicationState();
    let clicked = currentState.clicked;
    let wasSelected = isSelected(node);

    if (wasSelected) {
        clicked = clicked.filter(s => s !== node.id);
    } else {
        clicked.push(node.id);
    }

    // let neighbors_and_edges = tagNeighbors(clicked);

    let label = search ?
        "Searched for Node" :
        wasSelected ?
        "Unselect Node" :
        "Select Node";

    let action = {
        label: label,
        action: () => {
            const currentState = window.controller.model.getApplicationState();
            //add time stamp to the state graph
            currentState.time = Date.now();
            //Add label describing what the event was
            currentState.event = label;
            //Update actual node data
            currentState.clicked = clicked;
            // currentState.userSelectedNeighbors = neighbors_and_edges.neighbors;
            // currentState.userSelectedEdges = neighbors_and_edges.edges;
            //If node was searched, push him to the search array
            // if (search) {
            //     currentState.search.push(node.id);
            // }
            return currentState;
        },
        args: []
    };

    window.controller.model.provenance.applyAction(action);
}

function populateSearchList() {
    d3.select("#search-input").attr("list", "characters");
    let inputParent = d3.select("#search-input").node().parentNode;

    let datalist = d3
        .select(inputParent)
        .selectAll("#characters")
        .data([0]);

    let enterSelection = datalist
        .enter()
        .append("datalist")
        .attr("id", "characters");

    datalist.exit().remove();

    datalist = enterSelection.merge(datalist);

    let options = datalist.selectAll("option").data(vis.graph_structure.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d._key);
    options.attr("id", d => d.id);
}

function clearSelections() {
    let selected = [];
    let neighbors = [];
    let edges = [];
    let label = "Cleared selections";

    let action = {
        label: label,
        action: () => {
            const currentState = app.currentState();
            //add time stamp to the state graph
            currentState.time = Date.now();
            //Add label describing what the event was
            currentState.event = label;
            //Update actual node data
            currentState.selected = selected;
            currentState.userSelectedNeighbors = neighbors;
            currentState.userSelectedEdges = edges;
            return currentState;
        },
        args: []
    };

    provenance.applyAction(action);

}

function tagNeighbors(selected) {
    let neighbors = [];
    let edges = []

    for (clicked_node of selected) {
        if (!vis.simOn) {
            neighbor_nodes = vis.graph_structure.links.map((e, i) => e.source === clicked_node ? [e.target, vis.graph_structure.links[i].id] : e.target === clicked_node ? [e.source, vis.graph_structure.links[i].id] : "")
        } else {
            neighbor_nodes = vis.graph_structure.links.map((e, i) => e.source.id === clicked_node ? [e.target.id, vis.graph_structure.links[i].id] : e.target.id === clicked_node ? [e.source.id, vis.graph_structure.links[i].id] : "")
        }


        for (node of neighbor_nodes) {
            // push nodes
            if (node[0] !== "" && neighbors.indexOf(node[0]) === -1) {
                neighbors.push(node[0]);
            }

            // push edges
            if (node[1] !== "" && edges.indexOf(node[1]) === -1) {
                edges.push(node[1]);
            }
        }
    }

    return { "neighbors": neighbors, "edges": edges };
}

function addConfigPanel() {

    // Font size slider
    d3.select("#fontSlider")
        .on("input", function() {
            d3.select("#fontSliderValue").text(this.value);
            window.controller.view.set("nodeFontSize", this.value)
        });

    d3.select("#fontSlider")
        .property("value", window.controller.view.get("nodeFontSize"));

    d3.select("#fontSliderValue")
        .text(window.controller.view.get("nodeFontSize"));

    d3.select("#fontSlider")
        .on("change", function() {
            window.controller.view.updateVis();
        });

    // // Node size box
    // d3.select("#markerSize")
    //     .property("value", vis.nodeMarkerLength + "," + vis.nodeMarkerHeight);

    // d3.select("#markerSize")
    //     .on("change", function() {
    //         let markerSize = this.value.split(",");

    //         vis.nodeMarkerLength = markerSize[0];
    //         vis.nodeMarkerHeight = markerSize[1];
    //         updateVis(vis.graph_structure);
    //     });

    // // Select neighbor toggle
    // d3.selectAll("input[name='selectNeighbors']")
    //     .filter(() => d3.select(this).property("value") === vis.selectNeighbors.toString())
    //     .property("checked", "checked");

    // // All radio toggles
    // d3.select('#panelDiv')
    //     .selectAll("input[type='radio']")
    //     .on("change", async function() {
    //         // If it's the selectNeighbors radio button, update the settings
    //         if (this.name === 'selectNeighbors') {
    //             vis.selectNeighbors = this.value === "true";
    //             return;
    //         }

    //         // If it's the selectNeighbors radio button, update the settings
    //         if (this.name === 'isDirected') {
    //             vis.isDirected = this.value === "true";
    //             return;
    //         }

    //         // If it's the selectNeighbors radio button, update the settings
    //         if (this.name === 'isMultiEdge') {
    //             vis.isMultiEdge = this.value === "true";
    //             return;
    //         }
    //     });

    // Export graph from control panel 
    d3.select("#exportGraph").on("click", () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(multinet.graph_structure)], { type: `text/json` }));
        a.download = name;
        a.click();
    });

    // Define the possible node labels
    labels = d3.selectAll("#labelSelector").selectAll("select").selectAll("option")
        .data(Object.keys(graph.nodes[0]))
        .enter()
        .append("option", d => d)
        .attr("value", d => d)
        .attr("selected", d => d === "_key" ? "selected" : undefined)
        .text(d => d)

    // Get the node label on change and update the vis
    d3.select("#labelSelector")
        .on("change", async function() {
            window.controller.view.set("labelVar", d3.select("#labelSelector .select > select").property("value"))
            window.controller.view.updateVis();
        });

    // // Define the possible edge width metrics
    // edge_widthMetrics = d3.selectAll("#edgeWidthSelect").selectAll("select").selectAll("option")
    //     .data(Object.keys(vis.graph_structure.links[0]))
    //     .enter()
    //     .append("option", d => d)
    //     .attr("value", d => d)
    //     .attr("selected", d => d === "id" ? "selected" : undefined)
    //     .text(d => d)

    // // Get the edge width metric on change and update the vis
    // d3.select("#edgeWidthSelect")
    //     .on("change", async function() {
    //         vis.attributes.edgeWidthKey = d3.select("#edgeWidthSelect .select > select").property("value")
    //         updateVis(vis.graph_structure)
    //     });

    // // Export config
    // d3.select("#exportConfig")
    //     .on("click", function() {
    //         const a = document.createElement('a');
    //         a.href = URL.createObjectURL(new Blob([JSON.stringify(vis)], { type: `text/json` }));
    //         a.download = name;
    //         a.click();
    //     });

    // // Load config
    // d3.select("#loadConfig")
    //     .on("click", function() {
    //         // Get the JSON from the textarea
    //         let input = "";
    //         try {
    //             input = JSON.parse(d3.select("#config").node().value);
    //         } catch (error) {
    //             console.log("Problem parsing the vis object. Is the JSON malformed?");
    //             return;
    //         }

    //         // Update the values in vis
    //         for (key in input) {
    //             vis[key] = input[key];
    //         }

    //         // Tell the app that we've loaded from json config
    //         vis.reloaded = true;

    //         // Trigger a re-render
    //         updateVis(vis.graph_structure);
    //     });
}

module.exports = { searchFor, isSelected };