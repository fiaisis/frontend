// Resolve plugin logo at runtime
const lightLogoUrl = new URL('./images/fia-light-text-logo.png', import.meta.url).href;

export function createRoute(
  section: string,
  label: string,
  route: string,
  order: number,
  helpText: string,
  unauthorised: boolean
): void {
  // By default SciGateway will use logoDarkMode even when light mode is on.
  // Also, switching between light and dark doesn't alter the header bar
  // colour unless high contrast mode is also on, so for now only using the
  // light logo
  const logoUrl = lightLogoUrl;
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
      logoLightMode: logoUrl,
      logoDarkMode: logoUrl,
      logoAltText: 'Flexible Interactive Automation',
    },
  };
  document.dispatchEvent(new CustomEvent('scigateway', { detail: routeAction }));
}
