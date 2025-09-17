import logoLight from './images/fia-light-text-logo.png';

export function createRoute(
  section: string,
  label: string,
  route: string,
  order: number,
  helpText: string,
  unauthorised: boolean
): void {
  // Explicit plugin base URL, else fall back to Vite's BASE_URL for local dev
  const pluginBase = (import.meta.env.REACT_APP_PLUGIN_URL ?? import.meta.env.BASE_URL ?? '') as string;

  // Normalise: drop trailing slash on base; ensure the asset path begins with one
  const base = pluginBase.replace(/\/$/, '');
  const asset = logoLight.startsWith('/') ? logoLight : `/${logoLight}`;
  const logoUrl = `${base}${asset}`;

  const routeAction = {
    type: 'scigateway:api:register_route',
    payload: {
      section,
      link: route,
      plugin: 'fia',
      displayName: label,
      order,
      helpText,
      unauthorised,
      logoLightMode: logoUrl,
      logoDarkMode: logoUrl,
      logoAltText: 'Flexible Interactive Automation',
    },
  };
  document.dispatchEvent(new CustomEvent('scigateway', { detail: routeAction }));
}
