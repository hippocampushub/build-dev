// Google Analytics of the previous site, loaded only once the visitor has accepted statistics in the notice bar.
const GA_ID = "G-SGZ83Y6E8H";

// Only the live build reports: local development and test deployments (VITE_STAGING) never do
export const ANALYTICS_ENABLED = import.meta.env.PROD && !import.meta.env.VITE_STAGING;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let loaded = false;

/** Adds gtag.js with the previous site's settings; page changes are tracked by GA4's history events. */
export function loadAnalytics() {
  if (loaded || !ANALYTICS_ENABLED) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag() must push the arguments object itself, as in Google's snippet
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Removes the Google Analytics cookies (_ga, _ga_<id>) when the visitor withdraws consent. */
export function clearAnalyticsCookies() {
  const names = document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n.startsWith("_ga"));
  const host = window.location.hostname;
  // GA sets them on the widest domain it can (.hippocampushub.eu), so try each level of the host name
  const domains = host.split(".").map((_, i, parts) => parts.slice(i).join(".")).filter((d) => d.includes("."));
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
  }
}
