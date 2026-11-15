import { gsap } from 'gsap';

const projects = document.querySelector('.work-projects');
const controls = document.querySelector('.work-controls');
const [previous, next] = controls.querySelectorAll('button');
let animation;
let destination;

function updateControls() {
  const maxScroll = projects.scrollWidth - projects.clientWidth;
  const current = destination ?? projects.scrollLeft;
  controls.hidden = maxScroll <= 1;
  previous.setAttribute('aria-disabled', String(current <= 1));
  next.setAttribute('aria-disabled', String(current >= maxScroll - 1));
}

function finishAnimation() {
  animation = undefined;
  destination = undefined;
  projects.classList.remove('is-scrolling');
  updateControls();
}

function scrollProjects(button, direction) {
  if (button.getAttribute('aria-disabled') === 'true') return;

  const firstCardLeft = projects.firstElementChild.getBoundingClientRect().left;
  const maxScroll = projects.scrollWidth - projects.clientWidth;
  const stops = Array.from(projects.children, (card) =>
    Math.min(card.getBoundingClientRect().left - firstCardLeft, maxScroll),
  );
  const current = destination ?? projects.scrollLeft;
  const target = direction > 0
    ? stops.find((stop) => stop > current + 1)
    : stops.findLast((stop) => stop < current - 1);

  if (target === undefined) return;

  animation?.kill();
  destination = target;
  projects.classList.add('is-scrolling');
  const position = { x: projects.scrollLeft };
  animation = gsap.to(position, {
    x: target,
    duration: 0.55,
    ease: 'sine.inOut',
    onUpdate: () => { projects.scrollLeft = position.x; },
    onComplete: finishAnimation,
    onInterrupt: finishAnimation,
  });
  updateControls();
}

function interruptAnimation() {
  animation?.kill();
}

previous.addEventListener('click', () => scrollProjects(previous, -1));
next.addEventListener('click', () => scrollProjects(next, 1));
projects.addEventListener('scroll', updateControls, { passive: true });
projects.addEventListener('pointerdown', interruptAnimation, { passive: true });
projects.addEventListener('wheel', interruptAnimation, { passive: true });
projects.addEventListener('keydown', interruptAnimation);
new ResizeObserver(updateControls).observe(projects);
updateControls();
