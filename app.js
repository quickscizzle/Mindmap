import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Scene setup ──────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.setClearColor(0x0a0a1a);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// ── Lighting ─────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ── Data ─────────────────────────────────────────────────────
const nodes = [];     // { mesh, label, parentId, id }
const edges = [];     // { line, fromId, toId }
let nextId = 0;

const COLORS = [
  0x4fc3f7, 0x81c784, 0xffb74d, 0xf06292,
  0xba68c8, 0x4dd0e1, 0xaed581, 0xff8a65,
];

function pickColor(depth) {
  return COLORS[depth % COLORS.length];
}

// ── Node creation ────────────────────────────────────────────
function createNode(label, position, parentId = null, depth = 0) {
  const radius = depth === 0 ? 0.6 : 0.4;
  const color = pickColor(depth);

  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.3,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);

  const id = nextId++;
  const node = { mesh, label, parentId, id, depth, color };
  mesh.userData = { nodeId: id };
  nodes.push(node);

  if (parentId !== null) {
    addEdge(parentId, id);
  }

  return node;
}

// ── Edge creation ────────────────────────────────────────────
function addEdge(fromId, toId) {
  const from = nodes.find(n => n.id === fromId);
  const to = nodes.find(n => n.id === toId);
  if (!from || !to) return;

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 0.25,
    transparent: true,
  });
  const geometry = new THREE.BufferGeometry().setFromPoints([
    from.mesh.position,
    to.mesh.position,
  ]);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  edges.push({ line, fromId, toId });
}

function updateEdges() {
  for (const edge of edges) {
    const from = nodes.find(n => n.id === edge.fromId);
    const to = nodes.find(n => n.id === edge.toId);
    if (!from || !to) continue;
    const positions = edge.line.geometry.attributes.position;
    positions.setXYZ(0, from.mesh.position.x, from.mesh.position.y, from.mesh.position.z);
    positions.setXYZ(1, to.mesh.position.x, to.mesh.position.y, to.mesh.position.z);
    positions.needsUpdate = true;
  }
}

// ── Random position around a parent ─────────────────────────
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

// ── Build starter mindmap ────────────────────────────────────
function buildStarterMap() {
  const root = createNode('Min ide', new THREE.Vector3(0, 0, 0), null, 0);

  const topics = ['Research', 'Design', 'Kode', 'Test', 'Lancering'];
  const subTopics = {
    'Research': ['Brugere', 'Marked'],
    'Design': ['UI', 'UX', 'Farver'],
    'Kode': ['Frontend', 'Backend'],
    'Test': ['Unit', 'Integration'],
    'Lancering': ['Beta', 'Marketing'],
  };

  for (const topic of topics) {
    const pos = childPosition(root.mesh.position, 1);
    const node = createNode(topic, pos, root.id, 1);

    const subs = subTopics[topic] || [];
    for (const sub of subs) {
      const subPos = childPosition(node.mesh.position, 2);
      createNode(sub, subPos, node.id, 2);
    }
  }
}

buildStarterMap();

// ── Raycaster for interaction ────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let selectedNode = null;
let hoveredNode = null;

function getIntersectedNode(event) {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = nodes.map(n => n.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length > 0) {
    const nodeId = intersects[0].object.userData.nodeId;
    return nodes.find(n => n.id === nodeId);
  }
  return null;
}

// ── Mouse events ─────────────────────────────────────────────
renderer.domElement.addEventListener('mousemove', (e) => {
  const node = getIntersectedNode(e);
  if (node) {
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 15 + 'px';
    tooltip.style.top = e.clientY + 15 + 'px';
    tooltip.textContent = node.label;
    document.body.style.cursor = 'pointer';

    if (hoveredNode !== node) {
      if (hoveredNode) hoveredNode.mesh.material.emissiveIntensity = 0.15;
      node.mesh.material.emissiveIntensity = 0.5;
      hoveredNode = node;
    }
  } else {
    tooltip.style.display = 'none';
    document.body.style.cursor = 'default';
    if (hoveredNode) {
      hoveredNode.mesh.material.emissiveIntensity = 0.15;
      hoveredNode = null;
    }
  }
});

renderer.domElement.addEventListener('click', (e) => {
  const node = getIntersectedNode(e);
  if (node) {
    if (selectedNode) {
      selectedNode.mesh.material.emissive.setHex(selectedNode.color);
      selectedNode.mesh.material.emissiveIntensity = 0.15;
    }
    selectedNode = node;
    node.mesh.material.emissive.setHex(0xffffff);
    node.mesh.material.emissiveIntensity = 0.3;
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

// ── UI buttons ───────────────────────────────────────────────
document.getElementById('btn-add').addEventListener('click', () => {
  const parent = selectedNode || nodes[0];
  if (!parent) return;

  const label = prompt('Navn paa ny node:');
  if (!label) return;

  const pos = childPosition(parent.mesh.position, parent.depth + 1);
  createNode(label, pos, parent.id, parent.depth + 1);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  camera.position.set(0, 5, 12);
  controls.target.set(0, 0, 0);
});

// ── Gentle animation ─────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  for (const node of nodes) {
    node.mesh.position.y += Math.sin(t * 0.8 + node.id * 1.3) * 0.001;
  }

  updateEdges();
  controls.update();
  renderer.render(scene, camera);
}

animate();

// ── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
