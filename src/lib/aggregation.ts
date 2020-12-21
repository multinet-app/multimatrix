// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
import { defineSuperNeighbors } from '@/lib/multinet';
import { Link, Node } from '@/types';

// function that creates a deep copy of nodes
// function that creates a deep copy of links
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
    newNode.type = 'node';

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
      type: 'supernode',
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
    newLink.type = 'superLink';
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
  console.log('child nodes: ', nonAggrNodesCopy);
  console.log('child links: ', nonAggrLinksCopy);
  console.log('supernodes: ', aggrNodesCopy);
  console.log('superlinks: ', aggrLinksCopy);
  console.log('superNode', superNode);

  const childrenNodeNameDict = MapNetworkNodes(nonAggrNodesCopy);
  const superChildrenDict = mapSuperChildren(aggrNodesCopy);

  console.log('children map', childrenNodeNameDict);
  console.log('superchildren map', superChildrenDict);

  //   // calculate a new list of supernodes
  // const expandNodes = expandSuperDataNodes(
  //   superNode.id,
  //   superNetwork,
  //   childrenNodeNameDict,
  //   superNodeNameDict,
  // );
}

// this function is for retracting the super network visualization
export function retractSuperNetwork(
  nonAggrNodes: Node[],
  nonAggrLinks: Link[],
  aggrNodes: Node[],
  aggrLinks: Link[],
) {
  console.log('child nodes: ', nonAggrNodes);
  console.log('child links: ', nonAggrLinks);
  console.log('supernodes: ', aggrNodes);
  console.log('superlinks: ', aggrLinks);
}
