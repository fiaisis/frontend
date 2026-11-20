(function () {
  const defaultTitle = document.title;
  const routeLabels = new Map([
    ['/accessibility', 'Accessibility'],
    ['/cookies', 'Cookies'],
    ['/help', 'Help'],
    ['/login', 'Sign in'],
  ]);
  let currentHostTitle = null;

  function updateTitle() {
    const path = window.location.pathname.replace(/\/$/, '').toLowerCase();
    const label = routeLabels.get(path);

    if (label) {
      currentHostTitle = `${label} | ${defaultTitle}`;
      document.title = currentHostTitle;
      return;
    }

    if (document.title === currentHostTitle) {
      document.title = defaultTitle;
    }
    currentHostTitle = null;
  }

  updateTitle();

  // single-spa has unmounted the outgoing plugin and has yet to mount the incoming one.
  window.addEventListener('single-spa:before-mount-routing-event', (event) => {
    if (!event.detail.navigationIsCanceled) {
      updateTitle();
    }
  });
})();
