import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.setClearColor(0x020810);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0x1a3a5c, 0.4));
const dirLight = new THREE.DirectionalLight(0x4fc3f7, 0.6);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.3);
rimLight.position.set(-5, -3, -5);
scene.add(rimLight);

const gridHelper = new THREE.GridHelper(40, 40, 0x0a3d5c, 0x061a2e);
gridHelper.position.y = -4;
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

const nodes = [];
const edges = [];
let nextId = 0;

const COLORS = [
  0x00e5ff, 0x00b8d4, 0x18ffff, 0x40c4ff,
  0x448aff, 0x69f0ae, 0xffab40, 0xff6e40,
];

function pickColor(depth) {
  return COLORS[depth % COLORS.length];
}

function createNode(label, position, parentId = null, depth = 0) {
  const isRoot = depth === 0;
  const radius = isRoot ? 0.55 : 0.3;
  const color = pickColor(depth);

  const geometry = new THREE.IcosahedronGeometry(radius, isRoot ? 2 : 1);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: isRoot ? 0.6 : 0.3,
    roughness: 0.2,
    metalness: 0.8,
    wireframe: isRoot,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);

  if (isRoot) {
    const ringGeo = new THREE.RingGeometry(radius * 1.3, radius * 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    scene.add(ring);
    mesh.userData.ring = ring;
  }

  if (isRoot) {
    const glow = new THREE.PointLight(color, 1, 8);
    glow.position.copy(position);
    scene.add(glow);
    mesh.userData.glow = glow;
  }

  const id = nextId++;
  const node = { mesh, label, parentId, id, depth, color };
  mesh.userData.nodeId = id;
  nodes.push(node);

  if (parentId !== null) {
    addEdge(parentId, id);
  }

  return node;
}

function addEdge(fromId, toId) {
  const from = nodes.find(n => n.id === fromId);
  const to = nodes.find(n => n.id === toId);
  if (!from || !to) return;

  const points = [from.mesh.position.clone(), to.mesh.position.clone()];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const material = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    opacity: 0.7,
    transparent: true,
    linewidth: 2,
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const glowMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    opacity: 0.2,
    transparent: true,
    linewidth: 4,
  });
  const glowLine = new THREE.Line(geometry.clone(), glowMat);
  scene.add(glowLine);

  edges.push({ line, glowLine, fromId, toId });
}

function updateEdges() {
  for (const edge of edges) {
    const from = nodes.find(n => n.id === edge.fromId);
    const to = nodes.find(n => n.id === edge.toId);
    if (!from || !to) continue;

    for (const l of [edge.line, edge.glowLine]) {
      const positions = l.geometry.attributes.position;
      positions.setXYZ(0, from.mesh.position.x, from.mesh.position.y, from.mesh.position.z);
      positions.setXYZ(1, to.mesh.position.x, to.mesh.position.y, to.mesh.position.z);
      positions.needsUpdate = true;
    }
  }
}

function childPosition(parentPos, depth) {
  const distance = 2.5 + Math.random() * 1.5;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI - Math.PI / 2;
  return new THREE.Vector3(
    parentPos.x + distance * Math.cos(phi) * Math.cos(theta),
    parentPos.y + distance * Math.sin(phi) * 0.6,
    parentPos.z + distance * Math.cos(phi) * Math.sin(theta),
  );
}

function buildStarterMap() {
  const root1 = createNode('Projekt Alpha', new THREE.Vector3(-5, 0, 0), null, 0);
  const r1topics = ['Research', 'Design', 'Kode'];
  const r1subs = {
    'Research': ['Brugere', 'Marked'],
    'Design': ['UI', 'UX'],
    'Kode': ['Frontend', 'Backend'],
  };
  for (const topic of r1topics) {
    const pos = childPosition(root1.mesh.position, 1);
    const node = createNode(topic, pos, root1.id, 1);
    for (const sub of (r1subs[topic] || [])) {
      createNode(sub, childPosition(node.mesh.position, 2), node.id, 2);
    }
  }

  const root2 = createNode('Projekt Beta', new THREE.Vector3(5, 0, 0), null, 0);
  const r2topics = ['Test', 'Lancering', 'Skalering'];
  const r2subs = {
    'Test': ['Unit', 'Integration'],
    'Lancering': ['Beta', 'Marketing'],
    'Skalering': ['Cloud', 'CDN'],
  };
  for (const topic of r2topics) {
    const pos = childPosition(root2.mesh.position, 1);
    const node = createNode(topic, pos, root2.id, 1);
    for (const sub of (r2subs[topic] || [])) {
      createNode(sub, childPosition(node.mesh.position, 2), node.id, 2);
    }
  }
}

