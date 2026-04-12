function regionCenter(region) {
  if (!region || !region.box) return { x: 0, y: 0 };
  return {
    x: region.box.minX + region.box.width / 2,
    y: region.box.minY + region.box.height / 2
  };
}

function styleFromPrompt(prompt) {
  const lower = (prompt || '').toLowerCase();
  if (lower.includes('red') || lower.includes('hong')) return '#f44336';
  if (lower.includes('blue') || lower.includes('lan')) return '#1976d2';
  if (lower.includes('green') || lower.includes('lv')) return '#43a047';
  if (lower.includes('light')) return '#fff8b2';
  return '#ffb300';
}

function safeParseJSON(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    return {};
  }
}

function trimSlashRight(value = '') {
  return value.replace(/\/+$/, '');
}

function roundNum(value, digits = 3) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

function strokePromptFromIntent(intent = {}) {
  const type = intent.type || 'sketch';

  if (type === 'bend') {
    return [
      '[StrokeIntent] type=bend',
      '请将轨迹附近主体按弧线趋势做自然弯曲变形，弯曲强度中等偏柔和。',
      '仅编辑用户轨迹覆盖区域及其紧邻过渡带，框外保持不变。',
      '不要在结果图保留任何手绘轨迹或标记。'
    ].join(' ');
  }

  if (type === 'stretch') {
    const axis = intent.axis === 'y' ? '纵向' : '横向';
    return [
      '[StrokeIntent] type=stretch',
      `请沿${axis}对轨迹覆盖区域执行局部拉伸，保持主体结构连贯。`,
      '仅在轨迹影响范围内形变，避免新增物体与背景错位。',
      '不要在结果图保留任何手绘轨迹或标记。'
    ].join(' ');
  }

  if (type === 'arrow') {
    return [
      '[StrokeIntent] type=move',
      '箭头表示将箭头尾部对应元素移动到箭头尖部位置，并完成自然补洞与融合。',
      '保持主体尺度与材质一致，避免重影、拉丝和断裂边缘。',
      '结果图不要有箭头、线条或其他标注痕迹。'
    ].join(' ');
  }

  if (type === 'gradient-color') {
    const direction = intent.direction === 'right-to-left' ? '从右到左' : '从左到右';
    return [
      '[StrokeIntent] type=gradient-color',
      `请在轨迹覆盖区域建立${direction}的平滑颜色过渡，渐变自然且连续。`,
      '只调整颜色与明暗，不改变主体几何轮廓和材质纹理。',
      '不要在结果图保留任何手绘轨迹或标记。'
    ].join(' ');
  }

  return [
    `[StrokeIntent] type=${type}`,
    '请按用户轨迹意图执行局部编辑，保持整体语义、光照与透视一致。',
    '结果图不要保留任何手绘标记。'
  ].join(' ');
}

function symbolIntentPrompt(symbol = {}) {
  const type = String((symbol && symbol.type) || 'unknown').toLowerCase();
  const intentMap = {
    sun: '光影调节-太阳符号：提升对应区域亮度，增强受光面与柔和光照氛围，阴影保持自然。',
    moon: '光影调节-月亮符号：降低对应区域亮度，增加层次化阴影与暗部细节，避免整体发灰。',
    raindrop: '光影调节-雨滴符号：在对应区域加入轻微湿润反光与环境模糊效果，保持真实质感。',
    'circle-cross-delete': '细节优化-小圆圈加叉号：删除对应小元素（杂物、多余线条、瑕疵），并进行自然补全。',
    star: '细节优化-五角星：为对应元素添加高光与精致细节，美化但不过度锐化。',
    wave: '细节优化-波浪线：为对应元素添加运动模糊方向感（如奔跑人物、行驶车辆），保持主体可辨识。',
    'wave-line': '细节优化-波浪线：为对应元素添加运动模糊方向感（如奔跑人物、行驶车辆），保持主体可辨识。',
    'slash-texture': '风格调节-斜线纹理：将对应区域转为素描风格，保留结构轮廓与明暗层次。',
    'dot-texture': '风格调节-圆点纹理：将对应区域转为点阵风格，颗粒密度均匀且边缘过渡自然。',
    'curve-texture': '风格调节-曲线纹理：将对应区域转为水彩风格，色彩晕染自然、边界柔和。'
  };

  const mapped = intentMap[type] || `符号意图：${type}。请结合用户标记语义执行对应编辑。`;

  return [
    '[SymbolIntent]',
    mapped,
    '编辑范围仅限符号覆盖区域及必要过渡带。',
    '输出需与原图保持光照、透视、材质与风格一致。',
    '结果图不得保留手绘符号、线条或标记痕迹。'
  ].join(' ');
}

