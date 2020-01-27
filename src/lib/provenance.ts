/**
 * This module contains various utilities for
 * creating, updatating, and managing a adjacency matrix.
 */
import * as Provenance from 'provenance-lib-core/lib/src/provenance-core/Provenance';

function _nodeLink(provenance: Provenance.Provenance<{
  order: string; nodePos: {}; // map of node positions,
    userSelectedNeighbors: never[]; // map of nodes that have neighbors selected (so they can be non-muted)
    userSelectedEdges: never[];
    selected: never[]; // set of nodes that have been 'soft selected'
    hardSelected: never[]; // set of nodes that have been 'hard selected'
    search: never[]; // field to store the id of a searched node;
    startTime: Date; // time this provenance graph was created and the task initialized;
    event: string; // string describing what event triggered this state update;
    //  endTime:'', // time the submit button was pressed and the task ended;
    time: Date;
  }>) {
  return {
    currentState: () => provenance.graph().current.state,
  };
}

// Initialize the state object for node positions;
function _nodePositionMap(nodes: any[]) {
  const nodeMap: {[id: string]: any} = {};
  nodes.map((n: { id: string | number; x: any; y: any; }) => nodeMap[n.id] = { x: n.x, y: n.y });
  return nodeMap;
}

function setUpProvenance(nodes: any, order = 'noOrder') {
  const nodePos = _nodePositionMap(nodes);

  const initialState = {
    order,
    nodePos, // map of node positions,
    userSelectedNeighbors: [], // map of nodes that have neighbors selected (so they can be non-muted)
    userSelectedEdges: [],
    selected: [], // set of nodes that have been 'soft selected'
    hardSelected: [], // set of nodes that have been 'hard selected'
    search: [], // field to store the id of a searched node;
    startTime: new Date(), // time this provenance graph was created and the task initialized;
    event: 'startedPvenance', // string describing what event triggered this state update;
    //  endTime:'', // time the submit button was pressed and the task ended;
    time: new Date(), // timestamp for the current state of the graph;
  };

  const provenance = Provenance.initProvenance(initialState);
  const app = _nodeLink(provenance);
  return {
    provenance,
    app,
  };
}

export {
  setUpProvenance,
};