buildStarterMap();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let selectedNode = null;
let hoveredNode = null;

function getIntersectedNode(event) {
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  mouse.x = (clientX / innerWidth) * 2 - 1;
  mouse.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = nodes.map(n => n.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length > 0) {
    const nodeId = intersects[0].object.userData.nodeId;
    return nodes.find(n => n.id === nodeId);
  }
  return null;
}

renderer.domElement.addEventListener('mousemove', (e) => {
  const node = getIntersectedNode(e);
  if (node) {
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 15 + 'px';
    tooltip.style.top = e.clientY + 15 + 'px';
    tooltip.textContent = node.label;
    document.body.style.cursor = 'pointer';

    if (hoveredNode !== node) {
      if (hoveredNode) hoveredNode.mesh.material.emissiveIntensity = hoveredNode.depth === 0 ? 0.6 : 0.3;
      node.mesh.material.emissiveIntensity = 1.0;
      hoveredNode = node;
    }
  } else {
    tooltip.style.display = 'none';
    document.body.style.cursor = 'default';
    if (hoveredNode) {
      hoveredNode.mesh.material.emissiveIntensity = hoveredNode.depth === 0 ? 0.6 : 0.3;
      hoveredNode = null;
    }
  }
});

renderer.domElement.addEventListener('click', (e) => {
  const node = getIntersectedNode(e);
  if (node) {
    if (selectedNode) {
      selectedNode.mesh.material.emissive.setHex(selectedNode.color);
      selectedNode.mesh.material.emissiveIntensity = selectedNode.depth === 0 ? 0.6 : 0.3;
    }
    selectedNode = node;
    node.mesh.material.emissive.setHex(0xffffff);
    node.mesh.material.emissiveIntensity = 0.8;
  }
});

renderer.domElement.addEventListener('dblclick', (e) => {
  const node = getIntersectedNode(e);
  const parent = node || selectedNode || nodes[0];
  if (!parent) return;

  const label = prompt('Navn paa ny node:');
  if (!label) return;

  const pos = childPosition(parent.mesh.position, parent.depth + 1);
  createNode(label, pos, parent.id, parent.depth + 1);
});

document.getElementById('btn-add').addEventListener('click', () => {
  const parent = selectedNode || nodes[0];
  if (!parent) return;

  const label = prompt('Navn paa ny node:');
  if (!label) return;

  const pos = childPosition(parent.mesh.position, parent.depth + 1);
  createNode(label, pos, parent.id, parent.depth + 1);
});

document.getElementById('btn-add-root').addEventListener('click', () => {
  const label = prompt('Navn paa ny kerne-ide:');
  if (!label) return;

  const angle = Math.random() * Math.PI * 2;
  const dist = 6 + Math.random() * 4;
  const pos = new THREE.Vector3(
    Math.cos(angle) * dist,
    (Math.random() - 0.5) * 3,
    Math.sin(angle) * dist,
  );
  createNode(label, pos, null, 0);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  camera.position.set(0, 5, 16);
  controls.target.set(0, 0, 0);
});

const particleCount = 300;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 40;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0x00e5ff,
  size: 0.05,
  transparent: true,
  opacity: 0.4,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  for (const node of nodes) {
    node.mesh.position.y += Math.sin(t * 0.8 + node.id * 1.3) * 0.001;

    if (node.depth === 0) {
      node.mesh.rotation.y = t * 0.3 + node.id;
      node.mesh.rotation.x = Math.sin(t * 0.2) * 0.1;
      if (node.mesh.userData.ring) {
        node.mesh.userData.ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.3;
        node.mesh.userData.ring.rotation.z = t * 0.2;
        node.mesh.userData.ring.position.copy(node.mesh.position);
      }
      if (node.mesh.userData.glow) {
        node.mesh.userData.glow.position.copy(node.mesh.position);
      }
    }
  }

  for (const edge of edges) {
    edge.line.material.opacity = 0.5 + Math.sin(t * 2) * 0.2;
  }

  particles.rotation.y = t * 0.02;

  updateEdges();
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
