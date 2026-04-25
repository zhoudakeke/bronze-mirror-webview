// mini-graph.js
// 知识图谱：右下角 mini 抽屉 + 全屏浮层
// 数据源：main.js bootstrap 时 loadGraph() 拉来的 graph.json
//
// 对外 API：
//   initGraphUI({ getGraphData, onNodeFocus, onNavigateMirror })
//   renderMiniGraph(focusConceptId)
//   openFullGraph(focusConceptId, depth = 2)

import cytoscape from 'cytoscape';

let getGraphData = () => ({ types: {}, concepts: [], edges: [] });
let onNodeFocus = () => {};
let onNavigateMirror = () => {};

let miniCy = null;
let fullCy = null;
let currentMiniFocus = null;
let currentFullFocus = null;

// ---------- 工具 ----------

function buildElements(focusId, depth) {
  const data = getGraphData();
  const visited = new Map();
  visited.set(focusId, 0);
  const queue = [[focusId, 0]];
  while (queue.length) {
    const [cur, d] = queue.shift();
    if (d >= depth) continue;
    data.edges.forEach((e) => {
      const next = e.source === cur ? e.target : e.target === cur ? e.source : null;
      if (next && !visited.has(next)) {
        visited.set(next, d + 1);
        queue.push([next, d + 1]);
      }
    });
  }

  const nodeIds = new Set(visited.keys());
  const nodes = [...nodeIds].map((id) => {
    const c = data.concepts.find((x) => x.id === id);
    if (!c) return null;
    const t = data.types[c.type] || {};
    const iconKey = c.iconKey || 'iconPrimary';
    return {
      data: {
        id: c.id,
        label: c.label,
        type: c.type,
        color: t.color || '#888',
        shape: t.shape || 'ellipse',
        icon: t[iconKey] || t.iconPrimary || '',
        depth: visited.get(id),
        isFocus: id === focusId
      }
    };
  }).filter(Boolean);

  const edges = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, i) => ({
      data: { id: `e${i}-${e.source}-${e.target}`, source: e.source, target: e.target, label: e.relation || '' }
    }));

  return { nodes, edges };
}

// 根据 type 上色 + 形状
function baseStylesheet(opts = {}) {
  const { showIcon = false, showEdgeLabel = false, fontSize = 11, nodeSize = 38 } = opts;
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'background-opacity': 0.92,
        'shape': 'data(shape)',
        'label': 'data(label)',
        'color': '#2d241f',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': nodeSize * 1.6,
        'font-size': fontSize,
        'font-family': 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif',
        'font-weight': 600,
        'width': nodeSize,
        'height': nodeSize,
        'border-width': 1,
        'border-color': 'rgba(46,32,18,0.18)',
        'border-opacity': 1,
        ...(showIcon
          ? {
              'background-image': 'data(icon)',
              'background-fit': 'cover',
              'background-image-opacity': 0.55
            }
          : {})
      }
    },
    {
      selector: 'node[?isFocus]',
      style: {
        'border-width': 3,
        'border-color': '#355e52',
        'background-opacity': 1
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#986333'
      }
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'width': 1.4,
        'line-color': 'rgba(102, 80, 56, 0.45)',
        'target-arrow-shape': 'none',
        'opacity': 0.75,
        ...(showEdgeLabel
          ? {
              'label': 'data(label)',
              'font-size': 10,
              'color': '#6d5b4d',
              'text-background-color': '#fffaf2',
              'text-background-opacity': 0.85,
              'text-background-padding': 2
            }
          : {})
      }
    }
  ];
}

// ---------- mini ----------

export function initGraphUI(api) {
  if (api.getGraphData) getGraphData = api.getGraphData;
  if (api.onNodeFocus) onNodeFocus = api.onNodeFocus;
  if (api.onNavigateMirror) onNavigateMirror = api.onNavigateMirror;

  // 折叠
  const dock = document.getElementById('mini-graph-dock');
  const toggleBtn = document.getElementById('mini-graph-toggle');
  if (toggleBtn && dock) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = dock.classList.toggle('collapsed');
      toggleBtn.textContent = collapsed ? '+' : '－';
    });
  }

  // 关闭全屏
  const closeBtn = document.getElementById('graph-fullscreen-close');
  if (closeBtn) closeBtn.addEventListener('click', closeFullGraph);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFullGraph();
  });
}