const AI_ENDPOINT_STORAGE_KEY = 'AIIMAGE_BACKEND_ENDPOINT';
const DEFAULT_AI_ENDPOINT = 'http://10.35.164.18:3001';

class AIEngine {
  constructor() {
    this.endpoint = DEFAULT_AI_ENDPOINT;
    this.modelName = 'seedream-placeholder';
    this.requestTimeout = 90000;
    this.uploadCache = new Map();
    this.initEndpointFromStorage();
  }

  setConfig(config = {}) {
    if (config.endpoint) {
      this.endpoint = trimSlashRight(config.endpoint);
      this.persistEndpoint();
    }
    this.modelName = config.modelName || this.modelName;
    this.requestTimeout = Number(config.requestTimeout || this.requestTimeout || 30000);
  }

  initEndpointFromStorage() {
    try {
      const stored = typeof uni !== 'undefined' && uni.getStorageSync ? uni.getStorageSync(AI_ENDPOINT_STORAGE_KEY) : '';
      if (stored && typeof stored === 'string') {
        this.endpoint = trimSlashRight(stored);
      }
    } catch (error) {
      this.endpoint = DEFAULT_AI_ENDPOINT;
    }
  }

  persistEndpoint() {
    try {
      if (typeof uni !== 'undefined' && uni.setStorageSync) {
        uni.setStorageSync(AI_ENDPOINT_STORAGE_KEY, this.endpoint);
      }
    } catch (error) {
      // ignore
    }
  }

  buildUrl(pathname) {
    return `${trimSlashRight(this.endpoint)}${pathname}`;
  }

