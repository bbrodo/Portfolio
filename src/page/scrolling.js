import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { mobileLayout } from './scroll-mode.js';

let lenis;

function configureScrolling() {
  lenis?.destroy();
  lenis = undefined;
  if (mobileLayout.matches) return;

  lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    virtualScroll: () => !document.documentElement.classList.contains('is-loading'),
    respectReducedMotion: false,
  });
}

function navigateToSection(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;

  event.preventDefault();
  if (location.hash) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  target.focus({ preventScroll: true });
  const immediate = link.classList.contains('skip-link');
  if (lenis) lenis.scrollTo(target, { immediate });
  else target.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' });
}

const tick = (seconds) => lenis?.raf(seconds * 1000);

configureScrolling();
mobileLayout.addEventListener('change', configureScrolling);
document.addEventListener('click', navigateToSection);
gsap.ticker.add(tick, false, true);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gsap.ticker.remove(tick);
    mobileLayout.removeEventListener('change', configureScrolling);
    document.removeEventListener('click', navigateToSection);
    lenis?.destroy();
  });
}
