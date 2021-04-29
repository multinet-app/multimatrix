/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */

import { Link, Node } from '@/types';

export function defineSuperNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node._id === link._from);
    const findNodeTo = nodes.find((node) => node._id === link._to);
    findNodeFrom.neighbors.push(link._to);
    findNodeTo.neighbors.push(link._from);
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

// Function that processes the non-aggregated network links
// and assigns a type to the link
export function processChildLinks(links: Link[]) {
  const linkCopy: Link[] = links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    newLink.type = 'link';
    return newLink;
  });
  return linkCopy;
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

// Function that creates a deep copy of links to prevent modifying
// the network arguments that are passed into the expand and retract
// supergraph functions
function deepCopyLinks(links: Link[]) {
  const linkCopy: Link[] = links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    return newLink;
  });
  return linkCopy;
}

// Function that constructs new neighbors for the expanded and retracted networks
function defineNeighborNodes(nodes: Node[], links: Link[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  const nodeIDs = nodes.map((node: Node) => node._id);
  links.forEach((link: Link) => {
    if (nodeIDs.includes(link._from) && nodeIDs.includes(link._to)) {
      const findNodeFrom = nodes.find((node) => node._id === link._from);
      const findNodeTo = nodes.find((node) => node._id === link._to);
      if (findNodeFrom !== undefined && findNodeTo !== undefined) {
        findNodeFrom.neighbors.push(link._to);
        findNodeTo.neighbors.push(link._from);
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

// Function that processes superchildren links and updates the _from
// and _to for supernodes
function processExpandSuperLinks(
  links: Link[],
  childNodes: string[],
  superChildrenDict: Map<string, string>,
) {
  const superExpandLinks: Link[] = links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    if (childNodes.includes(newLink._from)) {
      const linkTo = newLink._to;
      const parent = superChildrenDict.get(linkTo);
      if (parent !== undefined) {
        newLink._to = parent;
      }
    }
    if (childNodes.includes(newLink._to)) {
      const linkFrom = newLink._from;
      const parent = superChildrenDict.get(linkFrom);
      if (parent !== undefined) {
        newLink._from = parent;
      }
    }
    return newLink;
  });
  return superExpandLinks;
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
// supernodes, superlinks, nodes, and links
export function superGraph(nodes: Node[], edges: Link[], attribute: string) {
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

  // Construct new link objects with type property for aggregation
  const newLinks: Link[] = edges.map((link) => {
    const newLink = {
      ...link,
    };
    newLink.type = 'superLink';
    return newLink;
  });

  // Update _from, _to, target, and source properties for visualizing network
  newLinks.forEach((link: Link) => {
    const linkFrom = link._from;
    const linkTo = link._to;

    superNodes.forEach((superNode) => {
      (superNode.CHILDREN as string[]).forEach((origin: string) => {
        if (linkFrom === origin) {
          const newLinkFrom = superNode._id;
          link._from = newLinkFrom;
        }
        if (linkTo === origin) {
          const newLinkTo = superNode._id;
          link._to = newLinkTo;
        }
      });
    });
  });

  // Create a combined list of supernodes and nodes for recalculating neighbor nodes
  const combinedNodes = superNodes.concat(newNodes);

  // Calculate a new set of neighbor nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // Remove nodes that are of type node
  const finalNodes = neighborNodes.filter((node: Node) => node.type !== 'node');

  // Construct new network object
  const network = {
    nodes: finalNodes,
    edges: newLinks,
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

// Function that constructs a new set of superlinks and links
// for the expanded matrix vis network
function expandSuperLinksData(
  superNodeName: string,
  aggrLinksCopy: Link[],
  nonAggrLinksCopy: Link[],
  superNodeNameDict: Map<string, Node>,
  superChildrenDict: Map<string, string>,
) {
  // Create a copy of the links to modify for the visualization
  const childLinksCopy = deepCopyLinks(nonAggrLinksCopy);
  const superLinksCopy = deepCopyLinks(aggrLinksCopy);

  // Construct a list of the children nodes that belong to the selected supernode
  const superChildren: string[] = getSuperChildren(
    superNodeName,
    superNodeNameDict,
  );

  const childFromLinks = childLinksCopy.filter((link: Link) => superChildren.includes(link._from));
  const childToLinks = childLinksCopy.filter((link: Link) => superChildren.includes(link._to));
  const allChildrenLinks = childFromLinks.concat(childToLinks);
  const superExpandLinks = processExpandSuperLinks(
    allChildrenLinks,
    superChildren,
    superChildrenDict,
  );

  const newSuperChildrenLinks = superLinksCopy
    .concat(superExpandLinks)
    .concat(allChildrenLinks);
  return newSuperChildrenLinks;
}

// Function that updates the matrix network data for visualizing supernodes, children nodes
// and the connections between supernodes and children nodes
export function expandSuperNetwork(
  nonAggrNodes: Node[],
  nonAggrLinks: Link[],
  aggrNodes: Node[],
  aggrLinks: Link[],
  superNode: Node,
) {
  // Create copies of the data for updating the visualization
  const nonAggrNodesCopy = deepCopyNodes(nonAggrNodes);
  const nonAggrLinksCopy = deepCopyLinks(nonAggrLinks);
  const aggrNodesCopy = deepCopyNodes(aggrNodes);
  const aggrLinksCopy = deepCopyLinks(aggrLinks);

  // Create structures for storing the information for building
  // a new set of supernodes and superlinks for visualizing the expanded network
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

  // Construct a new set of network links
  const expandLinks = expandSuperLinksData(
    superNode._id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
    superChildrenDict,
  );

  let neighborNodes: Node[] = [];
  if (expandNodes !== undefined && expandLinks !== undefined) {
    neighborNodes = defineNeighborNodes(expandNodes, expandLinks);
  }

  // Filter the links to contain only nodes that are in the super children list
  const finalLinks = expandLinks.filter((link: Link) => {
    const nodeIDs = neighborNodes.map((node: Node) => node._id);
    return nodeIDs.includes(link._from) && nodeIDs.includes(link._to);
  });
  // Create a new network containing the data for visualizing the expanded supergraph matrix
  const network = {
    nodes: neighborNodes,
    edges: finalLinks,
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

// Function that constructs a new set of superlinks and links
// for the retracted matrix vis network
function retractSuperLinksData(
  superNodeName: string,
  expandedLinks: Link[],
  nonAggrLinksCopy: Link[],
  superNodeNameDict: Map<string, Node>,
) {
  const childLinksCopy = deepCopyLinks(nonAggrLinksCopy);
  const expandedLinksCopy = deepCopyLinks(expandedLinks);

  // Construct a list of the children nodes that belong to the selected supernode
  const superChildren: string[] = getSuperChildren(
    superNodeName,
    superNodeNameDict,
  );

  // Construct a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];

  // Get a subset of the current links in the expanded matrix vis
  // whose _from id matches that of the children of the supernode selected
  childLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName || link._to === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // Construct a new set of links for the supernetwork vis that do not contain
  // links associated with the children of the supernode selected
  let newLinks = expandedLinksCopy;
  superChildren.forEach((childNode) => {
    newLinks = newLinks.filter((link: Link) => link._from !== childNode);
    newLinks = newLinks.filter((links: Link) => links._to !== childNode);
  });
  return newLinks;
}

// Function that updates the matrix network data for visualizing supernodes, children nodes
// and the connection between supernodes and children nodes. This function is different from expandSuperNetwork
// in that it collapses the children node and links if a user clicks twice on a supernode
export function retractSuperNetwork(
  nonAggrNodes: Node[],
  nonAggrLinks: Link[],
  aggrNodes: Node[],
  aggrLinks: Link[],
  superNode: Node,
) {
  const nonAggrNodesCopy = deepCopyNodes(nonAggrNodes);
  const nonAggrLinksCopy = deepCopyLinks(nonAggrLinks);
  const aggrNodesCopy = deepCopyNodes(aggrNodes);
  const aggrLinksCopy = deepCopyLinks(aggrLinks);

  // Create structures for storing the information for building
  // a new set of supernodes and superlinks for visualizing the expanded network
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);

  // Construct a new set of network nodes
  const retractNodes = retractSuperNodeData(
    superNode._id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // Construct a new set of network links
  const retractLinks = retractSuperLinksData(
    superNode._id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
  );

  // Create a new set of neighbors for the new network nodes
  let neighborNodes: Node[] = [];
  if (retractNodes !== undefined && retractLinks !== undefined) {
    neighborNodes = defineNeighborNodes(retractNodes, retractLinks);
  }

  // Create a new network containing the data for visualizing the retracted supergraph matrix
  const network = {
    nodes: neighborNodes,
    edges: retractLinks,
  };
  return network;
}

// Function that builds the non-aggregated matrix
export function nonAggrNetwork(nonAggrNodes: Node[], nonAggrLinks: Link[]) {
  const nodeCopy: Node[] = nonAggrNodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.type = '';
    return newNode;
  });

  const linkCopy: Link[] = nonAggrLinks.map((link: Link) => {
    const newLink = {
      ...link,
    };
    newLink.type = undefined;
    return newLink;
  });

  const network = {
    nodes: nodeCopy,
    edges: linkCopy,
  };
  return network;
}
