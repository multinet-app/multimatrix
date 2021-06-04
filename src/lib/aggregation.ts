/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */

import { Edge, Node } from '@/types';

export function defineSuperNeighbors(nodes: any[], edges: any[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  edges.forEach((edge) => {
    const findNodeFrom = nodes.find((node) => node._id === edge._from);
    const findNodeTo = nodes.find((node) => node._id === edge._to);
    findNodeFrom.neighbors.push(edge._to);
    findNodeTo.neighbors.push(edge._from);
  });
  return nodes;
}

// Function that processes the non-aggregated network nodes
// and assigns a type to the node
export function processChildNodes(nodes: Node[]) {
  const nodeCopy: Node[] = nodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.type = 'childnode';
    return newNode;
  });
  return nodeCopy;
}

// Function that processes the non-aggregated network edges
// and assigns a type to the edge
export function processChildEdges(edges: Edge[]) {
  const edgeCopy: Edge[] = edges.map((edge: Edge) => {
    const newEdge = {
      ...edge,
    };
    newEdge.type = 'edge';
    return newEdge;
  });
  return edgeCopy;
}

// Function that creates a deep copy of nodes to prevent modifying
// the network arguments that are passed into the expand and retract
// supergraph functions
function deepCopyNodes(nodes: Node[]) {
  const nodeCopy: Node[] = nodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    return newNode;
  });
  return nodeCopy;
}

// Function that creates a deep copy of edges to prevent modifying
// the network arguments that are passed into the expand and retract
// supergraph functions
function deepCopyEdges(edges: Edge[]) {
  const edgeCopy: Edge[] = edges.map((edge: Edge) => {
    const newEdge = {
      ...edge,
    };
    return newEdge;
  });
  return edgeCopy;
}

// Function that constructs new neighbors for the expanded and retracted networks
function defineNeighborNodes(nodes: Node[], edges: Edge[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  const nodeIDs = nodes.map((node: Node) => node._id);
  edges.forEach((edge: Edge) => {
    if (nodeIDs.includes(edge._from) && nodeIDs.includes(edge._to)) {
      const findNodeFrom = nodes.find((node) => node._id === edge._from);
      const findNodeTo = nodes.find((node) => node._id === edge._to);
      if (findNodeFrom !== undefined && findNodeTo !== undefined) {
        findNodeFrom.neighbors.push(edge._to);
        findNodeTo.neighbors.push(edge._from);
      }
    }
  });
  return nodes;
}

// Function that maps node names to node objects
function mapNetworkNodes(nodes: Node[]) {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node: Node) => {
    nodeMap.set(node._id, node);
  });
  return nodeMap;
}

// Function that maps children nodes to supernode (parent) nodes
function mapSuperChildren(node: Node[]) {
  const superChildrenMap = new Map<string, string>();
  node.forEach((networkNode: Node) => {
    if (networkNode.type === 'childnode') {
      return;
    }
    const superChildren = networkNode.CHILDREN as string[];
    superChildren.forEach((childNode: string) => {
      superChildrenMap.set(childNode, networkNode._id);
    });
  });
  return superChildrenMap;
}

// Function that processes superchildren edges and updates the _from
// and _to for supernodes
function processExpandSuperEdges(
  edges: Edge[],
  childNodes: string[],
  superChildrenDict: Map<string, string>,
) {
  const superExpandEdges: Edge[] = edges.map((edge: Edge) => {
    const newEdge = {
      ...edge,
    };
    if (childNodes.includes(newEdge._from)) {
      const edgeTo = newEdge._to;
      const parent = superChildrenDict.get(edgeTo);
      if (parent !== undefined) {
        newEdge._to = parent;
      }
    }
    if (childNodes.includes(newEdge._to)) {
      const edgeFrom = newEdge._from;
      const parent = superChildrenDict.get(edgeFrom);
      if (parent !== undefined) {
        newEdge._from = parent;
      }
    }
    return newEdge;
  });
  return superExpandEdges;
}

// Function that gets the name of the children that belong in the supernode
function getSuperChildren(
  superNodeName: string,
  superNodeNameDict: Map<string, Node>,
) {
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode !== undefined) {
    superChildren = superNode.CHILDREN as string[];
  }
  return superChildren;
}

// Functions that aggregate network data into a supergraph network

