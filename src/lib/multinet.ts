/* Multinet data importer */
import { multinetApi } from 'multinet';

function _renameLinkVars(links: any[]) {
  for (const row of links) {
    row.id = row._id;
    row.source = row._from;
    row.target = row._to;

    delete row._id;
    delete row._from;
    delete row._to;
  }
  return links;
}

function _renameNodeVars(nodes: any[]) {
  for (const row of nodes) {
    row.id = row._id;
    delete row._id;
  }
  return nodes;
}

function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[]; }) => d.neighbors = []);
  for (const link of links) {
    nodes.filter((d: { _id: any; }) => d._id === link._from)[0].neighbors.push(link._to);
    nodes.filter((d: { _id: any; }) => d._id === link._to)[0].neighbors.push(link._from);
  }
  return nodes;
}

export async function loadData(
  workspace: string,
  networkName: string,
  apiRoot: string = 'https://api.multinet.app/api',
) {
  // Define local variables that will store the api url and the responses from the database
  const multinet: {tables: { nodeTables: string[], edgeTable: string}, nodes: any[], links: any[], network: any} = {
    tables: {nodeTables: [], edgeTable: ''},
    nodes: Array(),
    links: [],
    network: {},
  };

  const api = multinetApi(apiRoot);

  // Fetch the names of all the node and edge tables
  multinet.tables = await api.graph(workspace, networkName);

  // Loop through each node tables and fetch the nodes to global variables
  for (const nodeTable of multinet.tables.nodeTables) {
    const ntable = await api.table(workspace, nodeTable);
    multinet.nodes = multinet.nodes.concat(ntable);
  }

  // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS)
  // to a global variable
  const lTable = await api.table(workspace, multinet.tables.edgeTable);
  multinet.links = multinet.links.concat(lTable);

  // Define neighbors
  multinet.nodes = _defineNeighbors(multinet.nodes, multinet.links);

  // Set the network
  multinet.network = {
    nodes: _renameNodeVars(multinet.nodes),
    links: _renameLinkVars(multinet.links),
  };
  return JSON.parse(JSON.stringify(multinet.network));
}
