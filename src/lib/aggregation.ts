
import { defineSuperNeighbors } from '@/lib/multinet';
import { Link, Node } from '@/types';

// Function that builds a supergraph network that contains 
// supernodes, superlinks, nodes, and links
export function superGraph(nodes: Node[], edges: Link[], attribute: string) {
  // Construct new node objects with type property for aggregation
  // and an empty list of neighbors that will be recomputed
  const newNodes: Node[] = [];
  nodes.map((node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    newNode.type = 'node';
    newNodes.push(newNode);
  });

  // Set for keeping track of attribute selected by user
  const selectedAttributes = new Set<string>();
  newNodes.forEach((node: Node) => {
    selectedAttributes.add(node[attribute]);
  });

  // Data structure for ensuring constant time lookup between 
  // selected attribute and supernodes
  const superMap = new Map<string, Node>();

  // Construct supernode objects
  const superNodes: Node[] = [];
  selectedAttributes.forEach((attr: string) => {
    const superNode = {
      CHILDREN: [],
      GROUP: attr,
      _key: attr,
      id: 'supernodes/' + attr,
      neighbors: [],
      type: 'supernode',
    };
    superMap.set(attr, superNode);
    superNodes.push(superNode);
  });

  // Update the children property of each supernode object
  newNodes.forEach((node: Node) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superMap.get(node[attribute]);
      if (superNode != undefined) superNode.CHILDREN.push(node.id);
    }
  });

  // Construct new link objects with type property for aggregation
  const newLinks: Link[] = [];
  edges.forEach((link) => {
    const newLink = {
      ...link,
    };
    newLink.type = 'superLink';
    newLinks.push(newLink);
  });

  // Update _from, _to, target, and source properties for visualizing network
  newLinks.forEach((link: Link) => {
    const linkFrom = link._from;
    const linkTo = link._to;

    superNodes.forEach((superNode) => {
      superNode.CHILDREN.forEach((origin: string) => {
        if (linkFrom === origin) {
          const newLinkFrom = superNode.id;
          link._from = newLinkFrom;
          link.source = link._from;
        }
        if (linkTo === origin) {
          const newLinkTo = superNode.id;
          link._to = newLinkTo;
          link.target = link._to;
        }
      });
    });
  });

  // Create a combined list of supernodes and nodes for recalculating neighbor nodes
  const combinedNodes = superNodes.concat(newNodes);

  // Calculate a new set of neighbor nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // Remove nodes who do not have neighbors
  let finalNodes = neighborNodes;
  superNodes.forEach((superNode) => {
    const children = superNode.CHILDREN;
    finalNodes.forEach((node) => {
      if (children.includes(node.id)) {
        const nodeIDValue = node.id;
        finalNodes = finalNodes.filter((node) => node.id != nodeIDValue);
      }
    });
  });

  // Construct new network object
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };
  
  return network;
}

// functions for deep copying nodes and links
function deepCopyNodes(nodes: Node[]) {
  const nodeCopy: Node[] = [];
  // original network components
  nodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    nodeCopy.push(newNode);
  });

  return nodeCopy;
}

function deepCopyLinks(links: Link[]) {
  const linkCopy: Link[] = [];
  // original network components
  links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    linkCopy.push(newLink);
  });
  return linkCopy;
}

// function that maps node names to node objects
// <name, Node>
function mapNetworkNodes(nodes: Node[]) {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node: Node) => {
    nodeMap.set(node.id, node);
  });
  return nodeMap;
}

// function that maps all supernode children to their parent supernode
function mapSuperChildren(superNodes: Node[]) {
  const superChildrenMap = new Map<string, string>();
  superNodes.forEach((networkNode: Node) => {
    if (networkNode.type === 'node') {
      return;
    }
    const superChildren = networkNode.CHILDREN;
    superChildren.forEach((childNode: string) => {
      superChildrenMap.set(childNode, networkNode.id);
    });
  });
  return superChildrenMap;
}

function expandSuperNodeData(
  superNodeName: string,
  aggrNodesCopy: Node[],
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
) {
  const superNodeCopy = deepCopyNodes(aggrNodesCopy);
  // get the node information about the supernode name
  const superNode = superNodeNameDict.get(superNodeName);
  if (superNode != undefined) {
    const superChildrenIDs = superNode.CHILDREN;
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode != undefined) {
        childNodes.push(childNode);
      }
    });
    const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
    const superIndexStart = superNodeCopy.findIndex(superIndexFunc);
    let count = 1;
    childNodes.forEach((node) => {
      superNodeCopy.splice(superIndexStart + count, 0, node);
      count += 1;
    });

    // update the index of the new supernodes
    superNodeCopy.forEach((node: Node, index: number) => {
      node.index = index;
    });
    return superNodeCopy;
  }
}