// Function for processing attributes for the visualziation and supergraph
function processAttributes(nodes: Node[], attribute: string) {
  // Store attribute selected by the user before processing for type
  let selectedAttributes = new Set<any>();
  const selectedAttribute = nodes.map<string>((node: Node) => node[attribute] as string);

  // Check if the attribute can be parsed as an integer
  const intAttribute = selectedAttribute.every((element: any) => Number.isInteger(element));

  // Create a set of the attributes based on the type of the attribute (number, string)
  if (intAttribute) {
    const intAttributes = selectedAttribute.map((x) => parseInt(x, 10));
    intAttributes.sort((a: number, b: number) => a - b);
    selectedAttributes = new Set(intAttributes);
  } else {
    selectedAttributes = new Set(selectedAttribute);
  }
  return selectedAttributes;
}

// Function that builds a supergraph network that contains
// supernodes, superedges, nodes, and edges
export function superGraph(nodes: Node[], edges: Edge[], attribute: string) {
  // Construct new node objects with type property for aggregation
  // and an empty list of neighbors that will be recomputed
  const newNodes: Node[] = nodes.map((node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    newNode.type = 'node';
    return newNode;
  });

  // Process attributes according to the attribute type
  const selectedAttributes = processAttributes(newNodes, attribute);

  // Data structure for ensuring constant time lookup between
  // selected attribute and supernodes
  const superMap = new Map<string, Node>();

  // Construct supernode objects
  const superNodes: Node[] = [];
  selectedAttributes.forEach((attr: string) => {
    const superNode = {
      CHILDREN: [],
      CHILD_COUNT: 0,
      GROUP: attr,
      _key: attr,
      _id: `supernodes/${attr}`,
      neighbors: [],
      type: 'supernode',
    };
    superMap.set(attr, superNode);
    superNodes.push(superNode);
  });

  newNodes.forEach((node: Node) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superMap.get(node[attribute] as string);
      if (superNode !== undefined) {
        (superNode.CHILDREN as string[]).push(node._id);
        (superNode.CHILD_COUNT as number) += 1;
      }
    }
  });

  // Construct new edge objects with type property for aggregation
  const newEdges: Edge[] = edges.map((edge) => {
    const newEdge = {
      ...edge,
    };
    newEdge.type = 'superEdge';
    return newEdge;
  });

  // Update _from, _to, target, and source properties for visualizing network
  newEdges.forEach((edge: Edge) => {
    const edgeFrom = edge._from;
    const edgeTo = edge._to;

    superNodes.forEach((superNode) => {
      (superNode.CHILDREN as string[]).forEach((origin: string) => {
        if (edgeFrom === origin) {
          const newEdgeFrom = superNode._id;
          edge._from = newEdgeFrom;
        }
        if (edgeTo === origin) {
          const newEdgeTo = superNode._id;
          edge._to = newEdgeTo;
        }
      });
    });
  });

  // Create a combined list of supernodes and nodes for recalculating neighbor nodes
  const combinedNodes = superNodes.concat(newNodes);

  // Calculate a new set of neighbor nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newEdges);

  // Remove nodes that are of type node
  const finalNodes = neighborNodes.filter((node: Node) => node.type !== 'node');

  // Construct new network object
  const network = {
    nodes: finalNodes,
    edges: newEdges,
  };
  return network;
}

// Functions that expand the aggregated network to visualize aggregated
// and non-aggregated data

// Function that constructs a new set of supernodes and nodes
// for the expanded matrix vis network
function expandSuperNodeData(
  superNodeName: string,
  aggrNodesCopy: Node[],
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
  superChildrenMap: Map<string, string>,
) {
  const nodeCopy = deepCopyNodes(aggrNodesCopy);
  const superNode = superNodeNameDict.get(superNodeName);

  // If the supernode exists in the dictionary,
  // get the children of the supernode
  if (superNode !== undefined) {
    const superChildrenIDs = superNode.CHILDREN as string[];
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode !== undefined) {
        childNodes.push(childNode);
      }
    });

    // Find and insert the children of the selected supernode into the correct spot
    const insertNodeFunc = (superNode: Node) => superNode._id === superNodeName;
    const insertNodeStart = nodeCopy.findIndex(insertNodeFunc);
    let count = 1;
    childNodes.forEach((node) => {
      nodeCopy.splice(insertNodeStart + count, 0, node);
      count += 1;
    });

    // Add a parent position value for the child nodes
    const expandedNodes = nodeCopy.map((node: Node) => {
      if (node.type === 'childnode') {
        const parentNodeID = superChildrenMap.get(node._id);
        if (parentNodeID !== undefined) {
          const parentIndexFunc = (matrixNode: Node) => matrixNode._id === parentNodeID;
          const parentNodePosition = nodeCopy.findIndex(parentIndexFunc);
          node.parentPosition = parentNodePosition;
        }
      }
      return node;
    });
    return expandedNodes;
  }

  return [];
}

