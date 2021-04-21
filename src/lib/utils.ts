import { Link } from '@/types';

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
export function defineNeighbors(nodes: any[], links: Link[]) {
  // eslint-disable-next-line no-return-assign, no-param-reassign
  nodes.forEach((d) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node._id === link._from);
    const findNodeTo = nodes.find((node) => node._id === link._to);

    if (findNodeFrom !== undefined && findNodeTo !== undefined) {
      findNodeFrom.neighbors.push(link._to);
      findNodeTo.neighbors.push(link._from);
    }
  });

  return nodes;
}
