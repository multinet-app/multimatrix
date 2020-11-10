// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
export function superGraph(nodes: any[], edges: any[], attribute: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  console.log('The attribute');
  console.log(attribute);
  console.log('THE NODES');
  console.log(nodes);
  console.log('THE LINKS0');
  console.log(edges);
  const newNodes: any[] = [];
  nodes.forEach((node) => {
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
  const selectedAttributes = new Set();

  newNodes.forEach((node) => {
    selectedAttributes.add(node[attribute]);
  });

  // create the list of super nodes
  const superNodes: {
    CHILDREN: never[];
    GROUP: unknown;
    _key: unknown;
    id: string;
  }[] = [];
  selectedAttributes.forEach((attr) => {
    const superNode = {
      CHILDREN: [],
      GROUP: attr,
      _key: attr,
      id: 'supernodes/' + attr,
    };
    superNodes.push(superNode);
  });

  console.log('THE LIST OF SUPERNODES');
  console.log(superNodes);
  //   // create a new supernode and a new super node list
  //   const superNodes: any[] = [
  //     {
  //       CHILDREN: [],
  //       GROUP: attribute,
  //       _key: attribute,
  //       id: 'supernodes/' + attribute,
  //     },
  //   ];

  //   // update the parent field of the node if it has a super node with the super node id
  //   // update the super node origin list with the child node id
  //   newNodes.forEach((node) => {
  //     if (node.ORIGIN_STATE === 'California') {
  //       const superNode = superNodes.find(
  //         (superNode) => superNode.ORIGIN_STATE === 'California',
  //       );
  //       superNode.ORIGIN.push(node.id);
  //     }
  //   });

  // // de-construct edges into their original components and
  // // make a new list of edges for the supergraph network
  // const newLinks: any = [];
  // edges.forEach((link) => {
  //   const newLink = {
  //     ...link,
  //   };

  //   newLinks.push(newLink);
  // });

  // // update the _from, _to values and in attribute values for target and source
  // // which are needed for using d3 to visualize the network
  // newLinks.forEach((link: any) => {
  //   const linkFrom = link._from;
  //   const linkTo = link._to;
  //   superNodes.forEach((superNode) => {
  //     // check if the _from and _to are in the origin list
  //     superNode.ORIGIN.forEach((origin: any) => {
  //       if (linkFrom === origin) {
  //         const newLinkFrom = superNode.id;
  //         link._from = newLinkFrom;
  //         link.source = link._from;
  //       }
  //       if (linkTo === origin) {
  //         const newLinkTo = superNode.id;
  //         link._to = newLinkTo;
  //         link.target = link._to;
  //       }
  //     });
  //   });
  // });

  // // combine the superNodes with the new
  //
  //  nodes before updating all the neighbors
  // const combinedNodes = superNodes.concat(newNodes);

  // // construct the neighbors for the nodes
  // const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // // remove all the nodes who do not have any neighbors
  // let finalNodes = neighborNodes;
  // superNodes.forEach((superNode) => {
  //   const children = superNode.ORIGIN;
  //   finalNodes.forEach((node) => {
  //     if (children.includes(node.id)) {
  //       const nodeIDValue = node.id;
  //       finalNodes = finalNodes.filter((node) => node.id != nodeIDValue);
  //     }
  //   });
  // });

  // // construct the new network
  // const network = {
  //   nodes: finalNodes,
  //   links: newLinks,
  // };

  // return network;
}