  request({ method = 'GET', pathname = '', data = {}, header = {}, timeoutMs }) {
    return new Promise((resolve, reject) => {
      uni.request({
        url: this.buildUrl(pathname),
        method,
        data,
        header,
        timeout: Number(timeoutMs || this.requestTimeout || 90000),
        success: (response) => {
          const payload = safeParseJSON(response.data);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(payload);
            return;
          }
          reject(new Error(payload.message || `HTTP ${response.statusCode}`));
        },
        fail: (error) => {
          const errorText = String((error && error.errMsg) || (error && error.message) || '').toLowerCase();
          if (errorText.includes('timeout')) {
            reject(new Error('AI处理超时，请稍后重试'));
            return;
          }
          reject(error);
        }
      });
    });
  }

  uploadImage(filePath, type = 'original') {
    if (!filePath) {
      return Promise.reject(new Error('Missing image path for upload'));
    }

    if (/^https?:\/\//i.test(filePath) || /^data:image\//i.test(filePath)) {
      return Promise.resolve(String(filePath));
    }

    if (this.uploadCache.has(filePath)) {
      return Promise.resolve(this.uploadCache.get(filePath));
    }

    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: this.buildUrl('/api/upload'),
        filePath,
        name: 'image',
        timeout: this.requestTimeout,
        formData: { type },
        success: (response) => {
          const payload = safeParseJSON(response.data);
          if (response.statusCode >= 200 && response.statusCode < 300 && payload.success && payload.file) {
            this.uploadCache.set(filePath, payload.file.path);
            resolve(payload.file.path);
            return;
          }
          reject(new Error(payload.message || `Upload failed: HTTP ${response.statusCode}`));
        },
        fail: (error) => reject(error)
      });
    });
  }

  async ensureUploadedImageSet({ images = {}, primaryImageKey = 'A', includeSecondary = false, editedFilePath = '' }) {
    const primary = images[primaryImageKey] || null;
    if (!primary || !primary.path) {
      throw new Error('请先导入主图后再执行 AI 编辑');
    }

    const original = await this.uploadImage(primary.path, 'original');

    if (editedFilePath) {
      const edited = await this.uploadImage(editedFilePath, 'intermediate');
      return { original, edited };
    }

    if (!includeSecondary) {
      return { original, edited: original };
    }

    const secondaryKey = primaryImageKey === 'A' ? 'B' : 'A';
    const secondaryImage = images[secondaryKey] || null;
    if (!secondaryImage || !secondaryImage.path) {
      throw new Error('跨图操作需要先导入 A/B 两张图片');
    }
    const edited = await this.uploadImage(secondaryImage.path, 'intermediate');
    return { original, edited };
  }

  async executeEdit({ operationType, instruction, images, primaryImageKey, includeSecondary = false, editedFilePath = '', prompt = '' }) {
    const uploaded = await this.ensureUploadedImageSet({
      images,
      primaryImageKey,
      includeSecondary,
      editedFilePath
    });

    return this.request({
      method: 'POST',
      pathname: '/api/edit/execute',
      data: {
        operationType,
        instruction,
        images: {
          original: uploaded.original,
          edited: uploaded.edited
        },
        prompt
      },
      timeoutMs: Math.max(90000, Number(this.requestTimeout || 0))
    });
  }

  async deleteRegion({ region, imageKey, images, editedFilePath = '' }) {
    const response = await this.executeEdit({
      operationType: 'region-edit',
      instruction: 'delete',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt: ''
    });

    return {
      id: `op_delete_${Date.now()}`,
      kind: 'delete-region',
      imageKey,
      region,
      fill: '#f2f4f6',
      message: 'Region removed by backend model pipeline.',
      backend: response.result || null
    };
  }

  async addInRegion({ region, imageKey, prompt, images, editedFilePath = '' }) {
    const response = await this.executeEdit({
      operationType: 'region-edit',
      instruction: 'add',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt
    });
    const center = regionCenter(region);
    return {
      id: `op_add_${Date.now()}`,
      kind: 'add-region',
      imageKey,
      region,
      prompt,
      shape: 'blob',
      color: styleFromPrompt(prompt),
      center,
      message: 'Generated object by backend model pipeline.',
      backend: response.result || null
    };
  }

  async modifyRegion({ region, imageKey, prompt, images, editedFilePath = '' }) {
    const response = await this.executeEdit({
      operationType: 'region-edit',
      instruction: 'modify',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt
    });

    return {
      id: `op_modify_${Date.now()}`,
      kind: 'modify-region',
      imageKey,
      region,
      prompt,
      tint: styleFromPrompt(prompt),
      message: 'Applied localized edit by backend model pipeline.',
      backend: response.result || null
    };
  }

  async replaceAcrossImages({ sourceRegion, targetRegion, images, editedFilePathA = '', editedFilePathB = '', prompt = '' }) {
    const sourcePath = editedFilePathA || (images && images.A && images.A.path) || '';
    const targetPath = editedFilePathB || (images && images.B && images.B.path) || '';
    if (!sourcePath || !targetPath) {
      throw new Error('跨图替换需要A/B两张编辑图');
    }

    const editedA = await this.uploadImage(sourcePath, 'intermediate');
    const editedB = await this.uploadImage(targetPath, 'intermediate');
    const defaultPrompt = '输出需与第二张图保持光照、透视、材质与风格一致，结果图不得保留圈画线条或标记痕迹。';
    const userPrompt = String(prompt || '').trim().replace(/[。.!！?？\s]+$/g, '');
    const finalPrompt = userPrompt
      ? `${userPrompt}。${defaultPrompt}`
      : `将A图圈选元素替换到B图圈选区域。${defaultPrompt}`;

    const response = await this.request({
      method: 'POST',
      pathname: '/api/edit/execute',
      data: {
        operationType: 'cross-replace',
        instruction: 'replace',
        images: {
          editedA,
          editedB
        },
        prompt: finalPrompt
      },
      timeoutMs: Math.max(90000, Number(this.requestTimeout || 0))
    });

    return {
      id: `op_replace_${Date.now()}`,
      kind: 'replace-cross-image',
      imageKey: 'B',
      sourceRegion,
      targetRegion,
      fit: {
        scaleMode: 'contain',
        perspectiveBlend: 0.7,
        opacity: 0.9
      },
      message: 'Cross-image replace executed by backend model pipeline.',
      backend: response.result || null
    };
  }

  async fuseImages({ mode, opacityA, opacityB, images, editedFilePath = '', prompt = 'fuse the image' }) {
    if (!editedFilePath) {
      throw new Error('融合提交缺少input_edited图像');
    }

    const edited = await this.uploadImage(editedFilePath, 'intermediate');
    const finalPrompt = String(prompt || '').trim() || 'fuse the image';

    const response = await this.request({
      method: 'POST',
      pathname: '/api/edit/execute',
      data: {
        operationType: 'fusion-edit',
        instruction: 'fusion',
        images: {
          edited
        },
        prompt: finalPrompt
      },
      timeoutMs: Math.max(90000, Number(this.requestTimeout || 0))
    });

    return {
      id: `op_fuse_${Date.now()}`,
      kind: 'fuse-images',
      mode,
      opacityA,
      opacityB,
      message: 'Fusion params sent to backend model pipeline.',
      backend: response.result || null
    };
  }

  async strokeGuidedEdit({ intent, imageKey, images, editedFilePath = '' }) {
    const prompt = strokePromptFromIntent(intent);
    const response = await this.executeEdit({
      operationType: 'stroke-guided',
      instruction: 'stroke-guided',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt
    });

    return {
      id: `op_stroke_${Date.now()}`,
      kind: 'stroke-guided',
      imageKey,
      intent,
      message: 'Stroke-guided edit executed by backend model pipeline.',
      backend: response.result || null
    };
  }

  async sketchToImage({ sketchStroke, imageKey, incrementIndex, images, editedFilePath = '' }) {
    const sketchPrompt = [
      `[SketchIntent] 第${incrementIndex}次草图增量`,
      '用户在原图上用简笔线条表达目标语义（例如云朵、椅子、人物姿势等）。',
      '请先识别草图语义，再将其转化为真实、可见的图像内容并融合进原场景。',
      '保持与原图一致的光照方向、阴影强弱、透视关系、材质风格与清晰度。',
      '仅在草图覆盖区域及其必要过渡带编辑，不要保留任何手绘线条或标记痕迹。'
    ].join(' ');

    const response = await this.executeEdit({
      operationType: 'sketch-edit',
      instruction: 'sketch',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt: sketchPrompt
    });

    return {
      id: `op_sketch_${Date.now()}`,
      kind: 'sketch-increment',
      imageKey,
      sketchStroke,
      incrementIndex,
      message: 'Sketch increment executed by backend model pipeline.',
      backend: response.result || null
    };
  }

  async symbolEdit({ symbol, imageKey, images, editedFilePath = '' }) {
    const prompt = symbolIntentPrompt(symbol);
    const response = await this.executeEdit({
      operationType: 'symbol-edit',
      instruction: 'symbol',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt
    });

    return {
      id: `op_symbol_${Date.now()}`,
      kind: 'symbol-edit',
      imageKey,
      symbol,
      message: 'Symbol edit executed by backend model pipeline.',
      backend: response.result || null
    };
  }

  async perspectiveEdit({ perspectiveState, imageKey, images, editedFilePath = '' }) {
    const vp = perspectiveState && perspectiveState.vanishingPoint ? perspectiveState.vanishingPoint : null;
    const lineCount = Array.isArray(perspectiveState && perspectiveState.lines) ? perspectiveState.lines.length : 0;
    const hasCube = !!(perspectiveState && perspectiveState.cube && Array.isArray(perspectiveState.cube.points) && perspectiveState.cube.points.length);
    const perspectivePrompt = [
      '[PerspectiveIntent]',
      vp
        ? '已标注消失点，请以该消失点为主约束修正场景透视结构。'
        : '未显式标注消失点，请根据已绘制透视线推断主消失方向并修正结构。',
      `当前透视引导线数量：${lineCount}。请优先对齐这些透视线方向，统一建筑/道路/物体边缘的收敛关系。`,
      hasCube ? '存在立体框草图，请将对应区域按3D体块关系重建透视。' : '若无体块草图，请保持原有体块比例，仅修正透视错位。',
      '仅在标注区域及必要过渡带内修改，保持原图光照、材质与清晰度一致。',
      '结果图不得保留任何手绘透视线、消失点或草稿标记。'
    ].join(' ');

    const response = await this.executeEdit({
      operationType: 'stroke-guided',
      instruction: 'perspective',
      images,
      primaryImageKey: imageKey,
      editedFilePath,
      prompt: perspectivePrompt
    });

    return {
      id: `op_perspective_${Date.now()}`,
      kind: 'perspective-update',
      imageKey,
      perspectiveState,
      message: 'Perspective update sent to backend model pipeline.',
      backend: response.result || null
    };
  }
}

const aiEngine = new AIEngine();

export default aiEngine;
