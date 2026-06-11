// Resolve plugin logo at runtime
const logoDarkMode = new URL('./images/fia-light-text-logo.png', import.meta.url).href;
const logoLightMode = new URL('./images/fia-dark-text-logo.png', import.meta.url).href;

export function createRoute(
  section: string,
  label: string,
  route: string,
  order: number,
  helpText: string,
  unauthorised: boolean
): void {
  const routeAction = {
    type: 'scigateway:api:register_route',
    payload: {
      section: section,
      link: route,
      plugin: 'fia',
      displayName: label,
      order: order,
      helpText: helpText,
      unauthorised: unauthorised,
      logoLightMode: logoLightMode,
      logoDarkMode: logoDarkMode,
      logoAltText: 'Flexible Interactive Automation',
    },
  };
  document.dispatchEvent(new CustomEvent('scigateway', { detail: routeAction }));
}
