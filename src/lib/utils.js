// Get the url querystring variables 
export function getUrlVars() {
  workspace = undefined;
  graph = undefined;
  let vars = {workspace, graph};
  window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi, function(m, key, value) {
      vars[key] = value;
  });
  return vars;
}
