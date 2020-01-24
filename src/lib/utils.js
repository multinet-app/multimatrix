// Get the url querystring variables 
export function getUrlVars() {
  let vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi, function(m, key, value) {
      vars[key] = value;
  });
  return vars;
}
