(function () {
  try {
    const theme = localStorage.getItem('theme');

    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch {
    // Ignore storage failures.
  }
})();
