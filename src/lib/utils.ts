import { Edge, Network, Node } from '@/types';

// Get the url querystring variables
export function getUrlVars() {
  const url = new URL(window.location.href);
  const vars: { [key: string]: string } = {};

  url.searchParams.forEach((value: string, key: string) => {
    vars[key] = value;
  });

  return vars;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineNeighbors(nodes: any[], edges: Edge[]): Node[] {
  nodes.forEach((d) => { d.neighbors = []; });
  edges.forEach((edge) => {
    const findNodeFrom = nodes.find((node) => node._id === edge._from);
    const findNodeTo = nodes.find((node) => node._id === edge._to);

    if (findNodeFrom !== undefined && findNodeTo !== undefined) {
      findNodeFrom.neighbors.push(edge._to);
      findNodeTo.neighbors.push(edge._from);
    }
  });

  return nodes;
}

// Format dates
// Mon DD, YYYY HH:MM timezone
export function formatLongDate(date: string | number) {
  const dateFormat = new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  });

  return dateFormat;
}

// Format dates
// MM DD YYYY
export function formatShortDate(date: Date) {
  const dateFormat = date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return dateFormat;
}

export function setNodeDegreeDict(networkPreFilter: Network | null, networkOnLoad: Network | null, queried: boolean, directionalEdges: boolean) {
  // Determine correct network to use
  let baseNetwork: Network = { nodes: [], edges: [] };

  if (networkPreFilter !== null || networkOnLoad !== null) {
    baseNetwork = queried ? structuredClone(networkPreFilter as Network) : structuredClone(networkOnLoad as Network);
  }

  // Reset node dict
  const nodeDegreeDict: {[key: string]: number} = {};
  baseNetwork.nodes.forEach((node) => { nodeDegreeDict[node._id] = 0; });

  baseNetwork.edges.forEach((edge: Edge) => {
    if (directionalEdges) {
      nodeDegreeDict[edge._from] = edge._from in nodeDegreeDict ? nodeDegreeDict[edge._from] + 1 : 1;
    } else {
      nodeDegreeDict[edge._from] = edge._from in nodeDegreeDict ? nodeDegreeDict[edge._from] + 1 : 1;
      nodeDegreeDict[edge._to] = edge._from in nodeDegreeDict ? nodeDegreeDict[edge._to] + 1 : 1;
    }
  });

  const maxDegree = Math.max(...Object.values(nodeDegreeDict));

  return { nodeDegreeDict, maxDegree };
}
