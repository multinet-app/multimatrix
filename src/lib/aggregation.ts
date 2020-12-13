// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
import { defineSuperNeighbors } from '@/lib/multinet';
import { Link, Network, Node } from '@/types';
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
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

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
  // console.log(' the supernodes');
  // console.log(superNodes);
  const superChildrenMap = new Map<string, string>();
  superNodes.forEach((parentNode: Node) => {
    // console.log('parent node');
    // console.log(parentNode);
    const superChildren = parentNode.CHILDREN;
    // console.log(superChildren);
    superChildren.forEach((childNode: string) => {
      // console.log("the parent id");
      // console.log(parentNode.id);
      superChildrenMap.set(childNode, parentNode.id);
    });
    // console.log(superChildrenMap);
  });
  // // console.log("super children map");
  // // console.log(superChildrenMap);
  return superChildrenMap;
}

// function that takes a list of the current aggregated supernode network
// and adds the children nodes for visualization
function expandSuperDataNodes(
  superNodeName: string,
  currentNetworkNodes: Node[],
  superChildrenIDMap: Map<string, Node>,
  superNodeIDMap: Map<string, Node>,
) {
  // create a copy of the supernode data to handle the issue of modifying the supernodes
  const superNodeCopy: Node[] = [];
  currentNetworkNodes.map((node) => {
    const newSuperNode = {
      ...node,
    };
    newSuperNode.neighbors = [];
    superNodeCopy.push(newSuperNode);
  });

  // get the node information about the supernode name
  const superNode = superNodeIDMap.get(superNodeName);
  if (superNode != undefined) {
    const superChildrenIDs = superNode.CHILDREN;
    const childNodes: Node[] = [];
    superChildrenIDs.forEach((id: string) => {
      const childNode = superChildrenIDMap.get(id);
      if (childNode != undefined) {
        childNodes.push(childNode);
      }
    });

    // console.log('the children nodes');
    // console.log(childNodes);

    // console.log('network nodes before');
    // console.log(currentNetworkNodes);
    const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
    const superIndexStart = superNodeCopy.findIndex(superIndexFunc);
    // console.log(currentNetworkNodes.findIndex(superIndexFunc));
    // console.log('the super node network before');
    // console.log(currentNetworkNodes);
    let count = 1;
    childNodes.forEach((node) => {
      superNodeCopy.splice(superIndexStart + count, 0, node);
      count += 1;
    });

    // update the index of the new supernodes
    superNodeCopy.forEach((node: Node, index: number) => {
      node.index = index;
    });
    // console.log('network nodes after');
    // console.log(superNodeCopy);
    return superNodeCopy;
  }
}

function expandSuperDataLinks(
  superNodeName: string,
  currentNetworkLinks: Link[],
  originalNetworkLinks: Link[],
  superNodeIDMap: Map<string, Node>,
  superNodes: Node[],
) {
  // make copies of the links for modification without modifying the original data
  const originalLinkCopy: Link[] = [];
  const currentLinkCopy: Link[] = [];
  originalNetworkLinks.forEach((link) => {
    const newLink = {
      ...link,
    };
    originalLinkCopy.push(newLink);
  });
  currentNetworkLinks.forEach((link) => {
    const newLink = {
      ...link,
    };
    currentLinkCopy.push(newLink);
  });

  // create a list of links whose _from is one of the superchildren selected
  const superChildrenLinks: Link[] = [];
  // get the node information about the supernode
  const superNode = superNodeIDMap.get(superNodeName);
  let superChildren: string[] = [];
  if (superNode != undefined) {
    superChildren = superNode.CHILDREN;
  }
  console.log('the children of the supernode selected');
  console.log(superChildren);

  // console.log('super parent children map');
  const superParentChildMap = mapSuperChildren(superNodes);
  // console.log(superParentChildMap);

  // get the subset of the links whose from id matches the chidlren nodes
  originalLinkCopy.forEach((link: Link) => {
    superChildren.forEach((childNodeName: string) => {
      if (link._from === childNodeName) {
        superChildrenLinks.push(link);
      }
    });
  });

  // modify the link subset so they map from node to supernodes
  superChildrenLinks.forEach((link) => {
    const linkTo = link._to;
    const parent = superParentChildMap.get(linkTo);
    if (parent != undefined) {
      link._to = parent;
      link.target = link._to;
    }
  });

  // console.log('subset links');
  // console.log(superChildrenLinks);
  // console.log("copy links");
  // console.log(currentLinkCopy);
  // console.log("attempt to concat");
  const combinedLinks = currentLinkCopy.concat(superChildrenLinks);
  return combinedLinks;

  // console.log("the combined links");
  // console.log(combinedLinks);
  // console.log('the original network links');
  // console.log(originalLinkCopy);

  // console.log('the super network links');
  // console.log(currentLinkCopy);
}

// function that constructs a new network based on the supernode selected by the user
export function expandSuperNetwork(
  originalNetwork: Network,
  superNetwork: Network,
  superNode: Node,
) {
  // console.log("the original network");
  // console.log(originalNetwork);
  // console.log("the super network");
  // console.log(superNetwork);
  const superNodeName = superNode.id;
  console.log('The supernode selected');
  console.log(superNodeName);
  // console.log('original network map');
  // console.log(originalNetworkNodeMap);
  // console.log('supernetwork map');
  // console.log(superNetworkNodeMap);
  // console.log('super children map');

  // map children names to nodes
  const originalNetworkNodeMap = MapNetworkNodes(originalNetwork.nodes);
  const superNetworkNodeMap = MapNetworkNodes(superNetwork.nodes);

  // calculate a new list of supernodes
  const expandNodes = expandSuperDataNodes(
    superNodeName,
    superNetwork.nodes,
    originalNetworkNodeMap,
    superNetworkNodeMap,
  );

  // calculate a new set of links
  const expandLinks = expandSuperDataLinks(
    superNodeName,
    superNetwork.links,
    originalNetwork.links,
    superNetworkNodeMap,
    superNetwork.nodes,
  );

  console.log('the expanded nodes');
  console.log(expandNodes);
  console.log('expand links');
  console.log(expandLinks);
}
