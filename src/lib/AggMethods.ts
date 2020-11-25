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

  newNodes.forEach((node: any) => {
    if (selectedAttributes.has(node[attribute])) {
      const superNode = superNodes.find(
        (superNode) => superNode.group === node[attribute],
      );
      if (superNode != undefined) superNode.children.push(node.id);
    }
  });

  // de-construct edges into their original components and
  // make a new list of edges for the supergraph network
  const newLinks: any = [];
  edges.forEach((link) => {
    const newLink = {
      ...link,
    };

    newLinks.push(newLink);
  });

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

  // combine the superNodes with the new
  //  nodes before updating all the neighbors
  const combinedNodes = superNodes.concat(newNodes);

  // construct the neighbors for the nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

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

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: newLinks,
  };

  return network;
}

// This function takes the original nodes and edges from the network
// and creates a new list of schema nodes and a new list of schema edges
// to reflect the connections between a schema node and the original nodes
// in the network based on a classification hierarchy

export function schemaGraph(nodes: any[], edges: any[], selectedSchema: string[], schema: any[], label: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  // console.log("N", nodes, "E", edges, "SS", selectedSchema, "S", schema)

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
  // TODO do not hardcode Label
  const superNodes: {
    children: any[];
    Label: unknown;
    _key: unknown;
    id: string;
  }[] = [];
  selectedAttributes.forEach((attr) => {
    const superNode = {
      children: [],
      Label: attr,
      _key: attr,
      id: 'supernodes/' + attr,
    };
    superNodes.push(superNode);
  });

  // recursive function to check lineage
  function lineage(key: any, counter: number, node: any) {
    // To handle empty data (remove after integrating with multinet data)
    if (key.length > 0) {

      // Check for fuzzy match of key first
      if (schema[key] === undefined) {
        // console.log("1", key)
        for (const k in schema) {
          const startswith = k.replace(' ', '').slice(0, 3)
          // console.log("Compares with:", startswith)
          if (key.startsWith(startswith)) {
            key = k
            // console.log("2", key)
          }
        }
      }

      // check if key is part of selectedAttributes
      if (selectedAttributes.has(key)) {
        // console.log("3", key)
        const superNode = superNodes.find(
          (superNode) => superNode.Label === key,
        );
        if (superNode != undefined) superNode.children.push(node.id);
      }
      // if key is not in set, check if it's parent is
      else if (selectedAttributes.has(schema[key])) {
        // console.log("4", schema[key])
        const superNode = superNodes.find(
          (superNode) => superNode.Label === schema[key],
        );
        if (superNode != undefined) superNode.children.push(node.id);
        // to catch keys with typos
      } else if (counter === 5) {
        // console.log("5", 'Null')
        const superNode = superNodes.find(
          (superNode) => superNode.Label === 'Null',
        );
        if (superNode != undefined) superNode.children.push(node.id);
        // if parent is not in set, update key to be parent
      } else {
        // console.log("6", key, '-->', schema[key])
        const newKey: string = schema[key]
        counter += 1
        lineage(newKey, counter, node)
      }
    }


  }

  newNodes.forEach((node: any) => {
    const key: string = node[label].toUpperCase().trim()
    if (key) {
      // console.log("STARTING:", key)
      lineage(key, 0, node)
    }
  });

  //  remove super nodes that dont have children
  const finalNodes: any[] = superNodes.filter((superNode) => superNode.children.length > 0)

  // make a new list of edges for the supergraph network
  const schemaLinks: any = [];

  edges.forEach((link: any) => {
    const linkFrom = link.source
    const linkTo = link.target

    finalNodes.forEach((schemaNode) => {
      // check if the _from and _to are in the origin list
      schemaNode.children.forEach((child: any) => {
        if (linkFrom === child) {
          const newLinkFrom = schemaNode.id;
          link._from = newLinkFrom;
          link.source = link._from;
        }
        if (linkTo === child) {
          const newLinkTo = schemaNode.id;
          link._to = newLinkTo;
          link.target = link._to;
        }
      });
    });
    const startswith = "supernodes"
    if (link.source.startsWith(startswith) && link.target.startsWith(startswith)) {
      schemaLinks.push(link)
    }
  });

  // construct the new network
  const network = {
    nodes: finalNodes,
    links: schemaLinks,
  };

  return network;
}