export function renderMiniGraph(focusConceptId) {
  if (!focusConceptId) return;
  currentMiniFocus = focusConceptId;
  const container = document.getElementById('mini-graph-canvas');
  if (!container) return;

  const { nodes, edges } = buildElements(focusConceptId, 1);
  if (!nodes.length) return;

  if (miniCy) {
    miniCy.destroy();
    miniCy = null;
  }

  miniCy = cytoscape({
    container,
    elements: [...nodes, ...edges],
    style: baseStylesheet({ showIcon: false, showEdgeLabel: false, fontSize: 10, nodeSize: 32 }),
    layout: {
      name: 'concentric',
      concentric: (n) => (n.data('isFocus') ? 2 : 1),
      levelWidth: () => 1,
      minNodeSpacing: 18,
      padding: 10,
      animate: false
    },
    autoungrabify: true,
    userPanningEnabled: false,
    userZoomingEnabled: false,
    boxSelectionEnabled: false
  });

  // 单击节点 → 反向高亮 3D + 详情
  miniCy.on('tap', 'node', (evt) => {
    const id = evt.target.id();
    if (id !== currentMiniFocus) {
      onNodeFocus(id);
    }
  });

  miniCy.fit(undefined, 16);
}

// ---------- 全屏 ----------

export function openFullGraph(focusConceptId, depth = 2) {
  if (!focusConceptId) return;
  currentFullFocus = focusConceptId;
  const layer = document.getElementById('graph-fullscreen');
  const sub = document.getElementById('graph-fullscreen-sub');
  if (!layer) return;

  const data = getGraphData();
  const focusConcept = data.concepts.find((c) => c.id === focusConceptId);
  if (sub) sub.textContent = `焦点：${focusConcept?.label || focusConceptId} · ${depth} 跳子图`;

  layer.hidden = false;
  // 阻断 3D canvas 事件
  const canvas = document.getElementById('scene');
  if (canvas) canvas.style.pointerEvents = 'none';

  hideDetailCard();

  const container = document.getElementById('full-graph-canvas');
  const { nodes, edges } = buildElements(focusConceptId, depth);
  if (fullCy) {
    fullCy.destroy();
    fullCy = null;
  }

  // 等待浮层布局完成再初始化
  requestAnimationFrame(() => {
    fullCy = cytoscape({
      container,
      elements: [...nodes, ...edges],
      style: baseStylesheet({ showIcon: true, showEdgeLabel: true, fontSize: 13, nodeSize: 64 }),
      layout: {
        name: 'concentric',
        concentric: (n) => -n.data('depth'),
        levelWidth: () => 1,
        minNodeSpacing: 36,
        padding: 30,
        animate: true,
        animationDuration: 280
      },
      wheelSensitivity: 0.25,
      minZoom: 0.4,
      maxZoom: 2.4,
      boxSelectionEnabled: false
    });

    fullCy.on('tap', 'node', (evt) => {
      showDetailCard(evt.target.id());
    });
    fullCy.on('tap', (evt) => {
      if (evt.target === fullCy) hideDetailCard();
    });

    fullCy.fit(undefined, 40);
  });
}

function closeFullGraph() {
  const layer = document.getElementById('graph-fullscreen');
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  hideDetailCard();
  const canvas = document.getElementById('scene');
  if (canvas) canvas.style.pointerEvents = '';
  if (fullCy) {
    fullCy.destroy();
    fullCy = null;
  }
}

function showDetailCard(conceptId) {
  const data = getGraphData();
  const c = data.concepts.find((x) => x.id === conceptId);
  if (!c) return;
  const t = data.types[c.type] || {};
  const meta = document.getElementById('graph-detail-meta');
  const title = document.getElementById('graph-detail-title');
  const summary = document.getElementById('graph-detail-summary');
  const actions = document.getElementById('graph-detail-actions');
  const card = document.getElementById('graph-detail-card');
  if (!card) return;

  meta.textContent = t.label || c.type;
  title.textContent = c.label;
  summary.textContent = c.detail || c.summary || '';

  actions.innerHTML = '';
  // 设为焦点（在 3D 上联动）
  const focusBtn = document.createElement('button');
  focusBtn.className = 'graph-detail-btn';
  focusBtn.textContent = '在 3D 中查看';
  focusBtn.addEventListener('click', () => {
    onNodeFocus(c.id);
    closeFullGraph();
  });
  actions.appendChild(focusBtn);

  // 相关铜镜
  (c.relatedMirrors || []).forEach((mid) => {
    const btn = document.createElement('button');
    btn.className = 'graph-detail-btn primary';
    btn.textContent = `查看 ${mid}`;
    btn.addEventListener('click', () => onNavigateMirror(mid));
    actions.appendChild(btn);
  });

  card.classList.add('show');
}

function hideDetailCard() {
  const card = document.getElementById('graph-detail-card');
  if (card) card.classList.remove('show');
}
