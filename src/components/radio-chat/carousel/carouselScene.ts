import * as THREE from 'three';

export interface CarouselSceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  group: THREE.Group;
}

export const createCarouselScene = (container: HTMLElement): CarouselSceneRefs => {
  const scene = new THREE.Scene();
  const fov = window.innerWidth < 768 ? 62 : 67;
  const camera = new THREE.PerspectiveCamera(
    fov,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0x8b5cf6, 1, 100);
  pointLight.position.set(0, 0, 5);
  scene.add(pointLight);

  const group = new THREE.Group();
  scene.add(group);

  // Fixed camera position
  camera.position.set(0, 0.3, 13.5);

  return { scene, camera, renderer, group };
};

export const initializeSlots = (
  group: THREE.Group,
  meshesRef: Map<string, THREE.Mesh>,
  maxSlots: number
): void => {
  const radius = 7.8;
  const angleStep = (Math.PI * 2) / maxSlots;

  for (let i = 0; i < maxSlots; i++) {
    const scaleFactor = Math.min(window.innerWidth / 1200, 2.0);
    const geometry = new THREE.PlaneGeometry(4.83 * scaleFactor, 7.04 * scaleFactor);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);

    const angle = -(i * angleStep) + Math.PI;
    mesh.position.set(
      Math.cos(angle) * radius,
      0.82,
      Math.sin(angle) * radius
    );
    mesh.lookAt(new THREE.Vector3(0, 0, 0));

    group.add(mesh);
    meshesRef.set(`slot_${i}`, mesh);
  }
};

export const startAnimationLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): void => {
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  animate();
};
