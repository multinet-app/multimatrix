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
        }
        if (linkTo === origin) {
          const newLinkTo = superNode.id;
          link._to = newLinkTo;
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

// Function that creates a deep copy of nodes to prevent modifying
// the network arguments that are passed into the expand and retract
// supergraph functions
function deepCopyNodes(nodes: Node[]) {
  const nodeCopy: Node[] = [];
  nodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    nodeCopy.push(newNode);
  });

  return nodeCopy;
}

// Function that creates a deep copy of links to prevent modifying
// the network arguments that are passed into the expand and retract
// supergraph functions
function deepCopyLinks(links: Link[]) {
  const linkCopy: Link[] = [];
  links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    linkCopy.push(newLink);
  });
  return linkCopy;
}

// Function that maps node names to node objects
function mapNetworkNodes(nodes: Node[]) {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node: Node) => {
    nodeMap.set(node.id, node);
  });
  return nodeMap;
}

// Function that processes the non-aggregated network nodes
// and assigns a type to the node
    export function processChildNodes(nodes: Node[]) {
      const nodeCopy: Node[] = [];
      // original network components
      nodes.map((node: Node) => {
        const newNode = {
          ...node,
        };
        newNode.type = 'node';
        nodeCopy.push(newNode);
      });
      return nodeCopy;
    }

// Function that processes the non-aggregated network links
// and assigns a type to the link
    export function processChildLinks(links: Link[]) {
      const linkCopy: Link[] = [];
      // original network components
      links.map((link: Link) => {
        const newLink = {
          ...link,
        };
        newLink.type = 'link';
        linkCopy.push(newLink);
      });
      return linkCopy;
    }

// Function that maps children nodes to supernode (parent) nodes
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

// Function that constructs a new set of supernodes and nodes
// for the expanded matrix vis network
function expandSuperNodeData(
  superNodeName: string,
  aggrNodesCopy: Node[],
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
) {
  const superNodeCopy = deepCopyNodes(aggrNodesCopy);
  const superNode = superNodeNameDict.get(superNodeName);

  // If the supernode exists in the dictionary, 
  // get the children of the supernode
  if (superNode != undefined) {
    const superChildrenIDs = superNode.CHILDREN;
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode != undefined) {
        childNodes.push(childNode);
      }
    });

    // Find and insert the children of the selected supernode into the correct spot
    const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
    const superIndexStart = superNodeCopy.findIndex(superIndexFunc);
    let count = 1;
    childNodes.forEach((node) => {
      superNodeCopy.splice(superIndexStart + count, 0, node);
      count += 1;
    });

    // Update the index of the new nodes the expanded vis network
    superNodeCopy.forEach((node: Node, index: number) => {
      node.index = index;
    });

    return superNodeCopy;
  }
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
  const childLinksCopy = deepCopyLinks(nonAggrLinksCopy);
  const superLinksCopy = deepCopyLinks(aggrLinksCopy);

  // Construct a list of the children nodes that belong to the selected supernode
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }

  // Construct a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];
  childLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // Update the superchildren link subset to map connections between nodes and supernodes 
  // in the new expanded vis network
  superChildrenLinks.forEach((link) => {
    const linkTo = link._to;
    const parent = superChildrenDict.get(linkTo);
    if (parent != undefined) {
      link._to = parent;
      link.target = link._to;
    }
  });

  // Combine the links from the network argument passed into expand vis function
  // with the the new subset of expanded superlinks for the expanded vis network
  const combinedLinks = superLinksCopy.concat(superChildrenLinks);

  return combinedLinks;
}

// Function that constructs new neighbors for the expanded and retracted networks
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

// Function that updates the matrix network data for visualizing supernodes, children nodes
// and the connections between supernodes and children nodes
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

  // Create structures for storing the information for building
  // a new set of supernodes and superlinks for visualizing the expanded network
  const childrenNodeNameDict = mapNetworkNodes(nonAggrNodesCopy);
  const superNodeNameDict = mapNetworkNodes(aggrNodesCopy);
  const superChildrenDict = mapSuperChildren(aggrNodesCopy);

  // Construct a new set of network nodes
  const expandNodes = expandSuperNodeData(
    superNode.id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // Construct a new set of network links
  const expandLinks = expandSuperLinksData(
    superNode.id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
    superChildrenDict,
  );

  // Create a new set of neighbors for the new network nodes
  let neighborNodes: Node[] = [];
  if (expandNodes && expandLinks != undefined) {
    neighborNodes = defineNeighborNodes(expandNodes, expandLinks);
  }

  // Create a new network containing the data for visualizing the expanded supergraph matrix
  const network = {
    nodes: neighborNodes,
    links: expandLinks,
  };

  return network;
}

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
  if (superNode != undefined) {
    const superChildrenIDs = superNode.CHILDREN;
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = childrenNodeNameDict.get(id);
      if (childNode != undefined) {
        childNodes.push(childNode);
      }
    });

    // Find and insert the children of the remaining supernodes and their children (if any)
    // in the correct position for visualizing the supergraph network
    const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
    const superIndexStart = expandNodesCopy.findIndex(superIndexFunc);
    expandNodesCopy.splice(superIndexStart + 1, childNodes.length);

    // Update the index of the new nodes in the retracted vis network
    expandNodesCopy.forEach((node: Node, index: number) => {
      node.index = index;
    });

    return expandNodesCopy;
  }
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
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }

  // Construct a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];

  // Get a subset of the current links in the expanded matrix vis
  // whose _from id matches that of the children of the supernode selected
  childLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // Construct a new set of links for the supernetwork vis that do not contain
  // links associated with the children of the supernode selected
  let newLinks = expandedLinksCopy;
  superChildren.forEach((childNode) => {
    newLinks = newLinks.filter(
      (link: Link) => link.source !== childNode && link._from !== childNode,
    );
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
    superNode.id,
    aggrNodesCopy,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // Construct a new set of network links
  const retractLinks = retractSuperLinksData(
    superNode.id,
    aggrLinksCopy,
    nonAggrLinksCopy,
    superNodeNameDict,
  );

  // Create a new set of neighbors for the new network nodes
  let neighborNodes: Node[] = [];
  if (retractNodes && retractLinks != undefined) {
    neighborNodes = defineNeighborNodes(retractNodes, retractLinks);
  }

  // Create a new network containing the data for visualizing the retracted supergraph matrix
  const network = {
    nodes: neighborNodes,
    links: retractLinks,
  };

  return network;
}
