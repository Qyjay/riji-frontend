<template>
	<view class="page-root" @touchmove="onRootTouchMove" @wheel="onWheelScroll">
		<CustomNavBar title="修图工坊" left-icon="back" />
		<view class="nav-placeholder" :style="{ height: navPlaceholderHeight + 'px' }" />

		<view class="manual-scroll-viewport" @wheel="onWheelScroll">
			<view class="manual-scroll-content" :style="{ transform: 'translateY(-' + manualScrollTop + 'px)' }">
				<view class="top-bar">
					<view class="top-actions">
						<button v-if="isDualImageMode" class="mini-btn" @click="importImage('A', ['album'])">导入A</button>
						<button v-if="isDualImageMode" class="mini-btn" @click="importImage('B', ['album'])">导入B</button>
						<button v-else class="mini-btn" @click="importImage('A', ['album'])">导入图片</button>
						<button class="mini-btn" @click="importImage(activeImage, ['camera'])">拍照</button>
						<button class="mini-btn" @click="exportImage">导出</button>
						<button class="mini-btn" @click="openTutorial">教程</button>
						<button class="mini-btn danger" @click="clearAll">清空</button>
					</view>
				</view>

		<view class="canvas-panel" :style="{ height: canvasPanelHeight + 'px' }">
			<view class="canvas-main">
				<image
					v-if="stageImageVisible"
					class="stage-image"
					:src="stageImageSrc"
					:style="stageImageStyle"
					mode="aspectFit"
					@error="onStageImageError"
				/>
				<canvas
					class="stage-canvas"
					:canvas-id="canvasId"
					:id="canvasId"
					:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
					:width="canvasWidth"
					:height="canvasHeight"
					@touchstart="onTouchStart"
					@touchmove="onTouchMove"
					@touchend="onTouchEnd"
					@mousedown="onMouseDown"
					@mousemove="onMouseMove"
					@mouseup="onMouseUp"
					@mouseleave="onMouseUp"
				/>
			</view>
			<view class="overlay-status">
				<text>当前图: {{ activeImage }}</text>
				<text>模式: {{ activeModeLabel }}</text>
				<text>提示: {{ hintText }}</text>
			</view>
		</view>

		<view class="bottom-bar">
			<scroll-view scroll-x class="mode-tabs">
				<view
					v-for="item in modes"
					:key="item.key"
					class="mode-pill"
					:class="{ active: activeMode === item.key }"
					@click="switchMode(item.key)"
				>
					{{ item.label }}
				</view>
			</scroll-view>

			<view class="action-row" v-if="activeMode === 'region'">
				<button class="mini-btn" @click="runRegionAction('delete')">删除</button>
				<button class="mini-btn" @click="runRegionAction('add')">添加</button>
				<button class="mini-btn" @click="runRegionAction('modify')">修改</button>
			</view>

			<view class="action-row" v-if="activeMode === 'replace'">
				<button class="mini-btn" @click="setActiveImage('A')">编辑A</button>
				<button class="mini-btn" @click="setActiveImage('B')">编辑B</button>
				<button class="mini-btn" @click="runCrossReplace">修改</button>
				<button class="mini-btn" @click="resetReplaceSelection">重置圈选</button>
				<text class="switch-label">正在编辑图片{{ activeImage }}</text>
				<text class="switch-label" v-if="replacePromptDraft">提示词: {{ replacePromptDraft }}</text>
			</view>

			<view class="action-row" v-if="activeMode === 'fusion'">
				<picker :range="blendModes" @change="onBlendChange">
					<view class="picker-text">融合模式: {{ fusion.mode }}</view>
				</picker>
				<button class="mini-btn primary" @click="runFusion">融合</button>
				<text class="switch-label">B透明度 {{ Math.round(fusion.opacityB * 100) }}%</text>
				<slider class="fusion-slider" :min="10" :max="100" :value="Math.round(fusion.opacityB * 100)" @change="onFusionOpacityChange" />
				<text class="switch-label">B缩放 {{ Math.round(fusion.overlayScale * 100) }}%</text>
				<slider class="fusion-slider" :min="40" :max="260" :value="Math.round(fusion.overlayScale * 100)" @change="onFusionScaleChange" />
			</view>

			<view class="action-row" v-if="activeMode === 'sketch'">
				<button class="mini-btn" @click="removeSketchEdit('last')">删除最近增量</button>
				<view class="sketch-chip" v-for="(item, index) in sketchEdits" :key="item.id" @click="removeSketchEdit(item.id)">
					删第{{ index + 1 }}次
				</view>
			</view>


			<view class="action-row" v-if="showStartCreation">
				<button class="mini-btn primary" :disabled="startCreationDisabled" @click="startCreation">
					{{ creatingByButton ? '创作中...' : (pendingCreationTask ? '开始创作' : '等待手绘/指令') }}
				</button>
			</view>

			<view class="brush-row">
				<text class="row-label">笔触 {{ brush.size }}px</text>
				<slider
					:min="1"
					:max="24"
					:value="brush.size"
					@changing="onBrushSizeChanging"
					@change="onBrushSizeChange"
				/>
				<button v-if="activeMode === 'stroke'" class="mini-btn" @click="brush.gradientEnabled = !brush.gradientEnabled">
					渐变轨迹 {{ brush.gradientEnabled ? '开' : '关' }}
				</button>
			</view>

			<view class="palette-row">
				<view
					v-for="color in palette"
					:key="color"
					class="color-dot"
					:style="{ backgroundColor: color, borderColor: brush.color === color ? '#111' : '#ddd' }"
					@click="setBrushColor(color)"
				/>
			</view>
		</view>
			</view>
			<view
				class="manual-scrollbar"
				@touchstart="onScrollbarTouchStart"
				@touchmove="onScrollbarTouchMove"
				@touchend="onScrollbarTouchEnd"
				@mousedown="onScrollbarMouseStart"
				@mousemove="onScrollbarMouseMove"
				@mouseup="onScrollbarMouseEnd"
				@mouseleave="onScrollbarMouseEnd"
			>
				<view class="manual-scrollbar-track"></view>
				<view class="manual-scrollbar-thumb" :style="{ height: thumbHeight + 'px', transform: 'translateY(' + thumbTop + 'px)' }"></view>
			</view>
			<canvas
				class="merge-canvas"
				:canvas-id="mergeCanvasId"
				:id="mergeCanvasId"
				:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
				:width="canvasWidth"
				:height="canvasHeight"
			/>

			<view v-if="showTutorialDialog" class="tutorial-mask" @click="closeTutorial">
				<view class="tutorial-card" @click.stop>
					<view class="tutorial-head">
						<text class="tutorial-title">{{ tutorialInfo.title }}</text>
						<button class="mini-btn" @click="closeTutorial">关闭</button>
					</view>
					<view class="tutorial-section">
						<text class="tutorial-label">具体功能</text>
						<text v-for="(item, idx) in tutorialInfo.what" :key="'w_' + idx" class="tutorial-line">{{ idx + 1 }}. {{ item }}</text>
					</view>
					<view class="tutorial-section">
						<text class="tutorial-label">操作方式</text>
						<text v-for="(item, idx) in tutorialInfo.how" :key="'h_' + idx" class="tutorial-line">{{ idx + 1 }}. {{ item }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavBar from '@/components/CustomNavBar.vue';
import {
	distance,
	detectSymbol,
	detectStrokeIntent,
	getTouchPoint,
	makeRegionFromPath,
	fitImageToCanvas
} from '@/utils/ai-edit/canvas.js';
import aiEngine from '@/utils/ai-edit/ai.js';
import { getImageInfo, importImageWithInfo, exportCanvasToImage, saveImageToAlbum } from '@/utils/ai-edit/image.js';

function deepClone(value) {
	return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

export default {
	components: {
		CustomNavBar
	},
	data() {
		return {
			canvasId: 'aiCanvas',
			mergeCanvasId: 'aiMergeCanvas',
			ctx: null,
			canvasWidth: 300,
			canvasHeight: 420,
			canvasPanelHeight: 500,
			canvasRect: { left: 0, top: 0, width: 0, height: 0 },
			statusBarHeight: 0,
			navPlaceholderHeight: 64,
			manualScrollTop: 0,
			manualScrollMax: 0,
			thumbHeight: 52,
			thumbTop: 0,
			scrollbarTrackTop: 0,
			scrollbarTrackHeight: 1,
			scrollbarDragging: false,
			activeMode: 'region',
			modes: [
				{ key: 'region', label: '圈选编辑' },
				{ key: 'replace', label: '跨图替换' },
				{ key: 'fusion', label: '双图融合' },
				{ key: 'stroke', label: '轨迹引导' },
				{ key: 'sketch', label: '草图增量' },
				{ key: 'symbol', label: '属性符号' },
				{ key: 'perspective', label: '透视3D' }
			],
			blendModes: ['source-over', 'multiply', 'overlay', 'screen'],
			palette: ['#000000', '#ff3b30', '#007aff', '#34c759', '#f7b500', '#ffffff'],
			brush: {
				size: 4,
				color: '#000000',
				gradientEnabled: false
			},
			images: {
				A: null,
				B: null
			},
			replaceImages: {
				A: null,
				B: null
			},
			fusionImages: {
				A: null,
				B: null
			},
			activeImage: 'A',
			regions: {
				A: [],
				B: []
			},
			replaceSelection: {
				source: null,
				target: null
			},
			replacePromptDraft: '',
			fusion: {
				mode: 'source-over',
				opacityA: 1,
				opacityB: 0.75,
				drawOpacityByStroke: true,
				overlayScale: 1,
				overlayBase: null
			},
			perspective: {
				vanishingPoint: null,
				lines: [],
				cube: null
			},
			operations: [],
			sketchEdits: [],
			draftSketchStrokes: { A: [], B: [] },
			draftSymbolStrokes: { A: [], B: [] },
			draftPerspectiveStrokes: { A: [], B: [] },
			previewStrokes: [],
			history: [],
			historyMax: 10,
			drawing: false,
			draggingImage: false,
			lastTouchPoint: null,
			currentStrokePoints: [],
			pendingCreationTask: null,
			creatingByButton: false,
			showTutorialDialog: false,
			hintText: '先导入图片，然后用手绘完成编辑。'
		};
	},
	computed: {
		isDualImageMode() {
			return this.activeMode === 'replace' || this.activeMode === 'fusion';
		},

		activeModeLabel() {
			const match = this.modes.find((item) => item.key === this.activeMode);
			return match ? match.label : this.activeMode;
		},
		stageImageVisible() {
			const active = this.getActiveStageImage();
			return !!(active && active.path && active.transform && this.activeMode !== 'fusion');
		},
		stageImageSrc() {
			const active = this.getActiveStageImage();
			return active && active.path ? active.path : '';
		},
		stageImageStyle() {
			if (!this.canvasWidth || !this.canvasHeight) {
				return { left: '0px', top: '0px', width: '0px', height: '0px' };
			}
			return {
				left: '0px',
				top: '0px',
				width: `${this.canvasWidth}px`,
				height: `${this.canvasHeight}px`
			};
		},
		showStartCreation() {
			return ['region', 'replace', 'stroke', 'sketch', 'symbol', 'perspective'].includes(this.activeMode);
		},
		startCreationDisabled() {
			return !this.pendingCreationTask || this.creatingByButton;
		},
		tutorialInfo() {
			switch (this.activeMode) {
				case 'region':
					return {
						title: '圈选编辑教程',
						what: ['圈选后可做删除、添加、修改三类局部编辑。', '只影响圈选区域及边缘过渡，不改其他区域。'],
						how: ['先闭合圈出目标区域。', '点删除/添加/修改并输入要求。', '点开始创作生成结果。']
					};
				case 'replace':
					return {
						title: '跨图替换教程',
						what: ['将A图圈选元素替换到B图目标区域。', '自动做尺寸与边缘融合。'],
						how: ['在A图圈选来源区域。', '切到B图圈选目标区域。', '点替换后再点开始创作。']
					};
				case 'stroke':
					return {
						title: '轨迹引导教程',
						what: ['弧线可引导弯曲，直线可引导拉伸，箭头可引导位移。', '开启渐变轨迹可引导局部颜色渐变。'],
						how: ['用一笔清晰轨迹表达意图。', '可调整笔粗和颜色。', '点开始创作执行轨迹编辑。']
					};
				case 'sketch':
					return {
						title: '草图增量教程',
						what: ['支持多笔草图联合表达语义。', 'AI会识别草图并融合到原图，保持光影透视一致。'],
						how: ['连续画多笔草图，不会自动清除前一笔。', '确认草图后点开始创作。', '不满意可继续增量再创作。']
					};
				case 'symbol':
					return {
						title: '属性符号教程',
						what: ['太阳/月亮/星星/圈叉等符号可触发光影或细节属性编辑。', '支持多笔符号联合识别后统一执行。'],
						how: ['画出符号轨迹，必要时可补几笔加强语义。', '确认后点开始创作联合识别。', '结果图会自动去除手绘标记。']
					};
				case 'perspective':
					return {
						title: '透视编辑教程',
						what: ['可通过透视线或消失点引导结构关系。', '常用于建筑线条、道路和空间深度调整。'],
						how: ['先画关键透视线或消失点。', '必要时补充辅助线。', '点开始创作完成透视调整。']
					};
				case 'fusion':
					return {
						title: '融合教程',
						what: ['A/B 图层按模式叠加融合。', '可通过笔触控制透明度。'],
						how: ['切换融合模式并选择活动图层。', '拖拽或绘制调整透明度。', '导出当前融合结果。']
					};
				default:
					return {
						title: '模式教程',
						what: ['当前模式支持手绘引导与局部编辑。'],
						how: ['先导入图片并切换模式。', '画出意图后点开始创作。']
					};
			}
		}
	},
	onReady() {
		this.initCanvas();
		this.$nextTick(() => {
			this.refreshManualScrollMetrics();
			this.refreshCanvasMetrics();
		});
		setTimeout(() => {
			this.refreshCanvasMetrics();
			this.refreshManualScrollMetrics();
		}, 80);
		setTimeout(() => {
			this.refreshCanvasMetrics();
			this.refreshManualScrollMetrics();
		}, 220);
	},
	onShow() {
		this.refreshCanvasMetrics();
		this.$nextTick(() => {
			this.refreshManualScrollMetrics();
		});
	},
	methods: {
		getImagesByMode(mode = this.activeMode) {
			if (mode === 'replace') return this.replaceImages;
			if (mode === 'fusion') return this.fusionImages;
			return this.images;
		},

		getActiveStageImage() {
			const store = this.getImagesByMode(this.activeMode);
			return store ? store[this.activeImage] : null;
		},

		safeConsumeEvent(event) {
			if (!event) return;
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
		},

		initCanvas() {
			aiEngine.setConfig({ endpoint: 'http://10.35.164.18:3001' });
			const info = uni.getSystemInfoSync();
			this.statusBarHeight = info.statusBarHeight || 0;
			this.navPlaceholderHeight = this.statusBarHeight + 44;
			this.canvasWidth = Math.floor(info.windowWidth - 44);
			const viewportHeight = Math.floor(Number(info.windowHeight || 720));
			const preferredPanelHeight = Math.floor(viewportHeight * 0.62);
			const maxAllowedPanelHeight = Math.max(300, Math.floor(viewportHeight - 340));
			this.canvasPanelHeight = clamp(preferredPanelHeight, 300, maxAllowedPanelHeight);
			this.canvasHeight = Math.floor(this.canvasPanelHeight - 56);

			this.ctx = uni.createCanvasContext(this.canvasId, this);
			this.refreshCanvasMetrics().then(() => {
				this.redraw();
			});
		},

		refreshCanvasMetrics() {
			return new Promise((resolve) => {
				const info = uni.getSystemInfoSync();
				const fallbackWidth = Math.max(260, Math.floor((info.windowWidth || this.canvasWidth) - 44));
				const fallbackHeight = Math.max(260, Math.floor(this.canvasPanelHeight - 72));

				uni.createSelectorQuery()
					.in(this)
					.select('.canvas-main')
					.boundingClientRect()
					.select('.canvas-panel')
					.boundingClientRect()
					.select('.overlay-status')
					.boundingClientRect()
					.exec((res) => {
						const mainRect = (res && res[0]) || null;
						const panelRect = (res && res[1]) || null;
						const statusRect = (res && res[2]) || null;

						let nextWidth = Math.floor((mainRect && mainRect.width) || 0);
						let nextHeight = Math.floor((mainRect && mainRect.height) || 0);

						if (nextWidth <= 0 || nextHeight <= 0) {
							const panelWidth = Math.floor((panelRect && panelRect.width) || 0);
							const panelHeight = Math.floor((panelRect && panelRect.height) || 0);
							const statusHeight = Math.floor((statusRect && statusRect.height) || 0);
							if (panelWidth > 0) {
								nextWidth = Math.max(240, panelWidth - 24);
							}
							if (panelHeight > 0) {
								nextHeight = Math.max(240, panelHeight - statusHeight - 24);
							}
						}

						if (nextWidth <= 0) nextWidth = fallbackWidth;
						if (nextHeight <= 0) nextHeight = fallbackHeight;

						this.canvasRect = {
							left: (mainRect && mainRect.left) || (panelRect && panelRect.left) || 0,
							top: (mainRect && mainRect.top) || (panelRect && panelRect.top) || 0,
							width: nextWidth,
							height: nextHeight
						};

						const changed = nextWidth !== this.canvasWidth || nextHeight !== this.canvasHeight;
						this.canvasWidth = nextWidth;
						this.canvasHeight = nextHeight;

						if (changed) {
							[this.images, this.replaceImages, this.fusionImages].forEach((store) => {
								['A', 'B'].forEach((key) => {
									const image = store[key];
									if (image && image.info) {
										image.transform = fitImageToCanvas(image.info, this.canvasWidth, this.canvasHeight);
									}
								});
							});
						}

						this.redraw();
						resolve({ width: this.canvasWidth, height: this.canvasHeight });
					});
			});
		},

		refreshManualScrollMetrics() {
			uni.createSelectorQuery()
				.in(this)
				.select('.manual-scroll-viewport')
				.boundingClientRect()
				.select('.manual-scroll-content')
				.boundingClientRect()
				.select('.manual-scrollbar')
				.boundingClientRect((barRect) => {
					if (barRect) {
						this.scrollbarTrackTop = barRect.top || 0;
						this.scrollbarTrackHeight = Math.max(1, Math.floor(barRect.height || 1));
					}
				})
				.exec((res) => {
					const viewportRect = res && res[0] ? res[0] : null;
					const contentRect = res && res[1] ? res[1] : null;
					if (!viewportRect || !contentRect) return;

					const viewportHeight = Math.max(1, Math.floor(viewportRect.height || 1));
					const contentHeight = Math.max(1, Math.floor(contentRect.height || 1));
					this.manualScrollMax = Math.max(0, contentHeight - viewportHeight);
					this.manualScrollTop = clamp(this.manualScrollTop, 0, this.manualScrollMax);

					const track = this.scrollbarTrackHeight;
					const ratio = clamp(viewportHeight / contentHeight, 0.08, 1);
					this.thumbHeight = clamp(Math.floor(track * ratio), 52, track);
					this.syncThumbTop();
				});
		},

		syncThumbTop() {
			const movable = Math.max(1, this.scrollbarTrackHeight - this.thumbHeight);
			if (this.manualScrollMax <= 0) {
				this.thumbTop = 0;
				return;
			}
			this.thumbTop = Math.floor((this.manualScrollTop / this.manualScrollMax) * movable);
		},

		onScrollbarTouchStart(event) {
			this.safeConsumeEvent(event);
			this.scrollbarDragging = true;
			this.applyManualScrollFromTouch(event);
		},

		onScrollbarTouchMove(event) {
			this.safeConsumeEvent(event);
			if (!this.scrollbarDragging) return;
			this.applyManualScrollFromTouch(event);
		},

		onScrollbarTouchEnd(event) {
			this.safeConsumeEvent(event);
			this.scrollbarDragging = false;
		},

		onScrollbarMouseStart(event) {
			if (typeof event.button === 'number' && event.button !== 0) return;
			this.safeConsumeEvent(event);
			this.scrollbarDragging = true;
			this.applyManualScrollFromTouch(event);
		},

		onScrollbarMouseMove(event) {
			if (!this.scrollbarDragging) return;
			this.safeConsumeEvent(event);
			this.applyManualScrollFromTouch(event);
		},

		onScrollbarMouseEnd(event) {
			if (!this.scrollbarDragging) return;
			this.safeConsumeEvent(event);
			this.scrollbarDragging = false;
		},

		applyManualScrollFromTouch(event) {
			const touch = (event.changedTouches && event.changedTouches[0]) || (event.touches && event.touches[0]) || event.detail || event || {};
			const clientY =
				typeof touch.clientY === 'number'
					? touch.clientY
					: typeof touch.pageY === 'number'
						? touch.pageY
						: typeof touch.y === 'number'
							? touch.y
							: this.scrollbarTrackTop;
			const trackY = clamp(clientY - this.scrollbarTrackTop - this.thumbHeight / 2, 0, Math.max(0, this.scrollbarTrackHeight - this.thumbHeight));
			this.thumbTop = trackY;
			if (this.manualScrollMax <= 0) {
				this.manualScrollTop = 0;
				return;
			}
			const ratio = trackY / Math.max(1, this.scrollbarTrackHeight - this.thumbHeight);
			this.manualScrollTop = Math.floor(ratio * this.manualScrollMax);
		},

		getCanvasTouchPoint(event) {
			if (event && event.detail && typeof event.detail.x === 'number' && typeof event.detail.y === 'number') {
				return {
					x: clamp(event.detail.x, 0, this.canvasRect.width || this.canvasWidth),
					y: clamp(event.detail.y, 0, this.canvasRect.height || this.canvasHeight),
					t: Date.now()
				};
			}
			if (event && typeof event.x === 'number' && typeof event.y === 'number') {
				return {
					x: clamp(event.x, 0, this.canvasRect.width || this.canvasWidth),
					y: clamp(event.y, 0, this.canvasRect.height || this.canvasHeight),
					t: Date.now()
				};
			}
			if (event && (typeof event.clientX === 'number' || typeof event.pageX === 'number')) {
				const pageX = typeof event.pageX === 'number' ? event.pageX : event.clientX;
				const pageY = typeof event.pageY === 'number' ? event.pageY : event.clientY;
				return {
					x: clamp(pageX - this.canvasRect.left, 0, this.canvasRect.width || this.canvasWidth),
					y: clamp(pageY - (this.canvasRect.top - this.manualScrollTop), 0, this.canvasRect.height || this.canvasHeight),
					t: Date.now()
				};
			}
			return getTouchPoint(event, {
				left: this.canvasRect.left,
				top: this.canvasRect.top - this.manualScrollTop,
				width: this.canvasRect.width,
				height: this.canvasRect.height
			});
		},

		onRootTouchMove(event) {
			this.safeConsumeEvent(event);
			return false;
		},

		onWheelScroll(event) {
			if (this.manualScrollMax <= 0) return;
			this.safeConsumeEvent(event);
			const deltaRaw =
				typeof event.deltaY === 'number'
					? event.deltaY
					: typeof event.wheelDelta === 'number'
						? -event.wheelDelta
						: (event.detail && typeof event.detail.deltaY === 'number')
							? event.detail.deltaY
							: 0;
			if (!deltaRaw) return;

			const next = clamp(this.manualScrollTop + deltaRaw, 0, this.manualScrollMax);
			if (next === this.manualScrollTop) return;
			this.manualScrollTop = next;
			this.syncThumbTop();
		},

		goBack() {
			uni.navigateBack({
				fail: () => {
					uni.showToast({ title: '已在首页', icon: 'none' });
				}
			});
		},

		setActiveImage(key) {
			if (key !== 'A' && key !== 'B') return;
			if (this.activeMode === 'replace') {
				const store = this.getImagesByMode('replace');
				if (!store[key] || !store[key].path) {
					uni.showToast({ title: `未导入${key}`, icon: 'none' });
					return;
				}
			}
			this.activeImage = key;
			this.redraw();
		},

		openTutorial() {
			this.showTutorialDialog = true;
		},

		closeTutorial() {
			this.showTutorialDialog = false;
		},

		switchMode(mode) {
			this.activeMode = mode;
			if (mode !== 'stroke') {
				this.brush.gradientEnabled = false;
			}
			if (mode === 'fusion') {
				this.activeImage = this.fusionImages.B ? 'B' : 'A';
			} else if (mode === 'replace') {
				this.activeImage = this.replaceImages.B ? 'B' : 'A';
			} else {
				this.activeImage = 'A';
			}
			this.pendingCreationTask = null;
			this.restoreHintByMode(mode);
			this.redraw();
			this.$nextTick(() => {
				this.refreshManualScrollMetrics();
			});
		},

		restoreHintByMode(mode = this.activeMode) {
			if (mode === 'fusion') {
				this.hintText = 'A为固定背景，B可拖拽缩放；点击“融合”提交。';
			} else if (mode === 'stroke') {
				this.hintText = '弧线=弯曲 直线=拉伸 箭头=移动 渐变笔触=颜色渐变。';
			} else if (mode === 'symbol') {
				this.hintText = '太阳=变亮 月亮=变暗 星星=高光 圈叉=删除。';
			} else {
				this.hintText = '手绘后可点击开始创作触发AI。';
			}
		},

		queueCreationTask(label, runner) {
			this.pendingCreationTask = {
				id: `create_${Date.now()}`,
				label,
				runner
			};
			this.hintText = `已准备：${label}，点击“开始创作”发送请求。`;
		},

		async startCreation() {
			if (!this.pendingCreationTask || this.creatingByButton) return;
			const task = this.pendingCreationTask;
			this.pendingCreationTask = null;
			this.creatingByButton = true;
			try {
				await task.runner();
			} finally {
				this.creatingByButton = false;
			}
		},

		async importImage(slot, sourceType) {
			let loadingShown = false;
			try {
				const imageStore = this.getImagesByMode(this.activeMode);
				const image = await importImageWithInfo(sourceType);
				uni.showLoading({ title: '加载中' });
				loadingShown = true;
				await this.refreshCanvasMetrics();
				let fit = fitImageToCanvas(image.info, this.canvasWidth, this.canvasHeight);
				if (this.activeMode === 'fusion' && slot === 'B') {
					try {
						fit = this.makeFusionOverlayTransform(image.info, 1 / 3);
					} catch (error) {
						fit = fitImageToCanvas(image.info, this.canvasWidth, this.canvasHeight);
					}
					this.fusion.overlayBase = {
						width: fit.width,
						height: fit.height
					};
					this.fusion.overlayScale = 1;
				}
				this.saveHistory();
				this.operations = this.operations.filter((op) => op.imageKey && op.imageKey !== slot);
				this.operations = this.operations.filter((op) => op.imageKey === 'A' || op.imageKey === 'B');
				this.regions[slot] = [];
				imageStore[slot] = {
					path: image.path,
					info: image.info,
					transform: fit
				};
				this.activeImage = slot;
				if (this.activeMode === 'fusion' && imageStore.B) this.activeImage = 'B';
				this.redraw();
				this.$nextTick(() => {
					this.redraw();
				});
				setTimeout(() => {
					this.refreshCanvasMetrics();
				}, 60);
				setTimeout(() => {
					this.refreshCanvasMetrics();
				}, 180);
			} catch (error) {
				const errText = String((error && error.errMsg) || (error && error.message) || '').toLowerCase();
				if (errText.includes('cancel')) {
					return;
				}
				const rawReason = String((error && error.errMsg) || (error && error.message) || '').trim();
				const reason = rawReason || '未知错误';
				this.showImportErrorDialog(reason);
			} finally {
				if (loadingShown) {
					uni.hideLoading();
				}
			}
		},

		showImportErrorDialog(reason) {
			const message = `导入失败\n${String(reason || '未知错误')}`;
			uni.showModal({
				title: '导入错误详情',
				content: message,
				confirmText: '复制错误',
				cancelText: '关闭',
				success: (res) => {
					if (!res.confirm) return;
					if (typeof uni.setClipboardData !== 'function') {
						uni.showToast({ title: '当前环境不支持复制', icon: 'none' });
						return;
					}
					uni.setClipboardData({
						data: message,
						success: () => {
							uni.showToast({ title: '错误信息已复制', icon: 'none' });
						},
						fail: () => {
							uni.showToast({ title: '复制失败', icon: 'none' });
						}
					});
				}
			});
		},

		onStageImageError() {
			const key = this.activeImage;
			this.clearUserNotesForImage(key);
			uni.showToast({ title: '图片层加载失败，已清理圈画笔记', icon: 'none' });
			this.redraw();
		},

		onTouchStart(event) {
			this.safeConsumeEvent(event);
			if (!this.ctx) return;
			const point = this.getCanvasTouchPoint(event);
			this.lastTouchPoint = point;

			if (this.activeMode === 'fusion') {
				const bImage = this.fusionImages.B;
				this.draggingImage = !!(bImage && bImage.transform && this.isPointInTransform(point, bImage.transform));
				return;
			}

			this.drawing = true;
			this.currentStrokePoints = [point];
		},

		onTouchMove(event) {
			this.safeConsumeEvent(event);
			const point = this.getCanvasTouchPoint(event);
			if (this.activeMode === 'fusion' && this.draggingImage) {
				this.dragImage(point);
				this.lastTouchPoint = point;
				return;
			}

			if (!this.drawing) return;
			const prev = this.currentStrokePoints[this.currentStrokePoints.length - 1];
			if (!prev || distance(prev, point) >= 2) {
				this.currentStrokePoints.push(point);
				this.previewCurrentStroke();
			}
		},

		onTouchEnd(event) {
			this.safeConsumeEvent(event);
			if (this.activeMode === 'fusion' && this.draggingImage) {
				this.draggingImage = false;
				this.saveHistory();
				return;
			}

			if (!this.drawing || this.currentStrokePoints.length < 2) {
				this.drawing = false;
				this.currentStrokePoints = [];
				return;
			}

			const stroke = {
				id: `stroke_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
				points: this.currentStrokePoints.slice(),
				color: this.brush.color,
				size: this.brush.size,
				gradientEnabled: this.brush.gradientEnabled,
				mode: this.activeMode,
				imageKey: this.activeImage
			};

			this.drawing = false;
			this.currentStrokePoints = [];
			this.applyStroke(stroke);
		},

		onMouseDown(event) {
			if (typeof event.button === 'number' && event.button !== 0) return;
			this.onTouchStart(event);
		},

		onMouseMove(event) {
			if (!this.drawing && !(this.activeMode === 'fusion' && this.draggingImage)) return;
			this.onTouchMove(event);
		},

		onMouseUp(event) {
			if (!this.drawing && !(this.activeMode === 'fusion' && this.draggingImage)) return;
			this.onTouchEnd(event);
		},

		async applyStroke(stroke) {
			const symbol = detectSymbol(stroke.points);

			if (this.activeMode === 'region') {
				this.handleRegionStroke(stroke);
				return;
			}

			if (this.activeMode === 'replace') {
				this.handleReplaceStroke(stroke);
				return;
			}

			if (this.activeMode === 'fusion') {
				this.handleFusionStroke(stroke);
				return;
			}

			if (this.activeMode === 'stroke') {
				this.queueCreationTask('轨迹引导创作', async () => {
					await this.handleStrokeGuided(stroke);
				});
				return;
			}

			if (this.activeMode === 'sketch') {
				this.appendDraftSketchStroke(stroke);
				this.prepareSketchCreationTask(this.activeImage);
				return;
			}

			if (this.activeMode === 'symbol') {
				this.appendDraftSymbolStroke(stroke, symbol);
				this.prepareSymbolCreationTask(this.activeImage);
				return;
			}

			if (this.activeMode === 'perspective') {
				this.appendDraftPerspectiveStroke(stroke, symbol);
				this.preparePerspectiveCreationTask(this.activeImage);
				return;
			}
		},

		appendDraftSketchStroke(stroke) {
			const key = this.activeImage === 'B' ? 'B' : 'A';
			const list = Array.isArray(this.draftSketchStrokes[key]) ? this.draftSketchStrokes[key].slice() : [];
			list.push({
				id: stroke.id,
				points: stroke.points.slice(),
				color: stroke.color,
				size: stroke.size,
				imageKey: key
			});
			this.draftSketchStrokes[key] = list;
			this.hintText = `已记录草图轨迹 ${list.length} 笔，点击开始创作提交。`;
			this.redraw();
		},

		prepareSketchCreationTask(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const count = (this.draftSketchStrokes[key] || []).length;
			if (!count) return;
			this.queueCreationTask(`草图增量创作（${count}笔）`, async () => {
				await this.handleSketchBatch(key);
			});
		},

		async handleSketchBatch(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const drafts = this.draftSketchStrokes[key] || [];
			if (!drafts.length) {
				uni.showToast({ title: '请先绘制草图轨迹', icon: 'none' });
				return;
			}

			const mergedPoints = drafts.reduce((acc, item) => acc.concat(item.points || []), []);
			const mergedStroke = {
				id: `draft_sketch_${Date.now()}`,
				points: mergedPoints.length >= 2 ? mergedPoints : (drafts[0].points || []),
				color: drafts[0].color || '#00acc1',
				size: drafts[0].size || 3,
				imageKey: key
			};

			this.saveHistory();
			const prevImageKey = this.activeImage;
			this.activeImage = key;
			this.redraw();
			const editedFilePath = await this.captureEditedImageFile();
			const op = await this.withAiFeedback(() => aiEngine.sketchToImage({
				sketchStroke: mergedStroke,
				imageKey: key,
				incrementIndex: this.sketchEdits.length + 1,
				images: this.getImagesByMode(this.activeMode),
				editedFilePath
			}));
			if (!op) {
				this.activeImage = prevImageKey;
				this.redraw();
				return;
			}
			this.sketchEdits.push(op);
			await this.commitAiOperation(op, mergedStroke);
			this.activeImage = prevImageKey;
			this.redraw();
		},

		appendDraftSymbolStroke(stroke, detected) {
			const key = this.activeImage === 'B' ? 'B' : 'A';
			const list = Array.isArray(this.draftSymbolStrokes[key]) ? this.draftSymbolStrokes[key].slice() : [];
			list.push({
				id: stroke.id,
				points: stroke.points.slice(),
				color: stroke.color,
				size: stroke.size,
				detected: detected || null,
				imageKey: key
			});
			this.draftSymbolStrokes[key] = list;
			this.hintText = `已记录符号轨迹 ${list.length} 笔，点击开始创作联合识别。`;
			this.redraw();
		},

		prepareSymbolCreationTask(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const count = (this.draftSymbolStrokes[key] || []).length;
			if (!count) return;
			this.queueCreationTask(`符号属性创作（${count}笔）`, async () => {
				await this.handleSymbolBatch(key);
			});
		},

		detectSymbolFromDrafts(drafts, mergedStroke) {
			const mergedDetected = detectSymbol(mergedStroke.points || []);
			if (mergedDetected) return mergedDetected;

			let best = null;
			drafts.forEach((item) => {
				const detected = item.detected || detectSymbol(item.points || []);
				if (!detected) return;
				if (!best || Number(detected.confidence || 0) > Number(best.confidence || 0)) {
					best = detected;
				}
			});
			if (best) return best;

			return {
				type: 'sun',
				box: makeRegionFromPath(mergedStroke.points || []).box,
				confidence: 0.5
			};
		},

		async handleSymbolBatch(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const drafts = this.draftSymbolStrokes[key] || [];
			if (!drafts.length) {
				uni.showToast({ title: '请先绘制符号轨迹', icon: 'none' });
				return;
			}

			const mergedPoints = drafts.reduce((acc, item) => acc.concat(item.points || []), []);
			const mergedStroke = {
				id: `draft_symbol_${Date.now()}`,
				points: mergedPoints.length >= 2 ? mergedPoints : (drafts[0].points || []),
				color: drafts[0].color || '#ffb300',
				size: drafts[0].size || 3,
				imageKey: key
			};
			const detected = this.detectSymbolFromDrafts(drafts, mergedStroke);

			const prevImageKey = this.activeImage;
			this.activeImage = key;
			await this.handleSymbol(mergedStroke, detected);
			this.activeImage = prevImageKey;
			this.redraw();
		},

		appendDraftPerspectiveStroke(stroke, detected) {
			const key = this.activeImage === 'B' ? 'B' : 'A';
			const list = Array.isArray(this.draftPerspectiveStrokes[key]) ? this.draftPerspectiveStrokes[key].slice() : [];
			list.push({
				id: stroke.id,
				points: stroke.points.slice(),
				color: stroke.color,
				size: stroke.size,
				detected: detected || null,
				imageKey: key
			});
			this.draftPerspectiveStrokes[key] = list;
			this.hintText = `已记录透视轨迹 ${list.length} 笔，点击开始创作联合识别。`;
			this.redraw();
		},

		preparePerspectiveCreationTask(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const count = (this.draftPerspectiveStrokes[key] || []).length;
			if (!count) return;
			this.queueCreationTask(`透视引导创作（${count}笔）`, async () => {
				await this.handlePerspectiveBatch(key);
			});
		},

		detectPerspectiveFromDrafts(drafts) {
			let vanishing = null;
			drafts.forEach((item) => {
				const detected = item.detected || detectSymbol(item.points || []);
				if (!detected || detected.type !== 'vanishing-point') return;
				if (!vanishing || Number(detected.confidence || 0) > Number(vanishing.confidence || 0)) {
					vanishing = detected;
				}
			});
			return vanishing;
		},

		async handlePerspectiveBatch(imageKey) {
			const key = imageKey === 'B' ? 'B' : 'A';
			const drafts = this.draftPerspectiveStrokes[key] || [];
			if (!drafts.length) {
				uni.showToast({ title: '请先绘制透视轨迹', icon: 'none' });
				return;
			}

			const mergedPoints = drafts.reduce((acc, item) => acc.concat(item.points || []), []);
			const mergedStroke = {
				id: `draft_perspective_${Date.now()}`,
				points: mergedPoints.length >= 2 ? mergedPoints : (drafts[0].points || []),
				color: drafts[0].color || '#3b82f6',
				size: drafts[0].size || 3,
				imageKey: key
			};
			const detected = this.detectPerspectiveFromDrafts(drafts);

			const prevImageKey = this.activeImage;
			this.activeImage = key;
			await this.handlePerspective(mergedStroke, detected);
			this.activeImage = prevImageKey;
			this.redraw();
		},

		handleRegionStroke(stroke) {
			const region = makeRegionFromPath(stroke.points);
			if (!region.closed) {
				uni.showToast({ title: '请闭合圈选轨迹', icon: 'none' });
				return;
			}
			this.saveHistory();
			this.regions[this.activeImage].push(region);
			this.pushPreview(stroke);
			this.hintText = '圈选完成，点击删除/添加/修改执行区域编辑。';
			this.redraw();
		},

		handleReplaceStroke(stroke) {
			const region = makeRegionFromPath(stroke.points);
			if (!region.closed) {
				uni.showToast({ title: '替换需要闭合圈选', icon: 'none' });
				return;
			}
			this.saveHistory();
			if (this.activeImage === 'A') {
				this.replaceSelection.source = region;
				this.hintText = '已记录图片A元素，请切换到图片B圈选替换目标。';
			} else {
				this.replaceSelection.target = region;
				this.hintText = '已记录图片B目标，点击替换即可执行跨图替换。';
			}
			this.regions[this.activeImage].push(region);
			this.pushPreview(stroke);
			this.redraw();
		},

		handleFusionStroke(stroke) {
			return;
		},

		async withAiFeedback(action, loadingTitle = 'AI处理中') {
			uni.showLoading({ title: loadingTitle, mask: true });
			try {
				return await action();
			} catch (error) {
				const message = (error && error.message) || 'AI请求失败';
				uni.showToast({ title: message.length > 18 ? 'AI请求失败，请重试' : message, icon: 'none' });
				return null;
			} finally {
				uni.hideLoading();
			}
		},

		async applyBackendResultImage(op, fallbackImageKey = this.activeImage) {
			const result = op && op.backend ? op.backend : null;
			const imageUrl = this.resolveBackendImageUrl(result && result.imageUrl ? result.imageUrl : '');
			if (!imageUrl) return false;

			const targetKey = op && (op.imageKey === 'A' || op.imageKey === 'B') ? op.imageKey : fallbackImageKey;
			if (targetKey !== 'A' && targetKey !== 'B') return false;

			const imageStore = this.getImagesByMode(this.activeMode);
			const current = imageStore[targetKey];
			if (!current) return false;

			let info = null;
			try {
				info = await getImageInfo(imageUrl);
			} catch (error) {
				info = null;
			}

			const width = Number((info && info.width) || (current.info && current.info.width) || this.canvasWidth || 1);
			const height = Number((info && info.height) || (current.info && current.info.height) || this.canvasHeight || 1);
			const nextInfo = {
				...(current.info || {}),
				...(info || {}),
				path: imageUrl,
				width,
				height
			};
			const nextTransform = fitImageToCanvas(nextInfo, this.canvasWidth, this.canvasHeight);

			imageStore[targetKey] = {
				...current,
				path: imageUrl,
				info: nextInfo,
				transform: nextTransform
			};

			this.clearUserNotesForImage(targetKey);

			this.hintText = 'AI结果图已更新。';
			return true;
		},

		clearUserNotesForImage(imageKey) {
			this.regions[imageKey] = [];
			this.previewStrokes = [];
			this.currentStrokePoints = [];
			this.replaceSelection = { source: null, target: null };
			this.operations = this.operations.filter((op) => op.imageKey !== imageKey);
			this.sketchEdits = this.sketchEdits.filter((item) => item.imageKey !== imageKey);
			this.draftSketchStrokes[imageKey] = [];
			this.draftSymbolStrokes[imageKey] = [];
			this.draftPerspectiveStrokes[imageKey] = [];
		},

		resolveBackendImageUrl(rawUrl) {
			if (!rawUrl || typeof rawUrl !== 'string') return '';
			const backendBase = aiEngine && aiEngine.endpoint ? String(aiEngine.endpoint).replace(/\/$/, '') : '';
			if (!backendBase) return rawUrl;

			if (/^\/storage\//i.test(rawUrl)) {
				return `${backendBase}${rawUrl}`;
			}

			if (!/^https?:\/\//i.test(rawUrl)) return rawUrl;

			try {
				const localLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i;
				if (!localLoopback.test(rawUrl)) {
					return rawUrl;
				}
				return rawUrl.replace(localLoopback, `${backendBase}/`);
			} catch (error) {
				return rawUrl;
			}
		},

		async commitAiOperation(op, previewStroke = null) {
			if (!op) return;
			const updatedByImage = await this.applyBackendResultImage(op);
			if (!updatedByImage) {
				this.operations.push(op);
			}
			if (previewStroke && !updatedByImage) {
				this.pushPreview(previewStroke);
			}
			this.redraw();
		},

		async captureEditedImageFile() {
			if (this.activeMode === 'fusion') {
				return this.captureFusionCompositeFile();
			}

			const imageStore = this.getImagesByMode(this.activeMode);
			const active = imageStore[this.activeImage];
			if (!active || !active.path) return '';

			try {
				const basePath = await this.ensureLocalImagePath(active.path);
				if (!basePath) return active.path || '';

				const overlay = await exportCanvasToImage(this.canvasId, this.canvasWidth, this.canvasHeight, 'png');
				const overlayPath = overlay && overlay.tempFilePath ? overlay.tempFilePath : '';

				const targetWidth = Math.max(1, Math.floor(this.canvasWidth || 1));
				const targetHeight = Math.max(1, Math.floor(this.canvasHeight || 1));

				const mergeCtx = uni.createCanvasContext(this.mergeCanvasId, this);
				mergeCtx.clearRect(0, 0, targetWidth, targetHeight);
				const t = active.transform || { x: 0, y: 0, width: targetWidth, height: targetHeight };
				mergeCtx.drawImage(
					basePath,
					Number(t.x || 0),
					Number(t.y || 0),
					Math.max(1, Number(t.width || targetWidth)),
					Math.max(1, Number(t.height || targetHeight))
				);
				if (overlayPath) {
					mergeCtx.drawImage(overlayPath, 0, 0, targetWidth, targetHeight);
				}

				await new Promise((resolve) => {
					mergeCtx.draw(false, () => resolve());
				});

				const merged = await new Promise((resolve, reject) => {
					uni.canvasToTempFilePath(
						{
							canvasId: this.mergeCanvasId,
							width: targetWidth,
							height: targetHeight,
							destWidth: targetWidth,
							destHeight: targetHeight,
							fileType: 'png',
							success: resolve,
							fail: reject
						},
						this
					);
				});

				return (merged && merged.tempFilePath) || active.path || '';
			} catch (error) {
				return active.path || '';
			}
		},

		async captureFusionCompositeFile() {
			const imageA = this.fusionImages.A;
			const imageB = this.fusionImages.B;
			if (!imageA || !imageA.path || !imageB || !imageB.path) return '';

			try {
				const pathA = await this.ensureLocalImagePath(imageA.path);
				const pathB = await this.ensureLocalImagePath(imageB.path);
				if (!pathA || !pathB) return '';

				const targetWidth = Math.max(1, Math.floor(this.canvasWidth || 1));
				const targetHeight = Math.max(1, Math.floor(this.canvasHeight || 1));
				const mergeCtx = uni.createCanvasContext(this.mergeCanvasId, this);
				mergeCtx.clearRect(0, 0, targetWidth, targetHeight);

				mergeCtx.save();
				mergeCtx.setGlobalAlpha(this.fusion.opacityA);
				mergeCtx.drawImage(pathA, 0, 0, targetWidth, targetHeight);
				mergeCtx.restore();

				const t = imageB.transform || {
					x: targetWidth / 3,
					y: targetHeight / 3,
					width: targetWidth / 3,
					height: targetHeight / 3
				};

				mergeCtx.save();
				this.setCompositeMode(mergeCtx, this.fusion.mode);
				mergeCtx.setGlobalAlpha(this.fusion.opacityB);
				mergeCtx.drawImage(pathB, Number(t.x || 0), Number(t.y || 0), Math.max(1, Number(t.width || 1)), Math.max(1, Number(t.height || 1)));
				mergeCtx.restore();

				await new Promise((resolve) => {
					mergeCtx.draw(false, () => resolve());
				});

				const merged = await new Promise((resolve, reject) => {
					uni.canvasToTempFilePath(
						{
							canvasId: this.mergeCanvasId,
							width: targetWidth,
							height: targetHeight,
							destWidth: targetWidth,
							destHeight: targetHeight,
							fileType: 'png',
							success: resolve,
							fail: reject
						},
						this
					);
				});

				return (merged && merged.tempFilePath) || '';
			} catch (error) {
				return '';
			}
		},

		async captureEditedImageFileForKey(imageKey) {
			const targetKey = imageKey === 'B' ? 'B' : 'A';
			const prev = this.activeImage;
			this.activeImage = targetKey;
			this.redraw();
			const file = await this.captureEditedImageFile();
			this.activeImage = prev;
			this.redraw();
			return file;
		},

		async ensureLocalImagePath(imagePath) {
			if (!imagePath) return '';
			if (!/^https?:\/\//i.test(imagePath)) return imagePath;

			return new Promise((resolve) => {
				uni.downloadFile({
					url: imagePath,
					success: (res) => {
						if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
							resolve(res.tempFilePath);
							return;
						}
						resolve('');
					},
					fail: () => resolve('')
				});
			});
		},

		async handleStrokeGuided(stroke) {
			const intent = detectStrokeIntent(stroke.points, this.brush);
			this.saveHistory();
			const editedFilePath = await this.captureEditedImageFile();
			const op = await this.withAiFeedback(() => aiEngine.strokeGuidedEdit({ intent, imageKey: this.activeImage, images: this.getImagesByMode(this.activeMode), editedFilePath }));
			await this.commitAiOperation(op, stroke);
		},

		async handleSketch(stroke) {
			this.saveHistory();
			const editedFilePath = await this.captureEditedImageFile();
			const op = await this.withAiFeedback(() => aiEngine.sketchToImage({
				sketchStroke: stroke,
				imageKey: this.activeImage,
				incrementIndex: this.sketchEdits.length + 1,
				images: this.getImagesByMode(this.activeMode),
				editedFilePath
			}));
			if (!op) return;
			this.sketchEdits.push(op);
			await this.commitAiOperation(op, stroke);
		},

		async handleSymbol(stroke, detected) {
			const symbol = detected || { type: 'sun', box: makeRegionFromPath(stroke.points).box };
			this.saveHistory();
			if (symbol.type === 'circle-cross-delete') {
				const region = {
					polygon: makeRegionFromPath(stroke.points).polygon,
					box: symbol.box
				};
				const editedFilePath = await this.captureEditedImageFile();
				const opDelete = await this.withAiFeedback(() => aiEngine.deleteRegion({ region, imageKey: this.activeImage, images: this.getImagesByMode(this.activeMode), editedFilePath }));
				await this.commitAiOperation(opDelete, stroke);
				return;
			}
			const editedFilePath = await this.captureEditedImageFile();
			const op = await this.withAiFeedback(() => aiEngine.symbolEdit({ symbol, imageKey: this.activeImage, images: this.getImagesByMode(this.activeMode), editedFilePath }));
			await this.commitAiOperation(op, stroke);
		},

		async handlePerspective(stroke, detected) {
			this.saveHistory();
			if (detected && detected.type === 'vanishing-point') {
				this.perspective.vanishingPoint = {
					x: detected.box.minX + detected.box.width / 2,
					y: detected.box.minY + detected.box.height / 2
				};
			} else if (stroke.points.length > 5 && this.perspective.vanishingPoint) {
				this.perspective.lines.push({
					id: `pers_line_${Date.now()}`,
					points: stroke.points.slice(0, 2)
				});
				if (this.perspective.lines.length > 12) {
					this.perspective.lines.shift();
				}
			} else {
				this.perspective.cube = {
					id: `cube_${Date.now()}`,
					points: stroke.points.slice(0, 12)
				};
			}

			const editedFilePath = await this.captureEditedImageFile();
			const op = await this.withAiFeedback(() => aiEngine.perspectiveEdit({
				perspectiveState: this.perspective,
				imageKey: this.activeImage,
				images: this.getImagesByMode(this.activeMode),
				editedFilePath
			}));
			await this.commitAiOperation(op, stroke);
		},

		async runRegionAction(action) {
			const list = this.regions[this.activeImage];
			if (!list.length) {
				uni.showToast({ title: '请先圈选区域', icon: 'none' });
				return;
			}
			const region = list[list.length - 1];
			this.saveHistory();
			const editedFilePath = await this.captureEditedImageFile();

			if (action === 'delete') {
				this.queueCreationTask('圈选删除创作', async () => {
					const op = await this.withAiFeedback(() => aiEngine.deleteRegion({ region, imageKey: this.activeImage, images: this.getImagesByMode(this.activeMode), editedFilePath }));
					await this.commitAiOperation(op);
				});
				return;
			}

			const prompt = await this.askPrompt(action === 'add' ? '请输入添加提示词' : '请输入修改提示词');
			if (!prompt) return;

			if (action === 'add') {
				this.queueCreationTask('圈选添加创作', async () => {
					const op = await this.withAiFeedback(() => aiEngine.addInRegion({ region, imageKey: this.activeImage, prompt, images: this.getImagesByMode(this.activeMode), editedFilePath }));
					await this.commitAiOperation(op);
				});
			} else {
				this.queueCreationTask('圈选修改创作', async () => {
					const op = await this.withAiFeedback(() => aiEngine.modifyRegion({ region, imageKey: this.activeImage, prompt, images: this.getImagesByMode(this.activeMode), editedFilePath }));
					await this.commitAiOperation(op);
				});
			}
		},

		async runCrossReplace() {
			if (!this.replaceSelection.source || !this.replaceSelection.target) {
				uni.showToast({ title: '请先在A/B完成圈选', icon: 'none' });
				return;
			}
			const prompt = await this.askPrompt('请输入跨图修改提示词', '例如：将A图中圈起的衣服换到B图圈起的人物上');
			if (prompt) {
				this.replacePromptDraft = prompt;
			}
			if (!this.replacePromptDraft) {
				uni.showToast({ title: '请先输入修改提示词', icon: 'none' });
				return;
			}

			this.saveHistory();
			const editedFilePathA = await this.captureEditedImageFileForKey('A');
			const editedFilePathB = await this.captureEditedImageFileForKey('B');
			this.queueCreationTask('跨图替换创作', async () => {
				const replaceStore = this.getImagesByMode('replace');
				const op = await this.withAiFeedback(() => aiEngine.replaceAcrossImages({
					sourceRegion: this.replaceSelection.source,
					targetRegion: this.replaceSelection.target,
					images: replaceStore,
					editedFilePathA,
					editedFilePathB,
					prompt: this.replacePromptDraft
				}));
				await this.commitAiOperation(op);
			});
		},

		resetReplaceSelection() {
			this.replaceSelection = { source: null, target: null };
			this.replacePromptDraft = '';
			this.hintText = '跨图圈选已重置。';
			this.redraw();
		},

		dragImage(point) {
			const image = this.fusionImages.B;
			if (!image || !image.transform || !this.lastTouchPoint) return;
			const dx = point.x - this.lastTouchPoint.x;
			const dy = point.y - this.lastTouchPoint.y;
			image.transform.x += dx;
			image.transform.y += dy;
			this.redraw();
		},

		isPointInTransform(point, transform) {
			if (!point || !transform) return false;
			return (
				point.x >= transform.x &&
				point.x <= transform.x + transform.width &&
				point.y >= transform.y &&
				point.y <= transform.y + transform.height
			);
		},

		makeFusionOverlayTransform(imageInfo, ratio = 1 / 3) {
			const fit = fitImageToCanvas(imageInfo, this.canvasWidth, this.canvasHeight);
			const width = Math.max(1, fit.width * ratio);
			const height = Math.max(1, fit.height * ratio);
			return {
				x: (this.canvasWidth - width) / 2,
				y: (this.canvasHeight - height) / 2,
				width,
				height
			};
		},

		onFusionScaleChange(e) {
			const imageB = this.fusionImages.B;
			if (!imageB || !imageB.transform) return;
			const percent = Number((e && e.detail && e.detail.value) || 100);
			const nextScale = clamp(percent / 100, 0.4, 2.6);
			const safeCurrent = Math.max(0.01, this.fusion.overlayScale || 1);

			const base = this.fusion.overlayBase || {
				width: imageB.transform.width / safeCurrent,
				height: imageB.transform.height / safeCurrent
			};
			const centerX = imageB.transform.x + imageB.transform.width / 2;
			const centerY = imageB.transform.y + imageB.transform.height / 2;
			const width = Math.max(1, base.width * nextScale);
			const height = Math.max(1, base.height * nextScale);

			this.fusion.overlayScale = nextScale;
			imageB.transform = {
				x: centerX - width / 2,
				y: centerY - height / 2,
				width,
				height
			};
			this.redraw();
		},

		onFusionOpacityChange(e) {
			const percent = Number((e && e.detail && e.detail.value) || 75);
			this.fusion.opacityB = clamp(percent / 100, 0.1, 1);
			this.redraw();
		},

		async runFusion() {
			if (!this.fusionImages.A || !this.fusionImages.B) {
				uni.showToast({ title: '请先导入A和B图片', icon: 'none' });
				return;
			}

			this.saveHistory();
			const editedFilePath = await this.captureFusionCompositeFile();
			if (!editedFilePath) {
				uni.showToast({ title: '融合图生成失败', icon: 'none' });
				return;
			}

			const op = await this.withAiFeedback(() =>
				aiEngine.fuseImages({
					mode: this.fusion.mode,
					opacityA: this.fusion.opacityA,
					opacityB: this.fusion.opacityB,
					images: this.fusionImages,
					editedFilePath,
					prompt: 'fuse the image'
				})
			);
			await this.commitAiOperation(op);
		},

		onBlendChange(e) {
			const index = Number(e.detail.value || 0);
			this.fusion.mode = this.blendModes[index] || 'source-over';
			this.redraw();
		},

		onFusionStrokeToggle(e) {
			this.fusion.drawOpacityByStroke = !!e.detail.value;
		},

		onBrushSizeChanging(e) {
			this.brush.size = Number(e.detail.value || this.brush.size);
		},

		onBrushSizeChange(e) {
			this.brush.size = Number(e.detail.value || this.brush.size);
		},

		setBrushColor(color) {
			this.brush.color = color;
		},

		pushPreview(stroke) {
			this.previewStrokes.push({
				...stroke,
				time: Date.now()
			});
			if (this.previewStrokes.length > 8) this.previewStrokes.shift();
		},

		previewCurrentStroke() {
			const fakeStroke = {
				id: 'temp',
				points: this.currentStrokePoints,
				color: this.brush.color,
				size: this.brush.size,
				gradientEnabled: this.brush.gradientEnabled,
				imageKey: this.activeImage
			};
			this.previewStrokes = this.previewStrokes.filter((s) => s.id !== 'temp').concat(fakeStroke);
			this.redraw();
		},

		saveHistory() {
			const snapshot = {
				images: deepClone(this.images),
				replaceImages: deepClone(this.replaceImages),
				fusionImages: deepClone(this.fusionImages),
				regions: deepClone(this.regions),
				replaceSelection: deepClone(this.replaceSelection),
				fusion: deepClone(this.fusion),
				perspective: deepClone(this.perspective),
				operations: deepClone(this.operations),
				sketchEdits: deepClone(this.sketchEdits)
			};
			this.history.push(snapshot);
			if (this.history.length > this.historyMax) this.history.shift();
		},

		clearAll() {
			this.saveHistory();
			this.images = { A: null, B: null };
			this.replaceImages = { A: null, B: null };
			this.fusionImages = { A: null, B: null };
			this.activeImage = 'A';
			this.regions = { A: [], B: [] };
			this.replaceSelection = { source: null, target: null };
			this.replacePromptDraft = '';
			this.operations = [];
			this.sketchEdits = [];
			this.draftSketchStrokes = { A: [], B: [] };
			this.draftSymbolStrokes = { A: [], B: [] };
			this.draftPerspectiveStrokes = { A: [], B: [] };
			this.previewStrokes = [];
			this.pendingCreationTask = null;
			this.creatingByButton = false;
			this.perspective = {
				vanishingPoint: null,
				lines: [],
				cube: null
			};
			this.restoreHintByMode();
			this.redraw();
		},

		removeSketchEdit(targetId) {
			if (!this.sketchEdits.length) {
				uni.showToast({ title: '暂无可删除增量', icon: 'none' });
				return;
			}
			this.saveHistory();
			if (targetId === 'last') {
				const last = this.sketchEdits[this.sketchEdits.length - 1];
				this.sketchEdits.pop();
				this.operations = this.operations.filter((op) => op.id !== last.id);
			} else {
				this.sketchEdits = this.sketchEdits.filter((item) => item.id !== targetId);
				this.operations = this.operations.filter((op) => op.id !== targetId);
			}
			this.redraw();
		},

		async exportImage() {
			try {
				uni.showLoading({ title: '导出中' });
				const mergedPath = await this.captureEditedImageFile();
				if (!mergedPath) {
					uni.showToast({ title: '导出失败', icon: 'none' });
					return;
				}
				await saveImageToAlbum(mergedPath);
				uni.showToast({ title: '导出成功', icon: 'success' });
			} catch (error) {
				uni.showToast({ title: '导出失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		askPrompt(title, placeholderText = '例如: 添加一朵花 / 将杯子改成红色') {
			return new Promise((resolve) => {
				uni.showModal({
					title,
					editable: true,
					placeholderText,
					success: (res) => {
						if (!res.confirm) {
							resolve('');
							return;
						}
						resolve((res.content || '').trim());
					}
				});
			});
		},

		redraw() {
			if (!this.ctx) return;
			const ctx = this.ctx;
			const w = this.canvasWidth;
			const h = this.canvasHeight;

			ctx.clearRect(0, 0, w, h);

			this.drawBackground(ctx, w, h);
			this.drawBaseImages(ctx);
			this.drawOperations(ctx);
			this.drawRegions(ctx);
			this.drawPerspectiveGrid(ctx);
			this.drawPreviewStrokes(ctx);

			ctx.draw();
		},

		drawBackground(ctx, w, h) {
			if (this.activeMode === 'fusion') {
				ctx.setFillStyle('#f4f6f8');
				ctx.fillRect(0, 0, w, h);
			}
		},

		setCompositeMode(ctx, mode) {
			if (!ctx) return;
			const nextMode = mode || 'source-over';
			if (typeof ctx.setGlobalCompositeOperation === 'function') {
				ctx.setGlobalCompositeOperation(nextMode);
				return;
			}
			if ('globalCompositeOperation' in ctx) {
				ctx.globalCompositeOperation = nextMode;
			}
		},

		drawBaseImages(ctx) {
			const imageStore = this.getImagesByMode(this.activeMode);
			const imageA = imageStore.A;
			const imageB = imageStore.B;

			if (this.activeMode === 'fusion') {
				if (imageA && imageA.path) {
					const ta = imageA.transform || fitImageToCanvas(imageA.info || {}, this.canvasWidth, this.canvasHeight);
					ctx.save();
					ctx.setGlobalAlpha(this.fusion.opacityA);
					ctx.drawImage(imageA.path, ta.x, ta.y, ta.width, ta.height);
					ctx.restore();
				}

				if (imageB && imageB.transform) {
					ctx.save();
					this.setCompositeMode(ctx, this.fusion.mode);
					ctx.setGlobalAlpha(this.fusion.opacityB);
					ctx.drawImage(imageB.path, imageB.transform.x, imageB.transform.y, imageB.transform.width, imageB.transform.height);
					ctx.restore();
				}
				return;
			}

			const active = this.activeImage === 'B' ? imageB : imageA;
			if (active && active.transform) {
				ctx.save();
				ctx.drawImage(active.path, active.transform.x, active.transform.y, active.transform.width, active.transform.height);
				ctx.restore();
			}
		},

		drawOperations(ctx) {
			const draftSketches = this.draftSketchStrokes[this.activeImage] || [];
			draftSketches.forEach((stroke) => {
				this.drawPolyline(ctx, stroke.points, stroke.color || '#00acc1', stroke.size || 3, true, 0.95);
			});

			const draftSymbols = this.draftSymbolStrokes[this.activeImage] || [];
			draftSymbols.forEach((stroke) => {
				this.drawPolyline(ctx, stroke.points, stroke.color || '#ffb300', stroke.size || 3, true, 0.95);
			});

			const draftPerspectives = this.draftPerspectiveStrokes[this.activeImage] || [];
			draftPerspectives.forEach((stroke) => {
				this.drawPolyline(ctx, stroke.points, stroke.color || '#3b82f6', stroke.size || 3, true, 0.95);
			});

			this.operations.forEach((op) => {
				if (op && op.backend && op.backend.imageUrl) return;
				if (!op.imageKey) return;
				if (op.imageKey !== this.activeImage && this.activeMode !== 'fusion') return;

				if (op.kind === 'delete-region') {
					if (op.region && op.region.polygon) {
						this.strokePolygon(ctx, op.region.polygon, '#ff7043', 2);
					}
				}

				if (op.kind === 'add-region') {
					ctx.save();
					ctx.setGlobalAlpha(0.82);
					ctx.setFillStyle(op.color || '#ffb300');
					ctx.beginPath();
					ctx.arc(op.center.x, op.center.y, Math.max(14, op.region.box.width * 0.18), 0, Math.PI * 2);
					ctx.fill();
					ctx.restore();
				}

				if (op.kind === 'modify-region') {
					this.fillPolygon(ctx, op.region.polygon, op.tint || '#ffd54f', 0.35);
				}

				if (op.kind === 'replace-cross-image') {
					const box = op.targetRegion.box;
					ctx.save();
					ctx.setGlobalAlpha(0.95);
					ctx.setStrokeStyle('#00bcd4');
					ctx.setLineWidth(2);
					ctx.strokeRect(box.minX, box.minY, box.width, box.height);
					ctx.restore();
				}

				if (op.kind === 'stroke-guided') {
					const box = op.intent.box;
					ctx.save();
					ctx.setStrokeStyle('#7e57c2');
					ctx.setLineWidth(2);
					ctx.strokeRect(box.minX, box.minY, box.width, box.height);
					ctx.restore();
				}

				if (op.kind === 'sketch-increment') {
					this.drawPolyline(ctx, op.sketchStroke.points, '#00acc1', 3, true);
				}

				if (op.kind === 'symbol-edit') {
					const box = op.symbol.box;
					ctx.save();
					ctx.setGlobalAlpha(0.24);
					ctx.setFillStyle('#ffee58');
					ctx.fillRect(box.minX - 4, box.minY - 4, box.width + 8, box.height + 8);
					ctx.restore();
				}
			});
		},

		drawRegions(ctx) {
			(this.regions[this.activeImage] || []).forEach((region) => {
				this.fillPolygon(ctx, region.polygon, '#55c2ff', region.highlightAlpha || 0.16);
				this.strokePolygon(ctx, region.polygon, '#2e86de', 2);
			});
		},

		drawPerspectiveGrid(ctx) {
			return;
		},

		drawPreviewStrokes(ctx) {
			const now = Date.now();
			this.previewStrokes = this.previewStrokes.filter((stroke) => !stroke.time || now - stroke.time < 1500 || stroke.id === 'temp');
			this.previewStrokes.forEach((stroke) => {
				if (stroke.imageKey && stroke.imageKey !== this.activeImage) return;
				const alpha = stroke.id === 'temp' ? 1 : clamp(1 - (now - (stroke.time || now)) / 1500, 0.22, 0.9);
				this.drawPolyline(ctx, stroke.points, stroke.color || '#111111', stroke.size || 2, false, alpha, !!stroke.gradientEnabled);
			});
		},

		drawPolyline(ctx, points, color, width, dashed = false, alpha = 1, gradientEnabled = false) {
			if (!points || points.length < 2) return;
			ctx.save();
			ctx.setGlobalAlpha(alpha);
			if (gradientEnabled && !dashed && ctx.createLinearGradient) {
				const first = points[0];
				const last = points[points.length - 1];
				const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
				gradient.addColorStop(0, this.adjustHexColor(color, 0.45));
				gradient.addColorStop(1, this.adjustHexColor(color, -0.3));
				ctx.setStrokeStyle(gradient);
			} else {
				ctx.setStrokeStyle(color);
			}
			ctx.setLineWidth(width);
			ctx.setLineCap('round');
			ctx.setLineJoin('round');
			if (dashed && ctx.setLineDash) ctx.setLineDash([8, 8], 0);
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i += 1) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.stroke();
			ctx.restore();
		},

		adjustHexColor(hex, amount = 0) {
			const value = String(hex || '#000000').replace('#', '');
			if (!/^[0-9a-fA-F]{6}$/.test(value)) return '#000000';
			const ratio = clamp(amount, -1, 1);
			const offset = Math.round(ratio * 255);
			const r = clamp(parseInt(value.slice(0, 2), 16) + offset, 0, 255);
			const g = clamp(parseInt(value.slice(2, 4), 16) + offset, 0, 255);
			const b = clamp(parseInt(value.slice(4, 6), 16) + offset, 0, 255);
			const toHex = (num) => Number(num).toString(16).padStart(2, '0');
			return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
		},

		fillPolygon(ctx, polygon, color, alpha = 0.2) {
			if (!polygon || polygon.length < 3) return;
			ctx.save();
			ctx.setGlobalAlpha(alpha);
			ctx.setFillStyle(color);
			ctx.beginPath();
			ctx.moveTo(polygon[0].x, polygon[0].y);
			for (let i = 1; i < polygon.length; i += 1) {
				ctx.lineTo(polygon[i].x, polygon[i].y);
			}
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		},

		strokePolygon(ctx, polygon, color, width = 2) {
			if (!polygon || polygon.length < 3) return;
			ctx.save();
			ctx.setStrokeStyle(color);
			ctx.setLineWidth(width);
			ctx.beginPath();
			ctx.moveTo(polygon[0].x, polygon[0].y);
			for (let i = 1; i < polygon.length; i += 1) {
				ctx.lineTo(polygon[i].x, polygon[i].y);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		}
	}
};
</script>

<style>
.page-root {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: linear-gradient(160deg, #fdf8f3 0%, #fff6ed 100%);
	padding: 12rpx 10rpx 12rpx 12rpx;
	box-sizing: border-box;
	overflow: hidden;
	overscroll-behavior: none;
	touch-action: none;
}

.manual-scroll-viewport {
	position: relative;
	flex: 1;
	height: 100%;
	overflow: hidden;
	overscroll-behavior: none;
}

.manual-scroll-content {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	padding-right: 26rpx;
	padding-bottom: calc(env(safe-area-inset-bottom) + 172rpx);
	box-sizing: border-box;
	will-change: transform;
	min-height: 100%;
}

.manual-scrollbar {
	position: absolute;
	right: 0;
	top: 0;
	height: 100%;
	width: 18rpx;
	border-radius: 999rpx;
	background: rgba(148, 163, 184, 0.2);
}

.manual-scrollbar-track {
	position: absolute;
	left: 50%;
	top: 6rpx;
	transform: translateX(-50%);
	width: 6rpx;
	height: calc(100% - 12rpx);
	border-radius: 999rpx;
	background: rgba(148, 163, 184, 0.35);
}

.manual-scrollbar-thumb {
	position: absolute;
	left: 2rpx;
	top: 0;
	width: 14rpx;
	min-height: 52rpx;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #e8855a 0%, #f0a882 100%);
	box-shadow: 0 2rpx 8rpx rgba(232, 133, 90, 0.35);
}

.merge-canvas {
	position: fixed;
	left: -40000rpx;
	top: -40000rpx;
	opacity: 0;
	pointer-events: none;
}

.tutorial-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(15, 23, 42, 0.45);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	box-sizing: border-box;
}

.tutorial-card {
	width: 100%;
	max-width: 700rpx;
	max-height: 78vh;
	overflow-y: auto;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 20rpx;
	box-shadow: 0 14rpx 42rpx rgba(15, 23, 42, 0.25);
}

.tutorial-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
	gap: 10rpx;
}

.tutorial-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #2c1f14;
}

.tutorial-section {
	background: #fff7f1;
	border: 1px solid #efd8c8;
	border-radius: 14rpx;
	padding: 12rpx;
	margin-top: 10rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.tutorial-label {
	font-size: 24rpx;
	font-weight: 600;
	color: #4a3628;
}

.tutorial-line {
	font-size: 22rpx;
	line-height: 1.45;
	color: #6f5b4e;
}

.top-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8rpx;
	background: rgba(255, 255, 255, 0.92);
	border-radius: 16rpx;
	margin-bottom: 12rpx;
	box-shadow: 0 6rpx 20rpx rgba(17, 24, 39, 0.08);
}

.safe-top {
	width: 100%;
	flex-shrink: 0;
}

.decor-title-wrap {
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 4rpx 0 10rpx;
}

.decor-title {
	font-size: 48rpx;
	font-weight: 900;
	letter-spacing: 6rpx;
	line-height: 1.1;
	padding: 4rpx 18rpx 8rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #e8855a 0%, #c8a86b 55%, #8b9e7a 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	color: transparent;
	text-shadow: 0 2rpx 0 rgba(255, 255, 255, 0.92), 0 10rpx 20rpx rgba(232, 133, 90, 0.2);
	border: 1px solid rgba(232, 133, 90, 0.2);
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
	background-color: rgba(255, 255, 255, 0.66);
}

.top-actions {
	display: flex;
	align-items: center;
	gap: 8rpx;
	width: 100%;
}

.top-actions .mini-btn {
	flex: 1 1 0;
	text-align: center;
}

.mini-btn {
	font-size: 22rpx;
	line-height: 1;
	padding: 10rpx 14rpx;
	border-radius: 12rpx;
	border: 1px solid #dbe2ea;
	background: #ffffff;
	color: #1f2d3d;
}

.mini-btn.danger {
	color: #d93025;
	border-color: #f2b8b5;
}

.mini-btn.primary {
	color: #ffffff;
	border-color: #e8855a;
	background: #e8855a;
}

.canvas-panel {
	flex: 1;
	background: transparent;
	border-radius: 20rpx;
	padding: 12rpx;
	box-shadow: inset 0 0 0 1px #edf1f5;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	touch-action: none;
}

.canvas-main {
	flex: 1;
	overflow: hidden;
	border-radius: 14rpx;
	background: transparent;
	position: relative;
	min-height: 240rpx;
}

.stage-image {
	position: absolute;
	z-index: 1;
	pointer-events: none;
	border-radius: 8rpx;
	background: transparent;
}

.stage-canvas {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 2;
}

.overlay-status {
	display: flex;
	justify-content: space-between;
	font-size: 22rpx;
	color: #52606d;
	padding: 8rpx 2rpx 2rpx;
	gap: 8rpx;
	white-space: nowrap;
	overflow: hidden;
}

.bottom-bar {
	margin-top: 12rpx;
	margin-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
	background: rgba(255, 255, 255, 0.96);
	border-radius: 16rpx;
	padding: 10rpx;
	box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.08);
}

.mode-tabs {
	white-space: nowrap;
	display: flex;
	margin-bottom: 8rpx;
}

.mode-pill {
	display: inline-block;
	padding: 10rpx 18rpx;
	margin-right: 8rpx;
	background: #f1f4f7;
	border-radius: 999rpx;
	font-size: 22rpx;
	color: #5b6773;
}

.mode-pill.active {
	background: #e8855a;
	color: #ffffff;
}

.action-row {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-bottom: 8rpx;
	flex-wrap: wrap;
}

.fusion-slider {
	flex: 1 1 320rpx;
	min-width: 260rpx;
	max-width: 520rpx;
}

.picker-text {
	font-size: 22rpx;
	color: #334155;
	padding: 8rpx 12rpx;
	border: 1px solid #d8e0ea;
	border-radius: 10rpx;
	background: #ffffff;
}

.switch-label {
	font-size: 22rpx;
	color: #475569;
}

.brush-row {
	margin-top: 6rpx;
}

.row-label {
	font-size: 22rpx;
	color: #475569;
}

.palette-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 6rpx;
	flex-wrap: wrap;
}

.sketch-chip {
	font-size: 20rpx;
	padding: 8rpx 12rpx;
	border-radius: 999rpx;
	background: #e6f7fb;
	color: #146c84;
	border: 1px solid #b9e7f3;
}

.color-dot {
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	border: 3rpx solid #ddd;
}

@media (min-width: 1536rpx) {
	.page-root {
		padding: 16rpx 24rpx;
	}

	.top-bar,
	.bottom-bar {
		padding: 12rpx;
	}
}
</style>
