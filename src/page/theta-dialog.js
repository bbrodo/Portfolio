const trigger = document.querySelector('.theta-open');
const dialog = document.querySelector('.theta-demo');
const canvas = dialog.querySelector('canvas');
const status = dialog.querySelector('.theta-status');
const pull = dialog.querySelector('.theta-pull');
const reset = dialog.querySelector('.theta-reset');
let demo;

trigger.hidden = false;

trigger.addEventListener('click', async () => {
  dialog.showModal();
  status.textContent = 'Loading physics demo…';
  status.hidden = false;

  try {
    const { mountThetaDemo } = await import('./theta-demo.js');
    if (!dialog.open || demo) return;

    demo = mountThetaDemo(canvas);
    status.hidden = true;
    pull.disabled = false;
    reset.disabled = false;
  } catch {
    if (dialog.open) status.textContent = 'Couldn’t load the 3D demo. It requires a browser with WebGL 2.';
  }
});

pull.addEventListener('click', () => demo?.pullCrate());
reset.addEventListener('click', () => demo?.reset());

dialog.addEventListener('close', () => {
  demo?.dispose();
  demo = undefined;
  pull.disabled = true;
  reset.disabled = true;
});
