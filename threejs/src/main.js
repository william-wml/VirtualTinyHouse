import './style.css';
import { positionStudioUpright } from './utils/studioPositioning.js';
import { VtHViewer } from './viewer.js';
import { loadModel } from './modelLoader.js';
import { ComponentExplorer, CATEGORIES } from './componentExplorer.js';
import { describeComponent } from './componentDescriptions.js';

// Public-facing VtH model explorer. The GLB and its geometry are unchanged.
// Replace public/models/VtH.glb to update the model without editing JavaScript.
const $ = id => document.getElementById(id);
const viewer = new VtHViewer($('viewer'), onPick);
const displayLabels = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
let explorer = null;
let visibleIds = new Set(CATEGORIES.map(c => c.id));
// Present concise descriptions instead of internal Blender object identifiers.
function setSelectedPart(object, entry) {
  const part = describeComponent(object, entry);
  $('selection-name').textContent = part?.title || 'Select a component';
  $('selection-category').textContent = entry
    ? (displayLabels[entry.id] || 'VtH component')
    : 'Click a visible part of the model to explore it.';
  $('selection-description').textContent = part?.description
    || 'Choose a part to learn about its place in the structure.';
  $('selection-description').hidden = false;
}


function setStatus(message, kind = '') {
  const element = $('status');
  element.textContent = message;
  element.dataset.kind = kind;
}
function onPick(object) {
  const entry = object && explorer ? explorer.get(object) : null;
  setSelectedPart(object, entry);
  $('focus-btn').disabled = !entry;
  $('clear-btn').disabled = !entry;
}
function updateVisibility() {
  if (!explorer) return;
  explorer.setVisible(visibleIds);
  if (viewer.hovered && !viewer.isVisibleInHierarchy(viewer.hovered)) viewer.clearHover();
  // Check ancestor visibility as well as mesh visibility.
  if (viewer.selection) {
    let current = viewer.selection;
    while (current) {
      if (!current.visible) { viewer.clearSelection(); break; }
      current = current.parent;
    }
  }
  renderCategories();
}
function renderCategories() {
  const list = $('component-list');
  list.replaceChildren();
  if (!explorer) return;
  for (const { id, count } of explorer.getCounts()) {
    if (count === 0) continue;
    const label = document.createElement('label');
    label.className = 'component-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = visibleIds.has(id);
    input.setAttribute('aria-label', `Show ${displayLabels[id] || id}`);
    input.addEventListener('change', () => {
      if (input.checked) visibleIds.add(id);
      else visibleIds.delete(id);
      updateVisibility();
    });
    const title = document.createElement('span');
    title.className = 'component-title';
    title.textContent = displayLabels[id] || id;
    label.append(input, title);
    list.append(label);
  }
}
// Loading treatment: show real transfer progress, then wait for parsing
// and the first rendered frame before removing the overlay.
let modelLoadInProgress = false;
// A transitionend event is not guaranteed (e.g., reduced-motion settings).
// Keep both a timeout fallback and removable listener for reliable cleanup.
let loadingHideTimer = null;
let loadingTransitionCleanup = null;
function cancelLoadingDismissal() {
  if (loadingHideTimer !== null) {
    clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
  }
  loadingTransitionCleanup?.();
  loadingTransitionCleanup = null;
}
function dismissLoadingAfterPaint() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    loadingLayer.classList.add('is-complete');
    const finish = () => {
      cancelLoadingDismissal();
      if (loadingLayer.classList.contains('is-complete')) {
        loadingLayer.hidden = true;
      }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const onTransitionEnd = event => {
      if (event.target === loadingLayer && event.propertyName === 'opacity') finish();
    };
    loadingLayer.addEventListener('transitionend', onTransitionEnd);
    loadingTransitionCleanup = () => loadingLayer.removeEventListener('transitionend', onTransitionEnd);
    // Also covers a disabled transition or a browser that skips its event.
    loadingHideTimer = setTimeout(finish, 650);
  }));
}

