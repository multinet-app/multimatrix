// Get the url querystring variables
export function getUrlVars(): { [key: string]: string } {
  const workspace = '';
  const graph = '';
  const vars: { [key: string]: string } = { workspace, graph };
  window.location.href.replace(
    /[?&]+([^=&]+)=([^&*#]*)/gi,
    (m: any, key: string, value: any) => {
      vars[key] = value;
      return value;
    },
  );
  vars.networkName = vars.graph;
  return vars;
}

export function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[] }) => (d.neighbors = []));
  links.forEach((link) => {
    const findNodeFrom = nodes.find((node) => node._id === link._from);
    const findNodeTo = nodes.find((node) => node._id === link._to);
    findNodeFrom.neighbors.push(link._to);
    findNodeTo.neighbors.push(link._from);
  });
  return nodes;
}
