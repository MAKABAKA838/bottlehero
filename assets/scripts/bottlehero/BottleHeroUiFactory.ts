import {
  Button,
  Color,
  Graphics,
  Label,
  Node,
  Sprite,
  SpriteFrame,
  tween,
  UITransform,
  Vec3,
} from 'cc';

export type BottleHeroUiPressOptions = {
  onButtonSound?: () => void;
  target?: unknown;
};

export function addTransform(node: Node, width: number, height: number): UITransform {
  const transform = node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

export function createNode(
  name: string,
  parent: Node,
  x: number,
  y: number,
  width: number,
  height: number,
): Node {
  const node = new Node(name);
  node.setParent(parent);
  node.setPosition(x, y, 0);
  addTransform(node, width, height);
  return node;
}

export function createSpriteNode(
  name: string,
  parent: Node,
  frame: SpriteFrame | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): Node {
  const node = createNode(name, parent, x, y, width, height);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  if (frame?.texture) {
    sprite.spriteFrame = frame;
  }
  node.getComponent(UITransform)?.setContentSize(width, height);
  return node;
}

export function addPressScale(
  node: Node,
  baseScale = 1,
  onButtonSound?: () => void,
  target?: unknown,
): void {
  const eventTarget = target ?? node;
  node.on(
    Node.EventType.TOUCH_START,
    () => {
      tween(node).stop();
      tween(node).to(0.05, { scale: new Vec3(baseScale * 0.92, baseScale * 0.92, 1) }).start();
    },
    eventTarget,
  );
  const release = (playSound: boolean) => {
    if (playSound) {
      onButtonSound?.();
    }
    tween(node).stop();
    tween(node).to(0.08, { scale: new Vec3(baseScale, baseScale, 1) }).start();
  };
  node.on(Node.EventType.TOUCH_END, () => release(true), eventTarget);
  node.on(Node.EventType.TOUCH_CANCEL, () => release(false), eventTarget);
}

export function clearNodeChildren(parent: Node): void {
  const children = parent.children.slice();
  for (const child of children) {
    if (child.isValid) {
      child.destroy();
    }
  }
}

export function createCircleNode(
  name: string,
  parent: Node,
  x: number,
  y: number,
  diameter: number,
  color: Color,
): Node {
  const node = createNode(name, parent, x, y, diameter, diameter);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  graphics.strokeColor = new Color(24, 63, 54, 220);
  graphics.lineWidth = 6;
  graphics.circle(0, 0, diameter * 0.5);
  graphics.fill();
  graphics.stroke();
  return node;
}

export function createRectNode(
  name: string,
  parent: Node,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Color,
): Node {
  const node = createNode(name, parent, x, y, width, height);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = color;
  graphics.rect(-width * 0.5, -height * 0.5, width, height);
  graphics.fill();
  return node;
}

export function createTextButton(
  name: string,
  parent: Node,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  onButtonSound?: () => void,
  target?: unknown,
): Node {
  const eventTarget = target ?? parent;
  const button = createRectNode(name, parent, x, y, width, height, new Color(114, 228, 178, 230));
  const graphics = button.getComponent(Graphics);
  if (graphics) {
    graphics.strokeColor = new Color(25, 67, 57, 240);
    graphics.lineWidth = 6;
    graphics.stroke();
  }
  button.addComponent(Button);
  createLabel(`${name}Text`, button, text, 0, 0, fontSize, new Color(55, 38, 24, 255), 2);
  button.on(
    Node.EventType.TOUCH_START,
    () => {
      tween(button).stop();
      tween(button).to(0.05, { scale: new Vec3(0.94, 0.94, 1) }).start();
    },
    eventTarget,
  );
  const releaseButton = (playSound: boolean) => {
    if (playSound) {
      onButtonSound?.();
    }
    tween(button).stop();
    tween(button).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
  };
  button.on(Node.EventType.TOUCH_END, () => releaseButton(true), eventTarget);
  button.on(Node.EventType.TOUCH_CANCEL, () => releaseButton(false), eventTarget);
  return button;
}

export function createLabel(
  name: string,
  parent: Node,
  text: string,
  x: number,
  y: number,
  size: number,
  color: Color,
  outlineWidth = 4,
  width = 520,
  align = Label.HorizontalAlign.CENTER,
): Label {
  const node = createNode(name, parent, x, y, width, size + 24);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = size;
  label.lineHeight = size + 10;
  label.color = color;
  label.useSystemFont = true;
  label.fontFamily = 'Arial Black';
  label.isBold = true;
  label.horizontalAlign = align;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  label.outlineColor = new Color(0, 0, 0, 245);
  label.outlineWidth = outlineWidth;
  return label;
}

export function createPanel(parent: Node, x: number, y: number, width: number, height: number, color: Color): Node {
  const node = createNode('Panel', parent, x, y, width, height);
  const sprite = node.addComponent(Sprite);
  sprite.color = color;
  return node;
}

export function getFittedSpriteHeight(frame: SpriteFrame, targetWidth: number): number {
  const texture = frame.texture;
  if (!texture || !texture.width) {
    return targetWidth * 3;
  }
  return targetWidth * (texture.height / texture.width);
}

export function getSpriteSizeForWidth(frame: SpriteFrame, targetWidth: number): { width: number; height: number } {
  const texture = frame.texture;
  if (!texture || !texture.width) {
    return {
      width: targetWidth,
      height: targetWidth,
    };
  }
  return {
    width: targetWidth,
    height: targetWidth * (texture.height / texture.width),
  };
}

export function isBackgroundTileVisible(centerY: number, tileHeight: number, designHeight: number): boolean {
  const halfTile = tileHeight * 0.5;
  const halfScreen = designHeight * 0.5;
  return centerY + halfTile >= -halfScreen && centerY - halfTile <= halfScreen;
}
