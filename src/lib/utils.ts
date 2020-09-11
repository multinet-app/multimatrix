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
