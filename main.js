import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const mirror = {
  id: 'M001',
  name: '海兽葡萄镜',
  subtitle: '唐代 · 海兽葡萄纹 · 原型示例馆藏',
  modelUrl: './models/mirror-textured.gltf',
  fallbackUrl: './models/mirror-flat.glb'
};

const graphNodes = {
  'node-grape-pattern': { label: '葡萄纹', type: '纹饰', note: '葡萄纹与唐代文化交流和吉祥寓意相关。' },
  'node-sea-beast': { label: '海兽纹', type: '题材', note: '海兽纹连接神兽想象、装饰美学与时代风尚。' },
  'node-knob': { label: '镜钮', type: '结构', note: '镜钮承担背面中心结构作用，也关联拿持和悬挂方式。' },
  'node-outer-band': { label: '外缘带', type: '布局', note: '外缘带帮助理解镜背布局、纹饰分区与观看路径。' },
  'node-tang': { label: '唐代', type: '时代', note: '用于解释铜镜纹饰流行背景和工艺特征。' },
  'node-silk-road': { label: '丝绸之路', type: '文化', note: '帮助理解纹样传播与跨区域交流的关系。' }
};

const graphEdges = [
  ['node-grape-pattern', 'node-tang'],
  ['node-grape-pattern', 'node-silk-road'],
  ['node-grape-pattern', 'node-sea-beast'],
  ['node-sea-beast', 'node-tang'],
  ['node-knob', 'node-tang'],
  ['node-outer-band', 'node-grape-pattern']
];

const hotspots = [
  {
    id: 'grape',
    label: '葡萄纹',
    hint: '植物纹样',
    graphNodeId: 'node-grape-pattern',
    summary: '葡萄纹既是装饰元素，也是理解唐代文化交流的重要入口。',
    detail: '这个热点说明，用户点开的不只是一个局部纹饰，而是一条可以继续追问的知识线索。',
    position: new THREE.Vector3(0.04, 0.18, -0.18)
  },
  {
    id: 'beast',
    label: '海兽纹',
    hint: '神兽主题',
    graphNodeId: 'node-sea-beast',
    summary: '海兽纹体现了铜镜中的想象性动物形象，也是装饰中心和审美趣味的重要组成。',
    detail: '这个热点强调图像不只是装饰，还能连接到宗教想象、时代语境和大众审美。',
    position: new THREE.Vector3(0.04, -0.04, 0.18)
  },
  {
    id: 'knob',
    label: '镜钮',
    hint: '结构部位',
    graphNodeId: 'node-knob',
    summary: '镜钮是铜镜背面的结构中心，也是观看、悬挂和构图组织的关键参照点。',
    detail: '这个热点强调器物结构知识，让用户从部位进入用途与工艺理解。',
    position: new THREE.Vector3(0.07, -0.16, 0.02)
  },
  {
    id: 'ring',
    label: '外缘带',
    hint: '边缘组织',
    graphNodeId: 'node-outer-band',
    summary: '外缘带帮助组织整体构图，也常用于划分纹饰层次。',
    detail: '这个热点适合说明整体布局与局部细节的关系。',
    position: new THREE.Vector3(0.04, 0.24, 0.28)
  }
];

const params = new URLSearchParams(window.location.search);

function getRuntimeConfig() {
  return {
    version: params.get('v') || '1',
    mirrorId: params.get('mirrorId') || mirror.id,
    hotspotId: params.get('hotspotId') || params.get('hotspot') || 'grape',
    source: params.get('source') || 'direct'
  };
}

const runtime = getRuntimeConfig();
let activeHotspotId = runtime.hotspotId;

const canvas = document.getElementById('scene');
const overlay = document.getElementById('overlay');
const chipRow = document.getElementById('chip-row');
const statusEl = document.getElementById('status');
const hotspotTitle = document.getElementById('hotspot-title');
const hotspotHint = document.getElementById('hotspot-hint');
const hotspotSummary = document.getElementById('hotspot-summary');
const hotspotDetail = document.getElementById('hotspot-detail');
const relatedNodes = document.getElementById('related-nodes');

document.getElementById('mirror-title').textContent = mirror.name;
document.getElementById('mirror-subtitle').textContent = `${mirror.subtitle} · ${runtime.mirrorId} · ${runtime.source}`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f3ea);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0, 2.55);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.4;
controls.maxDistance = 3.6;
controls.minPolarAngle = Math.PI * 0.24;
controls.maxPolarAngle = Math.PI * 0.76;

scene.add(new THREE.HemisphereLight(0xfffbf5, 0x57412f, 1.35));
const mainLight = new THREE.DirectionalLight(0xfffbef, 1.6);
mainLight.position.set(3, 3, 4);
scene.add(mainLight);
const rimLight = new THREE.DirectionalLight(0xe5f0ea, 0.7);
rimLight.position.set(-3, 1.8, 2.5);
scene.add(rimLight);

const modelRoot = new THREE.Group();
modelRoot.rotation.y = -Math.PI / 2;
scene.add(modelRoot);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hotspotEntries = [];

function getActiveHotspot() {
  return hotspots.find((item) => item.id === activeHotspotId) || hotspots[0];
}

function getRelatedNodes(nodeId) {
  const ids = new Set([nodeId]);
  graphEdges.forEach(([a, b]) => {
    if (a === nodeId) ids.add(b);
    if (b === nodeId) ids.add(a);
  });
  return [...ids].map((id) => ({ id, ...graphNodes[id] })).filter(Boolean);
}