const loadingLayer = $('model-loading');
const loadingTitle = $('loading-title');
const loadingMessage = $('loading-message');
const loadingTrack = $('loading-track');
const loadingFill = $('loading-fill');
const loadingPercent = $('loading-percent');
const loadingRetry = $('loading-retry');

function updateLoading(percent) {
  if (percent == null) {
    loadingTrack.removeAttribute('aria-valuenow');
    loadingTrack.classList.add('indeterminate');
    loadingPercent.textContent = 'Loading model…';
    return;
  }
  const value = Math.max(0, Math.min(100, percent));
  loadingTrack.classList.remove('indeterminate');
  loadingTrack.setAttribute('aria-valuenow', String(value));
  loadingFill.style.width = `${value}%`;
  loadingPercent.textContent = `${value}%`;
  if (value >= 100) {
    loadingMessage.textContent = 'Preparing the interactive view…';
    loadingPercent.textContent = 'Almost ready';
    loadingTrack.removeAttribute('aria-valuenow');
    loadingTrack.classList.add('indeterminate');
  }
}

async function loadStudio() {
  if (modelLoadInProgress) return;
  modelLoadInProgress = true;
  cancelLoadingDismissal();
  loadingLayer.hidden = false;
  document.querySelector('.viewport').setAttribute('aria-busy', 'true');
  loadingLayer.classList.remove('is-complete', 'has-error');
  loadingRetry.hidden = true;
  loadingTitle.textContent = 'Preparing your view';
  loadingMessage.textContent = 'Loading the interactive model…';
  loadingFill.style.width = '0%';
  loadingPercent.textContent = 'Starting…';
  loadingTrack.classList.remove('indeterminate');
  loadingTrack.setAttribute('aria-valuenow', '0');
  setStatus('Loading VtH…');
  const startedAt = performance.now();
  try {
    const url = `${import.meta.env.BASE_URL}models/VtH.glb`;
    const model = await loadModel(url, updateLoading);
    loadingMessage.textContent = 'Preparing the interactive view…';
    loadingPercent.textContent = 'Almost ready';
    loadingTrack.removeAttribute('aria-valuenow');
    loadingTrack.classList.add('indeterminate');
    const root = positionStudioUpright(model, {
      rotationX: -Math.PI / 2,
      groundClearance: 0.02,
      centerHorizontally: true,
    });
    viewer.setModel(root);
    explorer = new ComponentExplorer(root);
    visibleIds = new Set(CATEGORIES.map(c => c.id));
    updateVisibility();
    setStatus('Explore freely', 'ready');
    document.querySelector('.viewport').setAttribute('aria-busy', 'false');
    console.info(`VtH ready in ${((performance.now() - startedAt) / 1000).toFixed(2)} s`);
    // Wait for the first painted model frame. Handle reduced-motion and
    // missing transition events without leaving an invisible overlay.
    dismissLoadingAfterPaint();
  } catch (error) {
    console.error('Unable to load the VtH model:', error);
    setStatus('Model unavailable', 'error');
    loadingLayer.classList.add('has-error');
    loadingTitle.textContent = 'The model could not be loaded';
    loadingMessage.textContent = 'Please check your connection and try again.';
    loadingTrack.classList.remove('indeterminate');
    loadingTrack.removeAttribute('aria-valuenow');
    loadingPercent.textContent = '';
    loadingRetry.hidden = false;
    document.querySelector('.viewport').setAttribute('aria-busy', 'false');
    loadingRetry.focus();
  } finally {
    modelLoadInProgress = false;
  }
}
loadingRetry.addEventListener('click', () => { void loadStudio(); });

$('reset-btn').addEventListener('click', () => viewer.reset());
$('show-all-btn').addEventListener('click', () => {
  visibleIds = new Set(CATEGORIES.map(c => c.id));
  updateVisibility();
});
$('focus-btn').addEventListener('click', () => viewer.focusSelection());
$('clear-btn').addEventListener('click', () => viewer.clearSelection());
viewer.setGrid(false); // Public presentation: no technical floor grid
$('edges-toggle').addEventListener('change', event => viewer.setEdgesVisible(event.target.checked));
viewer.setEdgesVisible($('edges-toggle').checked);

loadStudio();
