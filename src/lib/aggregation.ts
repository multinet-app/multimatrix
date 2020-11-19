// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
import { defineSuperNeighbors } from '@/lib/multinet';
export function superGraph(nodes: any[], edges: any[], attribute: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  const newNodes: any[] = [];
  nodes.map((node) => {
    const newNode = {
      ...node,
    };

    // remove the properties that will not be used
    // and properties that will be recalculated for visualization
    delete newNode.neighbors;

    // add new node to node list
    newNodes.push(newNode);
  });
  // create a list that results of the selected attribute from the nodes
  const selectedAttributes = new Set<string>();

  newNodes.forEach((node: any) => {
    selectedAttributes.add(node[attribute]);
  });

  // print out the selected attributes
  // console.log('THE SELECTED ATTRIBUTES');
  // console.log(selectedAttributes);

  // dictionary data structure for constant time lookup for supernodes
  const superMap = new Map<string, any>();

  // create the list of super nodes
  const superNodes: {
    CHILDREN: any[];
    GROUP: unknown;
    _key: unknown;
    id: string;
  }[] = [];
  selectedAttributes.forEach((attr: string) => {
    const superNode = {
      CHILDREN: [],
      GROUP: attr,
      _key: attr,
      id: 'supernodes/' + attr,
    };
    superMap.set(attr, superNode);
    superNodes.push(superNode);
  });

  // print out the super nodes
  // console.log('THE SUPER NODES');
  // console.log(superNodes);
  // console.log('THE SUPER MAP');
  // console.log(superMap);

  newNodes.forEach((node: any) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superMap.get(node[attribute]);
      if (superNode != undefined) superNode.CHILDREN.push(node.id);
    }
  });

  // print out the updated supernodes
  // console.log(superNodes);

  // de-construct edges into their original components and
  // make a new list of edges for the supergraph network
  const newLinks: any = [];
  edges.forEach((link) => {
    const newLink = {
      ...link,
    };

    newLinks.push(newLink);
  });

  // print out the new links
  // console.log(newLinks);

  // update the _from, _to values and in attribute values for target and source
  // which are needed for using d3 to visualize the network
  newLinks.forEach((link: any) => {
    const linkFrom = link._from;
    const linkTo = link._to;

    superNodes.forEach((superNode) => {
      // check if the _from and _to are in the origin list
      superNode.CHILDREN.forEach((origin: any) => {
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

  // print out information for superLinks
  // console.log(newLinks)

  // combine the superNodes with the new
  //  nodes before updating all the neighbors
  const combinedNodes = superNodes.concat(newNodes);

  // construct the neighbors for the nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // print out the new supernode network with associated neighbors
  // console.log(neighborNodes);

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

  // print out the information relating to the final nodes
  // console.log(finalNodes);

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };

  // print out the final network
  // console.log(network);

  return network;
}
