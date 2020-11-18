// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
import { defineSuperNeighbors } from '@/lib/multinet';
export function superGraph(nodes: any[], edges: any[], attribute: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
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

  // // print out the selected attributes
  // console.log(selectedAttributes);

  // create the list of super nodes
  const superNodes: {
    children: any[];
    group: unknown;
    _key: unknown;
    id: string;
  }[] = [];
  selectedAttributes.forEach((attr) => {
    const superNode = {
      children: [],
      group: attr,
      _key: attr,
      id: 'supernodes/' + attr,
    };
    superNodes.push(superNode);
  });

  // print out the super nodes
  // console.log(superNodes);

  newNodes.forEach((node: any) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superNodes.find(
        (superNode) => superNode.group === node[attribute],
      );
      if (superNode != undefined) superNode.children.push(node.id);
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
      superNode.children.forEach((origin: any) => {
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
    const children = superNode.children;
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

// This function takes the original nodes and edges from the network
// and creates a new list of schema nodes and a new list of schema edges
// to reflect the connections between a schema node and the original nodes
// in the network based on a classification hierarchy

export function schemaGraph(nodes: any[], edges: any[], selectedSchema: string[], schema: any[], label: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  const newNodes: any[] = [];
  nodes.forEach((node) => {
    const newNode = {
      ...node,
    };

    // remove the properties that will not be used
    delete newNode.neighbors;

    // add new node to node list
    newNodes.push(newNode);
  });

  // store current schema as set
  const selectedAttributes = new Set(selectedSchema)

  // create the list of super nodes
  const superNodes: {
    children: any[];
    group: unknown;
    _key: unknown;
    id: string;
  }[] = [];
  selectedAttributes.forEach((attr) => {
    const superNode = {
      children: [],
      group: attr,
      _key: attr,
      id: 'supernodes/' + attr,
    };
    superNodes.push(superNode);
  });

  // recursive function to check lineage
  function lineage(key: any, counter: number, node: any) {

    // Check for fuzzy match of key first
    if (schema[key] === undefined) {
      for (const k in schema) {
        const startswith = k.replace(' ', '').slice(0, 3)
        if (key.startsWith(startswith)) {
          key = k
        }
      }
    }

    // check if key is part of selectedAttributes
    if (selectedAttributes.has(key)) {
      const superNode = superNodes.find(
        (superNode) => superNode.group === key,
      );
      if (superNode != undefined) superNode.children.push(node.id);
    }
    else if (selectedAttributes.has(schema[key])) {
      const superNode = superNodes.find(
        (superNode) => superNode.group === schema[key],
      );
      if (superNode != undefined) superNode.children.push(node.id);
    } else if (counter === 5) {
      const superNode = superNodes.find(
        (superNode) => superNode.group === 'Null',
      );
      if (superNode != undefined) superNode.children.push(node.id);
    } else {
      const newKey: string = schema[key]
      counter += 1
      lineage(newKey, counter, node)
    }

  }

  newNodes.forEach((node: any) => {
    const key: string = node[label].toUpperCase().trim()
    if (key) {
      lineage(key, 0, node)
    }
  });

  //  remove super nodes that dont have children
  const finalNodes: any[] = superNodes.filter((superNode) => superNode.children.length > 0)

  // make a new list of edges for the supergraph network
  const newLinks: any = [];

  edges.forEach((link: any) => {
    if (link) {
      const linkFrom = link.source;
      const linkTo = link.target;

      finalNodes.forEach((superNode) => {
        // check if the _from and _to are in the origin list
        superNode.children.forEach((origin: any) => {
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
      const startswith = "supernodes"
      if (link.source.startsWith(startswith) && link.target.startsWith(startswith)) {
        newLinks.push(link)
      }
    }
  });

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };

  return network;
}