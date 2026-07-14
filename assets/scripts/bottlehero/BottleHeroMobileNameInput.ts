import { Camera, game, Node, sys, UITransform, Vec3, view } from 'cc';

/** 移动浏览器 Web 预览：Cocos EditBox 易触发视口平移且不出键盘，改走 DOM input。 */
export function isMobileWebBrowser(): boolean {
  return sys.isBrowser && (sys.platform === sys.Platform.MOBILE_BROWSER || sys.isMobile);
}

export interface MobileNameInputShowOptions {
  anchorNode?: Node;
  camera?: Camera;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** anchor=对齐 EditBox 节点；fixedCenter=视口居中（手机昵称弹窗）。 */
  layout?: 'anchor' | 'fixedCenter';
  autoFocus?: boolean;
}

/**
 * 固定在 canvas 上方的透明/可见 DOM 输入框，避免 EditBox 在手机上把整屏左移。
 */
export class BottleHeroMobileNameInput {
  private input: HTMLInputElement | null = null;
  private onChange: ((value: string) => void) | null = null;
  private anchorNode: Node | null = null;
  private camera: Camera | null = null;
  private viewportHandler: (() => void) | null = null;

  ensureDom(): HTMLInputElement {
    if (this.input) {
      return this.input;
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.autocomplete = 'nickname';
    input.setAttribute('enterkeyhint', 'done');
    input.style.position = 'fixed';
    input.style.zIndex = '99999';
    input.style.fontSize = '16px';
    input.style.border = '2px solid rgb(0, 132, 79)';
    input.style.borderRadius = '8px';
    input.style.padding = '0 12px';
    input.style.textAlign = 'center';
    input.style.background = 'rgba(255, 255, 255, 0.98)';
    input.style.color = '#1e1812';
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.display = 'none';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.margin = '0';
    document.body.appendChild(input);
    input.addEventListener('input', () => {
      this.onChange?.(input.value);
    });
    this.input = input;
    this.ensureViewportMeta();
    return input;
  }

  private ensureViewportMeta() {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    const content = meta.content || '';
    if (!content.includes('interactive-widget')) {
      meta.content = content
        ? `${content}, interactive-widget=overlays-content`
        : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content';
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }

  show(options: MobileNameInputShowOptions) {
    const input = this.ensureDom();
    this.onChange = options.onChange;
    this.anchorNode = options.anchorNode ?? null;
    this.camera = options.camera ?? null;
    input.value = options.value;
    input.placeholder = options.placeholder;
    this.applyLayout(options.layout ?? 'fixedCenter');
    input.style.display = 'block';
    this.bindViewportListener();
    if (options.autoFocus) {
      requestAnimationFrame(() => this.focus());
    }
  }

  private applyLayout(layout: 'anchor' | 'fixedCenter') {
    const input = this.input;
    if (!input) {
      return;
    }
    if (layout === 'fixedCenter') {
      input.style.left = '50%';
      input.style.top = '46%';
      input.style.width = 'min(72vw, 520px)';
      input.style.height = '48px';
      input.style.transform = 'translate(-50%, -50%)';
      return;
    }
    this.updatePosition();
  }

  updatePosition() {
    const input = this.input;
    const anchorNode = this.anchorNode;
    const camera = this.camera;
    const canvas = game.canvas as HTMLCanvasElement | null;
    if (!input || !anchorNode?.isValid || !camera || !canvas) {
      return;
    }
    input.style.transform = 'translate(-50%, -50%)';
    const uiTransform = anchorNode.getComponent(UITransform);
    if (!uiTransform) {
      return;
    }
    const worldPos = uiTransform.convertToWorldSpaceAR(new Vec3(0, 0, 0));
    const screenPos = new Vec3();
    camera.worldToScreen(worldPos, screenPos);
    const canvasRect = canvas.getBoundingClientRect();
    const visible = view.getVisibleSize();
    const scaleX = canvasRect.width / visible.width;
    const scaleY = canvasRect.height / visible.height;
    const width = uiTransform.width * scaleX;
    const height = uiTransform.height * scaleY;
    const left = canvasRect.left + screenPos.x * scaleX;
    const top = canvasRect.top + (visible.height - screenPos.y) * scaleY;
    input.style.left = `${left}px`;
    input.style.top = `${top}px`;
    input.style.width = `${Math.max(120, width)}px`;
    input.style.height = `${Math.max(44, height)}px`;
  }

  focus() {
    if (!this.input) {
      return;
    }
    try {
      this.input.focus({ preventScroll: true });
    } catch {
      this.input.focus();
    }
  }

  getValue(): string {
    return this.input?.value ?? '';
  }

  isVisible(): boolean {
    return this.input?.style.display === 'block';
  }

  hide() {
    this.unbindViewportListener();
    if (this.input) {
      this.input.blur();
      this.input.style.display = 'none';
    }
    this.onChange = null;
    this.anchorNode = null;
    this.camera = null;
  }

  destroy() {
    this.hide();
    this.input?.remove();
    this.input = null;
  }

  private bindViewportListener() {
    this.unbindViewportListener();
    if (typeof window === 'undefined') {
      return;
    }
    this.viewportHandler = () => {
      if (this.input?.style.left === '50%') {
        return;
      }
      this.updatePosition();
    };
    window.visualViewport?.addEventListener('resize', this.viewportHandler);
    window.addEventListener('resize', this.viewportHandler);
  }

  private unbindViewportListener() {
    if (!this.viewportHandler || typeof window === 'undefined') {
      return;
    }
    window.visualViewport?.removeEventListener('resize', this.viewportHandler);
    window.removeEventListener('resize', this.viewportHandler);
    this.viewportHandler = null;
  }
}
