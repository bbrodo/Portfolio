import * as THREE from 'three';
import { Body, Box, PointToPointConstraint, Vec3, World } from 'cannon-es';

const crateSize = 1;
const spacing = 1.04;
const layout = [
  [-spacing, 0], [0, 0], [spacing, 0],
  [-spacing / 2, 1], [spacing / 2, 1],
  [0, 2],
];

export function mountThetaDemo(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181818);
  scene.fog = new THREE.Fog(0x181818, 14, 28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  camera.position.set(5.2, 3.9, 8.4);
  camera.lookAt(0, 1.3, 0);
  camera.updateMatrixWorld();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x696969, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(-3, 7, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight);

  const world = new World({ gravity: new Vec3(0, -9.82, 0), allowSleep: true });
  world.solver.iterations = 16;
  world.defaultContactMaterial.friction = 0.58;
  const floor = new Body({ shape: new Box(new Vec3(15, 0.25, 15)) });
  floor.position.y = -0.25;
  world.addBody(floor);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1 }),
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const grid = new THREE.GridHelper(30, 30, 0x545454, 0x3d3d3d);
  grid.position.y = 0.002;
  scene.add(grid);

  const cube = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
  const edgeGeometry = new THREE.EdgesGeometry(cube);
  const edges = new THREE.LineBasicMaterial({ color: 0x999999 });
  const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85 });
  const braceGeometry = new THREE.BoxGeometry(0.93, 0.09, 0.025);
  const braceMaterial = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });

  const crates = layout.map(([x, level]) => {
    const body = new Body({
      mass: 1,
      shape: new Box(new Vec3(0.5, 0.5, 0.5)),
      linearDamping: 0.12,
      angularDamping: 0.25,
    });
    world.addBody(body);

    const mesh = new THREE.Mesh(cube, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(edgeGeometry, edges));
    for (let side = 0; side < 4; side++) {
      const face = new THREE.Group();
      face.rotation.y = side * Math.PI / 2;
      for (const angle of [-1, 1]) {
        const brace = new THREE.Mesh(braceGeometry, braceMaterial);
        brace.position.z = 0.5;
        brace.rotation.z = angle * Math.PI / 4;
        face.add(brace);
      }
      mesh.add(face);
    }
    scene.add(mesh);
    return { body, mesh, start: new Vec3(x, level + 0.5, 0) };
  });
  const crateMeshes = crates.map(({ mesh }) => mesh);
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const grabPoint = new THREE.Vector3();
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const anchor = new Body({ type: Body.KINEMATIC, collisionFilterMask: 0 });
  world.addBody(anchor);
  let drag;

  function setRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2,
    );
    ray.setFromCamera(pointer, camera);
  }

  function startDrag(event) {
    if (drag || event.button !== 0) return;

    setRay(event);
    const hit = ray.intersectObjects(crateMeshes, false)[0];
    if (!hit) return;

    const { body } = crates[crateMeshes.indexOf(hit.object)];
    dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, hit.point);
    anchor.position.set(hit.point.x, hit.point.y, hit.point.z);
    const pivot = body.pointToLocalFrame(anchor.position);
    const constraint = new PointToPointConstraint(body, pivot, anchor, new Vec3(), 75);
    world.addConstraint(constraint);
    body.wakeUp();
    drag = { pointerId: event.pointerId, constraint };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-grabbing');
  }

  function moveDrag(event) {
    if (drag?.pointerId !== event.pointerId) return;

    setRay(event);
    if (ray.ray.intersectPlane(dragPlane, grabPoint)) {
      anchor.position.set(grabPoint.x, Math.max(0.15, grabPoint.y), grabPoint.z);
      drag.constraint.bodyA.wakeUp();
    }
  }

  function endDrag() {
    if (!drag) return;

    const { pointerId, constraint } = drag;
    drag = undefined;
    world.removeConstraint(constraint);
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    canvas.classList.remove('is-grabbing');
  }

  function releasePointer(event) {
    if (drag?.pointerId === event.pointerId) endDrag();
  }

  function updateMeshes() {
    for (const { body, mesh } of crates) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  function reset() {
    endDrag();
    for (const { body, start } of crates) {
      body.position.copy(start);
      body.previousPosition.copy(start);
      body.quaternion.set(0, 0, 0, 1);
      for (const vector of [body.velocity, body.angularVelocity, body.force, body.torque]) {
        vector.setZero();
      }
      body.aabbNeedsUpdate = true;
      body.wakeUp();
    }
    updateMeshes();
  }

  function pullCrate() {
    endDrag();
    crates[4].body.applyImpulse(new Vec3(0, 0.15, 10));
  }

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;

    camera.aspect = clientWidth / clientHeight;
    camera.fov = camera.aspect < 1.25 ? 52 : 42;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }

  canvas.addEventListener('pointerdown', startDrag);
  canvas.addEventListener('pointermove', moveDrag);
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('lostpointercapture', releasePointer);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  reset();
  resize();

  let previous = performance.now();
  renderer.setAnimationLoop((now) => {
    world.step(1 / 60, THREE.MathUtils.clamp((now - previous) / 1000, 0, 0.1), 6);
    previous = now;
    updateMeshes();
    renderer.render(scene, camera);
  });

  return {
    pullCrate,
    reset,
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      endDrag();
      canvas.removeEventListener('pointerdown', startDrag);
      canvas.removeEventListener('pointermove', moveDrag);
      canvas.removeEventListener('pointerup', releasePointer);
      canvas.removeEventListener('pointercancel', releasePointer);
      canvas.removeEventListener('lostpointercapture', releasePointer);
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      keyLight.shadow.dispose();
      renderer.dispose();
    },
  };
}
