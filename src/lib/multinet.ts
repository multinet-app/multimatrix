/* Multinet data importer */
import { multinetApi } from 'multinet';
import { Node, Network, Link } from '@/types';

async function _downloadAllRows(
  api: any,
  workspace: string,
  tableName: string,
  tableType: 'node' | 'link',
) {
  let table = await api.table(workspace, tableName, { offset: 0, limit: 1000 });

  // If the table is large, don't download the data
  // Modified to show larger networks
  // TODO modify to use this function to pull network for schema before drawing matrix
  if (
    (table.count > 14000 && tableType === 'node') ||
    (table.count > 23000 && tableType === 'link')
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
      limit: 1000,
    });
    output = output.concat(table.rows);
  }

  return output;
}

function _renameLinkVars(links: any[]): Link[] {
  links.forEach((link) => {
    link.id = link._id;
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