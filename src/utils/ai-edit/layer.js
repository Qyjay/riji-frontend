const COLOR_TO_LAYER = {
  '#ff3b30': 'foreground',
  '#007aff': 'background',
  '#34c759': 'middle'
};

function normalizeColor(color) {
  return (color || '').toLowerCase();
}

class LayerManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.layers = {
      foreground: { visible: true, strokes: [] },
      middle: { visible: true, strokes: [] },
      background: { visible: true, strokes: [] }
    };
    this.links = [];
    this.activeLayer = 'foreground';
  }

  getLayerByColor(color) {
    const key = COLOR_TO_LAYER[normalizeColor(color)] || 'foreground';
    return key;
  }

  addStrokeByColor(stroke, color) {
    const layer = this.getLayerByColor(color);
    this.layers[layer].strokes.push(stroke);
    this.activeLayer = layer;
    return layer;
  }

  addLink(linkStroke, color) {
    const layer = this.getLayerByColor(color);
    const item = {
      id: `layer_link_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      layer,
      stroke: linkStroke
    };
    this.links.push(item);
    return item;
  }

  toggleVisibility(layer) {
    if (!this.layers[layer]) return;
    this.layers[layer].visible = !this.layers[layer].visible;
  }

  removeLayerStroke(layer, strokeId) {
    if (!this.layers[layer]) return;
    this.layers[layer].strokes = this.layers[layer].strokes.filter((item) => item.id !== strokeId);
  }

  exportState() {
    return {
      layers: JSON.parse(JSON.stringify(this.layers)),
      links: JSON.parse(JSON.stringify(this.links)),
      activeLayer: this.activeLayer
    };
  }

  importState(state) {
    if (!state) return;
    this.layers = state.layers || this.layers;
    this.links = state.links || [];
    this.activeLayer = state.activeLayer || 'foreground';
  }
}

export default LayerManager;
