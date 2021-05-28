import "./jsxTyping";
import * as Pixi from "pixi.js";
import color from "color";

import {
  PrebuiltComponents,
  PrebuiltComponentsDefaultProps as DefaultProps,
} from "./PrebuiltComponents";

let app: Pixi.Application;
let stage: Pixi.Container;

function createGameApp(component: Component): Pixi.Application {
  const app = new Pixi.Application({
    width: component.props.width || 450,
    height: component.props.height || 650,
  });
  return app;
}

function getGameApp(): Pixi.Application {
  return app;
}

function drawTextNode(text: string, textComponent: Component) {
  const { props } = textComponent;
  const textGraphic = new Pixi.Text(text);
  textGraphic.position.x = props.x;
  textGraphic.position.y = props.y;
  stage.addChild(textGraphic);
}

type DrawerFn = (component: Component) => void;
function PixiComponentDrawer() {
  const drawCanvas: DrawerFn = (component) => {
    const currentCanvas = getGameApp();
    if (!currentCanvas) {
      app = createGameApp(component);
      stage = app.stage;
      document.getElementById("root")!.appendChild(app.view);
    }
  };

  const drawBackground: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Background, ...props };
    const graphic = new Pixi.Graphics();
    graphic.beginFill(color(props.background).rgbNumber());
    graphic.drawRect(0, 0, app.view.width, app.view.height);
    graphic.endFill();
    app.stage.addChild(graphic);
  };

  const drawText: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Text, ...props };
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

    const graphic = new Pixi.Graphics();
    graphic.beginFill(
      color(props.fillStyle).rgbNumber() || color("transparent").rgbNumber()
    );
    graphic.drawRect(props.x, props.y, props.width, props.height);
    if (props.strokeStyle) {
      graphic.lineStyle(props.lineWidth, color(props.strokeStyle).rgbNumber());
    }
    graphic.endFill();
    stage.addChild(graphic);
  };
  const drawCircle: DrawerFn = (component) => {
    let { props = {} } = component;
    props = { ...DefaultProps.Box, ...props };
    const graphic = new Pixi.Graphics();
    graphic.beginFill(
      color(props.fillStyle).rgbNumber() || color("transparent").rgbNumber()
    );
    graphic.drawCircle(props.x, props.y, props.size / 2);
    if (props.strokeStyle) {
      graphic.lineStyle(
        props.lineWidth,
        color(props.strokeStyle).rgbNumber(),
        1
      );
    }
    graphic.endFill();
    stage.addChild(graphic);
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

const PixiDrawer = PixiComponentDrawer();

function clearGameApp() {
  if (stage) {
    stage.removeChildren();
  }
}

export { PixiDrawer, getGameApp, clearGameApp };
