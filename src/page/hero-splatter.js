import {
  AmbientLight, DirectionalLight, ExtrudeGeometry, Mesh, MeshStandardMaterial,
  OrthographicCamera, Path, PointLight, Scene, Shape, ShapeUtils, Vector2, WebGLRenderer,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { contours } from 'd3-contour';
import { mobileLayout } from './scroll-mode.js';

const hero = document.querySelector('.hero-splatter');
const image = hero.querySelector('img');
const canvas = hero.querySelector('canvas');

function makeRelief() {
  const resolution = 320;
  const mask = document.createElement('canvas');
  mask.width = mask.height = resolution;
  const context = mask.getContext('2d');
  context.drawImage(image, 0, 0, resolution, resolution);
  const { data } = context.getImageData(0, 0, resolution, resolution);
  const alpha = Array.from({ length: resolution ** 2 }, (_, index) => data[index * 4 + 3]);
  const outline = contours().size([resolution, resolution]).contour(alpha, 64.5);
  const scale = 2.4 / resolution;

  function roundOutline(ring) {
    const points = ring.slice(0, -1).map(([x, y]) => new Vector2(
      (x - resolution / 2) * scale,
      (resolution / 2 - y) * scale,
    ));
    // Cut each corner using two points on the adjoining edges.
    return points.flatMap((point, index) => {
      const next = points[(index + 1) % points.length];
      return [point.clone().lerp(next, 0.25), point.clone().lerp(next, 0.75)];
    });
  }

  const hasArea = (points) => Math.abs(ShapeUtils.area(points)) > scale ** 2 * 0.05;
  const shapes = [];
  for (const [outer, ...holes] of outline.coordinates) {
    const border = roundOutline(outer);
    if (!hasArea(border)) continue;

    const shape = new Shape(border);
    shape.holes = holes.map(roundOutline).filter(hasArea).map((hole) => new Path(hole));
    shapes.push(shape);
  }

  const coreDepth = 0.015;
  const extrusion = new ExtrudeGeometry(shapes, {
    depth: coreDepth,
    bevelThickness: 0.01,
    bevelSize: 0.006,
    bevelSegments: 3,
  });
  extrusion.translate(0, 0, -coreDepth / 2);
  extrusion.deleteAttribute('normal');
  extrusion.deleteAttribute('uv');
  const geometry = mergeVertices(extrusion);
  extrusion.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

async function mount() {
  await image.decode();
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) return;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1.45, 1.45, 1.45, -1.45, 0.1, 20);
  camera.position.z = 5;

  const material = new MeshStandardMaterial({ color: 0xbebebe, metalness: 0.58, roughness: 0.28 });
  const relief = new Mesh(makeRelief(), material);
  scene.add(relief);
  scene.add(new AmbientLight(0xffffff, 0.9));

  const fill = new DirectionalLight(0xffffff, 2);
  fill.position.set(-2, 3, -1);
  scene.add(fill);
  const highlight = new PointLight(0xffffff, 18);
  scene.add(highlight);

  let elapsed = 0;
  let lastFrame;

  function draw(now) {
    if (lastFrame !== undefined) elapsed += Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    relief.rotation.set(0.14 * Math.sin(elapsed * 0.6), 0.25 + elapsed * 0.42, -0.08);
    highlight.position.set(2.8 * Math.cos(elapsed * 0.9), 1.8 + Math.sin(elapsed * 0.9), 2.6);
    renderer.render(scene, camera);
    hero.classList.add('is-rendering');
  }

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio, mobileLayout.matches ? 1.25 : 2);
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    renderer.setSize(hero.clientWidth, hero.clientHeight, false);
  };
  resize();
  draw(performance.now());
  const sizing = new ResizeObserver(resize);
  sizing.observe(hero);
  mobileLayout.addEventListener('change', resize);
  const visibility = new IntersectionObserver(([entry]) => {
    lastFrame = undefined;
    renderer.setAnimationLoop(entry.isIntersecting ? draw : null);
  });
  visibility.observe(hero);

  canvas.addEventListener('webglcontextlost', () => {
    hero.classList.remove('is-rendering');
    visibility.disconnect();
    sizing.disconnect();
    mobileLayout.removeEventListener('change', resize);
    renderer.setAnimationLoop(null);
  }, { once: true });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      visibility.disconnect();
      sizing.disconnect();
      mobileLayout.removeEventListener('change', resize);
      renderer.setAnimationLoop(null);
      relief.geometry.dispose();
      material.dispose();
      renderer.dispose();
      hero.classList.remove('is-rendering');
    });
  }
}

export const heroReady = mount();
