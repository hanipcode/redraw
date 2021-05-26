import "./jsxTyping";

import {
  PrebuiltComponents,
  PrebuiltComponentsDefaultProps as DefaultProps,
} from "./PrebuiltComponents";

const InternalCanvasId = "_internalCanvasId";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

function createGameCanvas(component: Component): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = InternalCanvasId;
  canvas.width = component.props.width || 450;
  canvas.height = component.props.height || 650;
  return canvas;
}

function drawTextNode(text: string, textComponent: Component) {
  const { props } = textComponent;
  ctx.fillText(text, props.x, props.y);
}

type DrawerFn = (component: Component) => void;
function CanvasComponentDrawer() {
  const drawCanvas: DrawerFn = (component) => {
    const currentCanvas = getCanvas();
    if (!currentCanvas) {
      canvas = createGameCanvas(component);
      ctx = canvas.getContext("2d")!;
      document.getElementById("root")?.appendChild(canvas);
      return;
    }
  };
  const drawBackground: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Background, ...props };
    ctx.fillStyle = props.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  };
  const drawText: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Text, ...props };
    ctx.lineWidth = props.lineWidth;
    ctx.font = props.font;
    ctx.fillStyle = props.fillStyle;
    if (Array.isArray(component.props.children)) {
      let textStr = "";

      component.props.children.forEach((child) => {
        if (typeof child.type === "string" || typeof child.type === "number") {
          textStr += child.type;
        }
      });
      drawTextNode(textStr, component);
    }
  };
  const drawBox: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Box, ...props };
    ctx.lineWidth = props.lineWidth;

    if (props.fillStyle) {
      ctx.fillStyle = props.fillStyle;
      ctx.fillRect(props.x, props.y, props.width, props.height);
    }
    if (props.strokeStyle) {
      ctx.strokeStyle = props.strokeStyle;
      ctx.strokeRect(props.x, props.y, props.width, props.height);
    }
  };

  const drawCircle: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Box, ...props };
    ctx.lineWidth = props.lineWidth;
    if (props.fillStyle) {
      ctx.fillStyle = props.fillStyle;
      ctx.fillRect(props.x, props.y, props.width, props.height);
    }
    if (props.strokeStyle) {
      ctx.strokeStyle = props.strokeStyle;
      ctx.strokeRect(props.x, props.y, props.width, props.height);
    }
    ctx.beginPath();
    ctx.arc(props.x, props.y, props.size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };
  const Drawer: Record<keyof typeof PrebuiltComponents, DrawerFn> = {
    [PrebuiltComponents.Canvas]: drawCanvas,
    [PrebuiltComponents.Background]: drawBackground,
    [PrebuiltComponents.Text]: drawText,
    [PrebuiltComponents.Box]: drawBox,
    [PrebuiltComponents.Circle]: drawCircle,
    // no op
  };

  return Drawer;
}

const CanvasDrawer = CanvasComponentDrawer();

function getCanvas(): HTMLCanvasElement {
  const canvas: HTMLCanvasElement = document.getElementById(
    InternalCanvasId
  ) as HTMLCanvasElement;
  return canvas;
}

function clearCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

export { CanvasDrawer, getCanvas, clearCanvas };