function renderSidebar() {
  const active = getActiveHotspot();
  hotspotTitle.textContent = active.label;
  hotspotHint.textContent = active.hint;
  hotspotSummary.textContent = active.summary;
  hotspotDetail.textContent = active.detail;

  chipRow.innerHTML = '';
  hotspots.forEach((item) => {
    const chip = document.createElement('button');
    chip.className = `chip${item.id === active.id ? ' active' : ''}`;
    chip.textContent = item.label;
    chip.addEventListener('click', () => setActiveHotspot(item.id));
    chipRow.appendChild(chip);
  });

  relatedNodes.innerHTML = '';
  getRelatedNodes(active.graphNodeId).forEach((node) => {
    const card = document.createElement('div');
    card.className = 'node';
    card.innerHTML = `<div class="node-title">${node.label}</div><div class="node-meta">${node.type}</div><div class="node-copy">${node.note}</div>`;
    relatedNodes.appendChild(card);
  });
}

function setActiveHotspot(id) {
  activeHotspotId = id;
  renderSidebar();
  hotspotEntries.forEach((entry) => {
    const active = entry.id === id;
    entry.dom.classList.toggle('active', active);
    entry.label.classList.toggle('active', active);
    entry.ring.material.color.set(active ? 0x7f9a8d : 0xdab073);
    entry.core.material.color.set(active ? 0x234138 : 0x8a5627);
    entry.pulse.material.color.set(active ? 0x7f9a8d : 0xb57a3e);
    entry.baseScale = active ? 1.14 : 1;
  });
}

function createHotspots() {
  const pulseGeometry = new THREE.RingGeometry(0.022, 0.034, 48);
  const ringGeometry = new THREE.RingGeometry(0.011, 0.016, 32);
  const coreGeometry = new THREE.SphereGeometry(0.008, 20, 20);

  hotspots.forEach((item) => {
    const group = new THREE.Group();
    group.position.copy(item.position);
    group.rotation.y = Math.PI / 2;
    group.userData.hotspotId = item.id;

    const pulse = new THREE.Mesh(pulseGeometry, new THREE.MeshBasicMaterial({ color: 0xb57a3e, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthTest: false }));
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xdab073, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
    const core = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({ color: 0x8a5627, depthTest: false }));

    group.add(pulse, ring, core);
    modelRoot.add(group);

    const button = document.createElement('button');
    button.className = 'hotspot';
    button.addEventListener('click', () => setActiveHotspot(item.id));
    overlay.appendChild(button);

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.textContent = item.label;
    overlay.appendChild(label);

    hotspotEntries.push({ id: item.id, group, pulse, ring, core, dom: button, label, baseScale: 1 });
  });

  setActiveHotspot(activeHotspotId);
}

function resize() {
  const stage = canvas.parentElement;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateOverlay() {
  const rect = canvas.getBoundingClientRect();
  hotspotEntries.forEach((entry) => {
    const position = entry.group.getWorldPosition(new THREE.Vector3()).project(camera);
    const visible = position.z < 1;
    const x = ((position.x + 1) / 2) * rect.width;
    const y = ((-position.y + 1) / 2) * rect.height;
    entry.dom.style.display = visible ? 'block' : 'none';
    entry.label.style.display = visible ? 'block' : 'none';
    entry.dom.style.left = `${x}px`;
    entry.dom.style.top = `${y}px`;
    entry.label.style.left = `${x}px`;
    entry.label.style.top = `${y}px`;
  });
}

canvas.addEventListener('pointerup', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hotspotEntries.flatMap((entry) => [entry.pulse, entry.ring, entry.core]), false);
  if (intersects.length) {
    setActiveHotspot(intersects[0].object.parent.userData.hotspotId);
  }
});

function attachModel(gltf, fallback = false) {
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const fitScale = 1 / (Math.max(size.x, size.y, size.z) || 1);

  model.position.sub(center);
  model.scale.setScalar(fitScale);
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.side = THREE.DoubleSide;
    }
  });

  modelRoot.add(model);
  createHotspots();
  statusEl.textContent = fallback ? '纹理版加载失败，已切换基础版模型，可正常交互' : '纹理版已加载，拖拽旋转并点击热点查看细节';
}

function loadModel(url, fallback = false) {
  const loader = new GLTFLoader();

  loader.load(
    url,
    (gltf) => attachModel(gltf, fallback),
    (event) => {
      if (event.total) {
        statusEl.textContent = `模型载入中 ${Math.round((event.loaded / event.total) * 100)}%`;
      }
    },
    (error) => {
      console.error(error);

      if (!fallback) {
        statusEl.textContent = `纹理版模型加载失败，正在回退基础版... ${error?.message || ''}`.trim();
        loadModel(mirror.fallbackUrl, true);
        return;
      }

      statusEl.textContent = `模型加载失败：${error?.message || '未知错误'}`;
    }
  );
}

loadModel(mirror.modelUrl);

function animate() {
  const elapsed = clock.getElapsedTime();
  hotspotEntries.forEach((entry, index) => {
    const pulseScale = entry.baseScale + Math.sin(elapsed * 2.4 + index * 0.7) * 0.12;
    entry.pulse.scale.setScalar(pulseScale);
    entry.pulse.material.opacity = 0.18 + (Math.sin(elapsed * 2.4 + index * 0.7) + 1) * 0.1;
  });
  controls.update();
  renderer.render(scene, camera);
  updateOverlay();
  requestAnimationFrame(animate);
}

renderSidebar();
resize();
window.addEventListener('resize', resize);
animate();
