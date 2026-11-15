import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';

const mobileLayout = window.matchMedia('(max-width: 767px), (hover: none), (pointer: coarse)');
let lenis;

function configureScrolling() {
  lenis?.destroy();
  lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    virtualScroll: () => !document.documentElement.classList.contains('is-loading'),
    syncTouch: mobileLayout.matches,
    syncTouchLerp: 0.13,
    touchInertiaExponent: 1.25,
    respectReducedMotion: false,
  });
}

const mobileNavigation = { duration: 0.55, easing: gsap.parseEase('sine.inOut') };

function navigateToSection(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains('skip-link')) return;

  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;

  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  target.focus({ preventScroll: true });
  lenis.scrollTo(target, mobileLayout.matches ? mobileNavigation : undefined);
}

const tick = (seconds) => lenis.raf(seconds * 1000);

configureScrolling();
mobileLayout.addEventListener('change', configureScrolling);
document.addEventListener('click', navigateToSection);
gsap.ticker.add(tick, false, true);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gsap.ticker.remove(tick);
    mobileLayout.removeEventListener('change', configureScrolling);
    document.removeEventListener('click', navigateToSection);
    lenis.destroy();
  });
}
