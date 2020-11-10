/* Multinet data importer */
import { multinetApi } from 'multinet';
import { Node, Network, Link } from '@/types';

async function _downloadAllRows(
  api: any,
  workspace: string,
  tableName: string,
  tableType: 'node' | 'link',
) {
  let table = await api.table(workspace, tableName, { offset: 0, limit: 100 });

  // If the table is large, don't download the data
  if (
    (table.count > 100 && tableType === 'node') ||
    (table.count > 2000 && tableType === 'link')
  ) {
    throw new Error(
      `The table called ${tableName} is too large, not downloading.`,
    );
  }

  // Else if the table is small enough, grab the previously
  // acquired data and make requests for the remaining data
  let output: any[] = [];
  output = output.concat(table.rows);

  while (output.length < table.count) {
    table = await api.table(workspace, tableName, {
      offset: output.length,
      limit: 100,
    });
    output = output.concat(table.rows);
  }

  return output;
}

function _renameLinkVars(links: any[]): Link[] {
  links.forEach((link) => {
    link.id = link._id;
    link.source = link._from;
    link.target = link._to;
    delete link._id;
  });
  return links;
}

function _renameNodeVars(nodes: any[]): Node[] {
  nodes.forEach((node) => {
    node.id = node._id;
    delete node._id;
  });
  return nodes;
}

function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node._id === link._from);
    const findNodeTo = nodes.find((node) => node._id === link._to);
    findNodeFrom.neighbors.push(link._to);
    findNodeTo.neighbors.push(link._from);
  });
  return nodes;
}

// Function that constructs the neighbors for a node in a super network
export function defineSuperNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node.id === link._from);
    const findNodeTo = nodes.find((node) => node.id === link._to);
    findNodeFrom.neighbors.push(link._to);
    findNodeTo.neighbors.push(link._from);
  });
  return nodes;
}

// This function takes the original nodes and edges from the network
// and creates a new list of supernodes and a new list of edges
// to reflect the connections between a supernode and the original nodes
// in the network
export function superGraph(nodes: any[], edges: any[], attribute: string) {
  // de-construct nodes into their original components and
  // make a new list of nodes
  console.log('The attribute');
  console.log(attribute);
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
  // create a new supernode and a new super node list
  const superNodes: any[] = [
    {
      ORIGIN: [],
      ORIGIN_STATE: 'California',
      _key: 'CA',
      id: 'supernodes/CA',
    },
  ];

  // update the parent field of the node if it has a super node with the super node id
  // update the super node origin list with the child node id
  newNodes.forEach((node) => {
    if (node.ORIGIN_STATE === 'California') {
      const superNode = superNodes.find(
        (superNode) => superNode.ORIGIN_STATE === 'California',
      );
      superNode.ORIGIN.push(node.id);
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
      superNode.ORIGIN.forEach((origin: any) => {
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

  // combine the superNodes with the new nodes before updating all the neighbors
  const combinedNodes = superNodes.concat(newNodes);

  // construct the neighbors for the nodes
  const neighborNodes = defineSuperNeighbors(combinedNodes, newLinks);

  // remove all the nodes who do not have any neighbors
  let finalNodes = neighborNodes;
  superNodes.forEach((superNode) => {
    const children = superNode.ORIGIN;
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

export async function loadData(
  workspace: string,
  networkName: string,
  apiRoot: string = process.env.VUE_APP_MULTINET_HOST,
): Promise<Network> {
  // Define local variables that will store the api url and the responses from the database
  const multinet: {
    tables: { nodeTables: string[]; edgeTable: string };
    nodes: any[];
    links: any[];
    network: Network;
  } = {
    tables: { nodeTables: [], edgeTable: '' },
    nodes: [],
    links: [],
    network: { nodes: [], links: [] },
  };

  const api = multinetApi(apiRoot);

  // Fetch the names of all the node and edge tables
  multinet.tables = await api.graph(workspace, networkName);

  // Loop through each node tables and fetch the nodes
  for (const tableName of multinet.tables.nodeTables) {
    multinet.nodes = multinet.nodes.concat(
      await _downloadAllRows(api, workspace, tableName, 'node'),
    );
  }

  // Load the link table
  multinet.links = await _downloadAllRows(
    api,
    workspace,
    multinet.tables.edgeTable,
    'link',
  );

  // Define neighbors
  multinet.nodes = _defineNeighbors(multinet.nodes, multinet.links);

  // Set the network
  multinet.network = {
    nodes: _renameNodeVars(multinet.nodes),
    links: _renameLinkVars(multinet.links),
  };

  return multinet.network;
}
