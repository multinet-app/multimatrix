import { Link, Network, Node } from '@/types';

// Function that constructs the neighbors for a node in a super network
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

function deepCopyNodes(network: Network) {
  const nodeCopy: Node[] = [];
  // original network components
  network.nodes.map((node: Node) => {
    const newNode = {
      ...node,
    };
    newNode.neighbors = [];
    nodeCopy.push(newNode);
  });

  return nodeCopy;
}

function deepCopyLinks(network: Network) {
  const linkCopy: Link[] = [];
  // original network components
  network.links.map((link: Link) => {
    const newLink = {
      ...link,
    };
    linkCopy.push(newLink);
  });
  return linkCopy;
}

// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
export function superGraph(nodes: Node[], edges: Link[], attribute: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  const newNodes: Node[] = [];
  nodes.map((node) => {
    const newNode = {
      ...node,
    };

    // remove the properties that will not be used
    // and properties that will be recalculated for visualization
    newNode.neighbors = [];

    // add new node to node list
    newNodes.push(newNode);
  });
  // create a list that results of the selected attribute from the nodes
  const selectedAttributes = new Set<string>();

  newNodes.forEach((node: Node) => {
    selectedAttributes.add(node[attribute]);
  });

  // dictionary data structure for constant time lookup for supernodes
  const superMap = new Map<string, Node>();

  // create the list of super nodes
  const superNodes: Node[] = [];
  selectedAttributes.forEach((attr: string) => {
    const superNode = {
      CHILDREN: [],
      GROUP: attr,
      _key: attr,
      id: 'supernodes/' + attr,
      neighbors: [],
    };
    superMap.set(attr, superNode);
    superNodes.push(superNode);
  });

  newNodes.forEach((node: Node) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superMap.get(node[attribute]);
      if (superNode != undefined) superNode.CHILDREN.push(node.id);
    }
  });

  // de-construct edges into their original components and
  // make a new list of edges for the supergraph network
  const newLinks: Link[] = [];
  edges.forEach((link) => {
    const newLink = {
      ...link,
    };

    newLinks.push(newLink);
  });

  // update the _from, _to values and in attribute values for target and source
  // which are needed for using d3 to visualize the network
  newLinks.forEach((link: Link) => {
    const linkFrom = link._from;
    const linkTo = link._to;

    superNodes.forEach((superNode) => {
      // check if the _from and _to are in the origin list
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

  // combine the superNodes with the new
  //  nodes before updating all the neighbors
  const combinedNodes = superNodes.concat(newNodes);

  // construct the neighbors for the nodes
  // const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);
  const neighborNodes = defineNeighborNodes(combinedNodes, newLinks);

  // remove all the nodes who do not have any neighbors
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

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };

  return network;
}

// function that maps node names to node objects
// <name, Node>
function MapNetworkNodes(nodes: Node[]) {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node: Node) => {
    nodeMap.set(node.id, node);
  });
  return nodeMap;
}

// function that maps all supernode children to their parent supernode
function mapSuperChildren(superNodes: Node[]) {
  const superChildrenMap = new Map<string, string>();
  superNodes.forEach((parentNode: Node) => {
    const superChildren = parentNode.CHILDREN;
    superChildren.forEach((childNode: string) => {
      superChildrenMap.set(childNode, parentNode.id);
    });
  });
  return superChildrenMap;
}

// function that takes a list of the current aggregated supernode network
// and adds the children nodes for visualization
function expandSuperDataNodes(
  superNodeName: string,
  superNetwork: Network,
  childrenNodeNameDict: Map<string, Node>,
  superNodeNameDict: Map<string, Node>,
) {
  // create a copy of the supernode data to handle the issue of modifying the supernodes
  const superNodeCopy = deepCopyNodes(superNetwork);

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

function expandSuperDataLinks(
  superNodeName: string,
  superNetwork: Network,
  originalNetwork: Network,
  superNodeNameDict: Map<string, Node>,
  parentChildDict: Map<string, string>,
) {
  // make copies of the links for modification without modifying the original data
  const originalLinksCopy = deepCopyLinks(originalNetwork);
  const superLinksCopy = deepCopyLinks(superNetwork);

  // get the node information about the supernode
  const superNode = superNodeNameDict.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }
  console.log('the children of the supernode selected');
  console.log(superChildren);

  // create a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];

  // get the subset of the links whose from id matches the chidlren nodes
  originalLinksCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // modify the link subset so they map from node to supernodes
  superChildrenLinks.forEach((link) => {
    const linkTo = link._to;
    const parent = parentChildDict.get(linkTo);
    if (parent != undefined) {
      link._to = parent;
      link.target = link._to;
    }
  });
  const combinedLinks = superLinksCopy.concat(superChildrenLinks);
  return combinedLinks;
}

// function that constructs a new network based on the supernode selected by the user
export function expandSuperNetwork(
  originalNetwork: Network,
  superNetwork: Network,
  superNode: Node,
) {
  const superNodeName = superNode.id;

  // original network node copy for use in node maps
  const originalNodesCopy = deepCopyNodes(originalNetwork);

  // super network copy for use in node maps
  const superNodesCopy = deepCopyNodes(superNetwork);

  // map children nodes to supernodes
  const parentChildDict = mapSuperChildren(superNodesCopy);
  // console.log('parent child map');
  // console.log(parentChildDict);

  // map children ids to children nodes
  const childrenNodeNameDict = MapNetworkNodes(originalNodesCopy);

  // map super node ids to super nodes
  const superNodeNameDict = MapNetworkNodes(superNodesCopy);

  // calculate a new list of supernodes
  const expandNodes = expandSuperDataNodes(
    superNodeName,
    superNetwork,
    childrenNodeNameDict,
    superNodeNameDict,
  );

  // calculate a new set of links
  const expandLinks = expandSuperDataLinks(
    superNodeName,
    superNetwork,
    originalNetwork,
    superNodeNameDict,
    parentChildDict,
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
