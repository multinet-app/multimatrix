//global variable that defines the tasks to be shown to the user and the (randomized) order in which to show them
var taskList;
let workerID; // to be populated when the user goes through the consent form;
let onTrials = false;
let participantCollection;
// let vis;
let app;


async function resetPanel() {

    let task = taskList[0];

    // Clear any values in the search box and the search message
    d3.select(".searchInput").property("value", "");
    d3.select(".searchMsg").style("display", "none");

    // Clear Selected Node List
    d3.select("#selectedNodeList")
        .selectAll("li")
        .remove();

    config = task.config;

    graph = await load_data(workspace, graph)

    window.controller.loadTask(0);
}

async function loadNewGraph(fileName) {
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

    let options = datalist.selectAll("option").data(graph.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);
    // options.attr('onclick',"console.log('clicked')");

    // options.on("click",console.log('clicked an option!'))
}

async function loadTasks(visType, tasksType) {
    let taskListFiles = { "heuristics": "taskLists/heuristics.json" };
    let selectedVis = "adjMatrix"

    //do an async load of the designated task list;
    let taskListObj = await d3.json(taskListFiles[tasksType]);

    let taskListEntries = Object.entries(taskListObj);

    // insert order and taskID into each element in this list
    taskList = taskListEntries.map((t, i) => {
        let task = t[1];
        task.order = i;
        task.taskID = t[0];
        task.workerID = workerID;
        return task;
    });

    let scriptTags = {
        adjMatrix: [
            "js/adjMatrix/libs/reorder/science.v1.js",
            "js/adjMatrix/libs/reorder/tiny-queue.js",
            "js/adjMatrix/libs/reorder/reorder.v1.js",
            "js/adjMatrix/fill_config_settings.js",
            "js/adjMatrix/autocomplete.js",
            "js/adjMatrix/view.js",
            "js/adjMatrix/controller.js",
            "js/adjMatrix/model.js",
            "js/adjMatrix/helper_functions.js"
        ]
    };

    const loadAllScripts = async() => {
        return await Promise.all(
            scriptTags[selectedVis].map(async src => {
                return await loadScript(src, () => "");
            })
        );
    };

    await loadAllScripts();

}