// Function that constructs a new set of superedges and edges
// for the expanded matrix vis network
function expandSuperEdgesData(
  superNodeName: string,
  aggrEdgesCopy: Edge[],
  nonAggrEdgesCopy: Edge[],
  superNodeNameDict: Map<string, Node>,
  superChildrenDict: Map<string, string>,
) {
  // Create a copy of the edges to modify for the visualization
  const childEdgesCopy = deepCopyEdges(nonAggrEdgesCopy);
  const superEdgesCopy = deepCopyEdges(aggrEdgesCopy);

  // Construct a list of the children nodes that belong to the selected supernode
  const superChildren: string[] = getSuperChildren(
    superNodeName,
    superNodeNameDict,
  );

  const childFromEdges = childEdgesCopy.filter((edge: Edge) => superChildren.includes(edge._from));
  const childToEdges = childEdgesCopy.filter((edge: Edge) => superChildren.includes(edge._to));
  const allChildrenEdges = childFromEdges.concat(childToEdges);
  const superExpandEdges = processExpandSuperEdges(
    allChildrenEdges,
    superChildren,
    superChildrenDict,
  );

  const newSuperChildrenEdges = superEdgesCopy
    .concat(superExpandEdges)
    .concat(allChildrenEdges);
  return newSuperChildrenEdges;
}

// Function that updates the matrix network data for visualizing supernodes, children nodes
// and the connections between supernodes and children nodes
export function expandSuperNetwork(
  nonAggrNodes: Node[],
  nonAggrEdges: Edge[],
  aggrNodes: Node[],
  aggrEdges: Edge[],
  superNode: Node,
) {
  // Create copies of the data for updating the visualization
  const nonAggrNodesCopy = deepCopyNodes(nonAggrNodes);
  const nonAggrEdgesCopy = deepCopyEdges(nonAggrEdges);
  const aggrNodesCopy = deepCopyNodes(aggrNodes);
  const aggrEdgesCopy = deepCopyEdges(aggrEdges);

  // Create structures for storing the information for building
  // a new set of supernodes and superedges for visualizing the expanded network
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);
  const superChildrenDict = mapSuperChildren(aggrNodesCopy);

  // Construct a new set of network nodes
  const expandNodes = expandSuperNodeData(
    superNode._id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
    superChildrenDict,
  );

  // Construct a new set of network edges
  const expandEdges = expandSuperEdgesData(
    superNode._id,
    aggrEdgesCopy,
    nonAggrEdgesCopy,
    superNodeNameDict,
    superChildrenDict,
  );

  let neighborNodes: Node[] = [];
  if (expandNodes !== undefined && expandEdges !== undefined) {
    neighborNodes = defineNeighborNodes(expandNodes, expandEdges);
  }

  // Filter the edges to contain only nodes that are in the super children list
  const finalEdges = expandEdges.filter((edge: Edge) => {
    const nodeIDs = neighborNodes.map((node: Node) => node._id);
    return nodeIDs.includes(edge._from) && nodeIDs.includes(edge._to);
  });
  // Create a new network containing the data for visualizing the expanded supergraph matrix
  const network = {
    nodes: neighborNodes,
    edges: finalEdges,
  };
  return network;
}

// Functions that retract the aggregated network to visualize aggregated
// and non-aggregated data

