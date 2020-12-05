// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
import { defineSuperNeighbors } from '@/lib/multinet';
import { Link, Node } from '@/types';
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

// function that maps node names to nodes
export function MapNetworkNodes(nodes: Node[]) {
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node: Node) => {
    nodeMap.set(node.id, node);
  });

  return nodeMap;
}

// function that takes a superNode name and list of supernodes
// and returns the children of the supernode with a name that matches
// the superNode name argument
export function GetSuperChildren(superNodeName: string, nodes: Node[]) {
  const superNodeMap = new Map<string, Node>();
  console.log('the selected node: ', superNodeName);
  nodes.forEach((node: Node) => {
    superNodeMap.set(node.id, node);
  });
  const getSuperNode = superNodeMap.get(superNodeName);
  if (getSuperNode) {
    return getSuperNode.CHILDREN;
  }
}

// function that that takes a list of the current supernodes being visualized
// a super node that was selected and modifies the data set to include the children
// of supernodes to be visualized
export function ExpandSuperData(
  superNodeName: string,
  superNodes: Node[],
  nodeMap: Map<string, Node>,
) {
  // get the children of the supernode
  const superChildrenIDs = GetSuperChildren(superNodeName, superNodes);
  const childNodes: Node[] = [];

  // loop through the node map and get the children nodes
  superChildrenIDs.forEach((id: string) => {
    const childNode = nodeMap.get(id);
    if (childNode) {  
      childNodes.push(childNode);
    }
  });

  console.log("the children nodes");
  console.log(childNodes);
  // find the index of the supernode name
  const superIndexFunc = (superNode: Node) => superNode.id == superNodeName;
  const superIndexStart = superNodes.findIndex(superIndexFunc);
  console.log(superNodes.findIndex(superIndexFunc));
  console.log("the super node network before");
  console.log(superNodes);
  let count = 1;
  childNodes.forEach(node => {
    superNodes.splice(superIndexStart + count, 0, node);
    count += 1;
  });
  console.log("the network after");
  console.log(superNodes);




}
