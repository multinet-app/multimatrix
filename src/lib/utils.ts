// Get the url querystring variables
export function getUrlVars(): { [key: string]: string} {
  const workspace: string = '';
  const network: string = '';
  const vars: { [key: string]: string} = {workspace, network};
  window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi,
    (m: any, key: string, value: any) => {
      vars[key] = value;
      return value;
    },
  );
  vars.networkName = vars.network;
  return vars;
}
