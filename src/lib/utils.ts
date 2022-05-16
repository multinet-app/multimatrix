import { Edge } from '@/types';

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
