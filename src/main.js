import './page/scrolling.js';
import './page/navigation.js';
import './page/work.js';
import './page/theta-dialog.js';

import('./page/hero-splatter.js')
  .then(({ heroReady }) => heroReady)
  .catch((error) => {
    console.warn('Could not load the 3D hero logo.', error);
  })
  .finally(() => {
    document.documentElement.classList.remove('is-loading');
  });
