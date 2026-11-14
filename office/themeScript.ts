/** localStorage key for the visitor's choice. */
export const THEME_KEY = "office-theme";

/**
 * Runs in the page head before first paint (layout.tsx), so the right theme is on <html> before anything is drawn.
 * It acts only on /office; elsewhere nothing is set and the pages stay dark. Self-contained, so keep it in step with
 * `resolveTheme` in themeState.ts. The values are the key and the two modes.
 * Lives apart from themeState.ts because the server layout imports it, and themeState uses a React hook.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(p!=="/office"&&p!=="/office/")return;var m=null;try{m=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}if(m!=="dark"&&m!=="light")m=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=m}catch(e){}})()`;
