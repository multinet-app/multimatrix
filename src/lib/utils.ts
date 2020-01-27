// Get the url querystring variables
export function getUrlVars() {
  const workspace: string = '';
  const graph: string = '';
  const vars: { [key: string]: string} = {workspace, graph};
  window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi,
    (m: any, key: string, value: any) => {
      vars[key] = value;
      return value;
    },
  );
  return vars;
}
