/**
 * This module contains various utilities for
 * creating, updatating, and managing a adjacency matrix.
 */
import * as Provenance from 'provenance-lib-core/lib/src/provenance-core/Provenance';

// Initialize the state object for node positions;
function _nodePositionMap(nodes: any[]) {
  const nodeMap: {[id: string]: { x: number; y: number }} = {};
  nodes.map((n: { id: string | number; x: number; y: number; }) => nodeMap[n.id] = { x: n.x, y: n.y });
  return nodeMap;
}

export function setUpProvenance(nodes: any[], order = 'noOrder') {
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
    time: new Date(), // timestamp for the current state of the graph;
  };

  const provenance = Provenance.initProvenance(initialState);
  const app = provenance.graph().current.state;
  return {
    provenance,
    app,
  };
}