function expandSuperLinksData(
  superNodeName: string,
  aggrLinksCopy: Link[],
  nonAggrLinksCopy: Link[],
  superNodeNameDict: Map<string, Node>,
  superChildrenDict: Map<string, string>,
) {
  // make deep copies of the links
  const childLinksCopy = deepCopyLinks(nonAggrLinksCopy);
  const superLinksCopy = deepCopyLinks(aggrLinksCopy);

  // get the node information about the supernode
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }

  // create a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];

  // get the subset of the links whose from id matches the chidlren nodes
  childLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // modify the link subset so they map from node to supernodes
  superChildrenLinks.forEach((link) => {
    const linkTo = link._to;
    const parent = superChildrenDict.get(linkTo);
    if (parent != undefined) {
      link._to = parent;
      link.target = link._to;
    }
  });
  const combinedLinks = superLinksCopy.concat(superChildrenLinks);
  return combinedLinks;
}

// this function that constructs the neighbors for a node in a super network
function defineNeighborNodes(nodes: Node[], links: Link[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node.id === link._from);
    const findNodeTo = nodes.find((node) => node.id === link._to);
    if (findNodeFrom && findNodeTo != undefined) {
      findNodeFrom.neighbors.push(link._to);
      findNodeTo.neighbors.push(link._from);
    }
  });
  return nodes;
}
// this function is for expanding the super network for visualization
export function expandSuperNetwork(
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

  // data for expanding the vis
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);
  const superChildrenDict = mapSuperChildren(aggrNodesCopy);

  // calculate a new list of supernodes
  const expandNodes = expandSuperNodeData(
    superNode.id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // calculate a new set of links
  const expandLinks = expandSuperLinksData(
    superNode.id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
    superChildrenDict,
  );
  let neighborNodes: Node[] = [];
  if (expandNodes && expandLinks != undefined) {
    neighborNodes = defineNeighborNodes(expandNodes, expandLinks);
  }

  // construct the new network
  const network = {
    nodes: neighborNodes,
    links: expandLinks,
  };
  return network;
}

// this function retracts the supernodes if they are double clicked twice
function retractSuperNodeData(
  superNodeName: string,
  aggrNodesCopy: Node[],
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
) {
  const expandNodesCopy = deepCopyNodes(aggrNodesCopy);
  const superNode = superNodeNameDict.get(superNodeName);

  if (superNode != undefined) {
    const superChildrenIDs = superNode.CHILDREN;
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode != undefined) {
        childNodes.push(childNode);
      }
    });
    const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
    const superIndexStart = expandNodesCopy.findIndex(superIndexFunc);
    expandNodesCopy.splice(superIndexStart + 1, childNodes.length);

    // update the index of the new supernodes
    expandNodesCopy.forEach((node: Node, index: number) => {
      node.index = index;
    });
    return expandNodesCopy;
  }
}

// this function creates a new set of links by removing the
// links added from the expand superlinks function
function retractSuperLinksData(
  superNodeName: string,
  expandedLinks: Link[],
  nonAggrLinksCopy: Link[],
  superNodeNameDict: Map<string, Node>,
) {
  // make deep copies of the links
  const childLinksCopy = deepCopyLinks(nonAggrLinksCopy);
  const expandedLinksCopy = deepCopyLinks(expandedLinks);

  // get the node information about the supernode
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }

  // create a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];

  // get the subset of the links whose from id matches the children nodes
  childLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  let newLinks = expandedLinksCopy;
  superChildren.forEach((childNode) => {
    newLinks = newLinks.filter(
      (link: Link) => link.source !== childNode && link._from !== childNode,
    );
  });
  return newLinks;
}

// this function is for retracting the super network visualization
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

  // data for retracting the vis
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);

  // calculate a list of new nodes
  const retractNodes = retractSuperNodeData(
    superNode.id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // calculate a new set of links
  const retractLinks = retractSuperLinksData(
    superNode.id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
  );

  let neighborNodes: Node[] = [];
  if (retractNodes && retractLinks != undefined) {
    neighborNodes = defineNeighborNodes(retractNodes, retractLinks);
  }

  // construct the new network
  const network = {
    nodes: neighborNodes,
    links: retractLinks,
  };
  return network;
}
