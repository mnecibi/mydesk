import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const viewer = document.querySelector('#viewer');
const status = document.querySelector('#status');
const resetButton = document.querySelector('#reset');

async function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeeae2');
  scene.add(new THREE.HemisphereLight('#fff8ea', '#a3ac98', 2.4));

  const sunlight = new THREE.DirectionalLight('#fff0d5', 3.5);
  sunlight.position.set(-3, 8, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 });
  sunlight.shadow.normalBias = .025;
  sunlight.shadow.bias = -.00015;
  scene.add(sunlight);

  const fill = new THREE.DirectionalLight('#d8efff', 1.7);
  fill.position.set(4, 5, -1);
  scene.add(fill);

  const gltf = await new GLTFLoader().loadAsync('./assets/myoffice.glb');
  const model = gltf.scene;
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(model);
  model.updateMatrixWorld(true);

  // Reuse the Blender camera and adapt its framing to the browser window.
  const sourceCamera = gltf.cameras.find((camera) => camera.isOrthographicCamera);
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, .1, 100);
  if (sourceCamera) {
    sourceCamera.getWorldPosition(camera.position);
    sourceCamera.getWorldQuaternion(camera.quaternion);
  } else {
    camera.position.set(-8.6, 9.3, 12.8);
  }

  const bounds = new THREE.Box3().setFromObject(model);
  const target = bounds.getCenter(new THREE.Vector3());
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enablePan = false;
  controls.minZoom = .65;
  controls.maxZoom = 3;
  controls.minPolarAngle = .15;
  controls.maxPolarAngle = Math.PI / 2 - .04;
  controls.update();
  controls.saveState();

  // Fit the bounding box as seen by the initial camera, including portrait screens.
  camera.updateMatrixWorld(true);
  const cameraBounds = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        cameraBounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
  }
  const projectedSize = cameraBounds.getSize(new THREE.Vector3());

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    const { width, height } = viewer.getBoundingClientRect();
    const aspect = width / height;
    const halfHeight = Math.max(projectedSize.y / 2, projectedSize.x / (2 * aspect)) * 1.18;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(Math.round(width), Math.round(height), false);
    render();
  }

  controls.addEventListener('change', render);
  resetButton.addEventListener('click', () => controls.reset());
  new ResizeObserver(resize).observe(viewer);
  resize();
  resetButton.disabled = false;
  status.hidden = true;
}

start().catch((error) => {
  console.error('Unable to load the scene:', error);
  status.hidden = false;
  status.textContent = 'My Office could not be loaded. Reload the page to try again.';
});
