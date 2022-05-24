import { ArangoPath, Edge, Network } from '@/types';

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
export function defineNeighbors(nodes: any[], edges: Edge[]) {
  // eslint-disable-next-line no-return-assign, no-param-reassign
  nodes.forEach((d) => (d.neighbors = []));
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

export function setNodeDegreeDict(networkPreFilter: Network | null, networkOnLoad: Network | null, connectivityMatrixPaths: { nodes: Node[]; paths: ArangoPath[] }, directionalEdges: boolean) {
  // Create dict of row nodes and max degrees
  // Aggregated network
  // if (state.aggregated && state.network != null) {
  //   console.log(state.network.nodes);
  //   state.network.nodes.forEach((node) => {
  //     state.nodeDegreeDict[node._id] = node.neighbors.length;
  //   });
  // }
  // ToDO: add the directional axis to it
  // Determine correct network to use
  let baseNetwork: Network | null = { nodes: [], edges: [] };
  // Reset node dict
  const nodeDegreeDict: {[key: string]: number} = {};
  if (networkPreFilter != null || networkOnLoad !== null) {
    baseNetwork = connectivityMatrixPaths.paths.length > 0 ? structuredClone(networkPreFilter) : structuredClone(networkOnLoad);
  }
  if (baseNetwork !== null) {
    baseNetwork.edges.forEach((edge: Edge) => {
      if (directionalEdges) {
        // eslint-disable-next-line no-unused-expressions
        Object.hasOwn(nodeDegreeDict, edge._from) ? nodeDegreeDict[edge._from] += 1 : nodeDegreeDict[edge._from] = 0;
      } else {
        // eslint-disable-next-line no-unused-expressions
        Object.hasOwn(nodeDegreeDict, edge._from) ? nodeDegreeDict[edge._from] += 1 : nodeDegreeDict[edge._from] = 0;
        // eslint-disable-next-line no-unused-expressions
        Object.hasOwn(nodeDegreeDict, edge._to) ? nodeDegreeDict[edge._to] += 1 : nodeDegreeDict[edge._to] = 0;
      }
    });
  }
  // console.log(state.network);
  // // // Reset node dict
  // // state.nodeDegreeDict = {};
  // // Query network
  // if (state.connectivityMatrixPaths.paths.length > 0 && state.networkPreFilter != null) {
  //   state.networkPreFilter.nodes.forEach((node) => {
  //     state.nodeDegreeDict[node._id] = node.neighbors.length;
  //   });
  // //  "Regular network"
  // } else if (state.networkOnLoad !== null) {
  //   state.networkOnLoad.nodes.forEach((node) => {
  //     state.nodeDegreeDict[node._id] = node.neighbors.length;
  //   });
  // }
  const maxDegree = Math.max(...Object.values(nodeDegreeDict));

  return { nodeDegreeDict, maxDegree };
}