// Function that removes the children of a supernode if a user clicks twice on a supernode
function retractSuperNodeData(
  superNodeName: string,
  aggrNodesCopy: Node[],
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
) {
  const expandNodesCopy = deepCopyNodes(aggrNodesCopy);
  const superNode = superNodeNameDict.get(superNodeName);

  // If the supernode exists in the dictionary,
  // get the children of the supernode
  if (superNode !== undefined) {
    const superChildrenIDs = superNode.CHILDREN as string[];
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode !== undefined) {
        childNodes.push(childNode);
      }
    });

    // Find and remove the children of the selected supernode and insert remaining nodes
    // into the correct position for visualizing the supergraph network
    const superIndexFunc = (superNode: Node) => superNode._id === superNodeName;
    const superIndexStart = expandNodesCopy.findIndex(superIndexFunc);
    expandNodesCopy.splice(superIndexStart + 1, childNodes.length);
    return expandNodesCopy;
  }

  return [];
}

// Function that constructs a new set of superedges and edges
// for the retracted matrix vis network
function retractSuperEdgesData(
  superNodeName: string,
  expandedEdges: Edge[],
  nonAggrEdgesCopy: Edge[],
  superNodeNameDict: Map<string, Node>,
) {
  const childEdgesCopy = deepCopyEdges(nonAggrEdgesCopy);
  const expandedEdgesCopy = deepCopyEdges(expandedEdges);

  // Construct a list of the children nodes that belong to the selected supernode
  const superChildren: string[] = getSuperChildren(
    superNodeName,
    superNodeNameDict,
  );

  // Construct a list of edges whose _from is one of the superchildren selected
  const superChildrenEdges: Edge[] = [];

  // Get a subset of the current edges in the expanded matrix vis
  // whose _from id matches that of the children of the supernode selected
  childEdgesCopy.forEach((edge: Edge) => {
    superChildren.forEach((childNodeName: string) => {
      if (edge._from === childNodeName || edge._to === childNodeName) {
        superChildrenEdges.push(edge);
      }
    });
  });

  // Construct a new set of edges for the supernetwork vis that do not contain
  // edges associated with the children of the supernode selected
  let newEdges = expandedEdgesCopy;
  superChildren.forEach((childNode) => {
    newEdges = newEdges.filter((edge: Edge) => edge._from !== childNode);
    newEdges = newEdges.filter((edges: Edge) => edges._to !== childNode);
  });
  return newEdges;
}

// Function that updates the matrix network data for visualizing supernodes, children nodes
// and the connection between supernodes and children nodes. This function is different from expandSuperNetwork
// in that it collapses the children node and edges if a user clicks twice on a supernode
export function retractSuperNetwork(
  nonAggrNodes: Node[],
  nonAggrEdges: Edge[],
  aggrNodes: Node[],
  aggrEdges: Edge[],
  superNode: Node,
) {
  const nonAggrNodesCopy = deepCopyNodes(nonAggrNodes);
  const nonAggrEdgesCopy = deepCopyEdges(nonAggrEdges);
  const aggrNodesCopy = deepCopyNodes(aggrNodes);
  const aggrEdgesCopy = deepCopyEdges(aggrEdges);

  // Create structures for storing the information for building
  // a new set of supernodes and superedges for visualizing the expanded network
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);

  // Construct a new set of network nodes
  const retractNodes = retractSuperNodeData(
    superNode._id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // Construct a new set of network edges
  const retractEdges = retractSuperEdgesData(
    superNode._id,
    aggrEdgesCopy,
    nonAggrEdgesCopy,
    superNodeNameDict,
  );

  // Create a new set of neighbors for the new network nodes
  let neighborNodes: Node[] = [];
  if (retractNodes !== undefined && retractEdges !== undefined) {
    neighborNodes = defineNeighborNodes(retractNodes, retractEdges);
  }

  // Create a new network containing the data for visualizing the retracted supergraph matrix
  const network = {
    nodes: neighborNodes,
    edges: retractEdges,
  };
  return network;
}

// Function that builds the non-aggregated matrix
export function nonAggrNetwork(nonAggrNodes: Node[], nonAggrEdges: Edge[]) {
  const nodeCopy: Node[] = nonAggrNodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.type = '';
    return newNode;
  });

  const edgeCopy: Edge[] = nonAggrEdges.map((edge: Edge) => {
    const newEdge = {
      ...edge,
    };
    newEdge.type = undefined;
    return newEdge;
  });

  const network = {
    nodes: nodeCopy,
    edges: edgeCopy,
  };
  return network;
}
