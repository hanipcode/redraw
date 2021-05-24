import "./jsxTyping";

interface Component {
  componentId: number;
  type: Component | Component[] | string | Function;
  props: any;
}

type ChildrenType = Component | Component[] | string | Function;
interface CreateElementParam {
  props: any;
  children?: ChildrenType;
}

let lastComponentId = 0;
let lastRenderedComponentId = 0;
let Components = {};
const ComponentStates: Record<string, any[]> = {};
type EffectDependencyType = any[];
type EffectId = number;
let ComponentEffects: Record<
  string,
  Array<[EffectFn, EffectDependencyType, EffectId]>
> = {};
const EffectDependencies: Record<EffectId, any[]> = {};
const CleanupEffectFunctions: Record<EffectId, CleanupEffectFn> = {};

function prepareProps(props) {
  if (!props) {
    // @ts-ignore
    props = {};
  }
  if (!props.props) {
    props.props = {};
  }

  if (!props.children) {
    props.children = [];
  }

  if (!props.children) {
    props.children = [];
  }
  return props;
}
function createElement(
  type: string | Function | Component,
  props?: CreateElementParam,
  ...childArg: Component[]
): Component {
  if ((type as Component).type) {
    return type as Component;
  }
  const preparedProps = prepareProps(props);
  if (Array.isArray(preparedProps.children)) {
    preparedProps.children = preparedProps.children.map((child) =>
      createElement(child)
    );
  }
  if (Array.isArray(type)) {
    const typeChild = type.map((child) => createElement(child));
    preparedProps.children = [...preparedProps.children, ...typeChild];
  }
  if (typeof preparedProps.children === "string") {
    preparedProps.children = preparedProps.children;
  }

  if (Array.isArray(childArg) && childArg.length > 0) {
    const childComp = childArg.map((child) => {
      return createElement(child);
    });
    preparedProps.children = [...preparedProps.children, ...childComp];
  }
  if (typeof type === "function") {
    return createElement(type(preparedProps));
  }
  const component = {
    componentId: lastComponentId,
    type,
    props: {
      ...preparedProps,
      ...preparedProps.props,
    },
  };
  Components[lastComponentId] = component;
  lastComponentId += 1;
  return component;
}

function setComponentStates(componentId: number, state: any, stateId: number) {
  if (!ComponentStates[componentId]) {
    ComponentStates[componentId] = [];
  }
  ComponentStates[componentId][stateId] = state;
}

type CleanupEffectFn = () => void | undefined;
type EffectFn = () => CleanupEffectFn | void;

function setEffect(
  componentId: number,
  effectData: [EffectFn, EffectDependencyType, EffectId]
) {
  if (!ComponentEffects[componentId]) {
    ComponentEffects[componentId] = [];
  }
  ComponentEffects[componentId].push(effectData);
}

function setEffectDependencies(effectId: EffectId, dependencies: any[]) {
  EffectDependencies[effectId] = dependencies;
}

function getEffect(
  componentId
): Array<[EffectFn, EffectDependencyType, EffectId]> {
  return ComponentEffects[componentId] || [];
}

function useEffect(effect: EffectFn, dependencies: any[]) {
  if (!Array.isArray(dependencies)) {
    throw new Error(
      `You are using useEffect in ${Components[lastComponentId].type} without dependencies of type Array!`
    );
  }
  const currentEffects = getEffect(lastComponentId);
  setEffect(lastComponentId, [effect, dependencies, currentEffects.length]);
}

function resetComponent() {
  Components = {};
}

function runEffectCleanups() {
  ComponentEffects = {};
}

function processEffect(componentId) {
  const effects = getEffect(componentId);
  if (Array.isArray(effects) && effects.length > 0) {
    effects.forEach(([effectFn, dependency, effectId]) => {
      const effectDependencies = EffectDependencies[effectId];
      // if !effectDependencies mean initial
      if (!effectDependencies) {
        const cleanupEffectFn = effectFn();
        setEffectDependencies(effectId, dependency);
        if (typeof cleanupEffectFn === "function") {
          CleanupEffectFunctions[effectId] = cleanupEffectFn;
        }
        return;
      }
      if (dependency.length !== effectDependencies.length) {
        throw new Error(
          `Dependencies effect cannot be dynamic. check ${Components[componentId].type}`
        );
      }
      let isSameDependency = true;
      for (let i = 0; i < dependency.length; i++) {
        if (dependency[i] === effectDependencies[i]) {
          isSameDependency = false;
        }
      }
      if (!isSameDependency) {
        // run previous cleanup
        if (CleanupEffectFunctions[effectId]) {
          CleanupEffectFunctions[effectId]();
        }
        effectFn();
      }
    });
  }
}

function useState(initialState: any) {
  const stateId = ComponentStates[lastComponentId]
    ? ComponentStates[lastComponentId].length - 1
    : 0;
  const currentState = ComponentStates[lastComponentId]
    ? ComponentStates[lastComponentId][stateId]
    : initialState;
  // if state still empty for this component
  if (!ComponentStates[lastComponentId]) {
    ComponentStates[lastComponentId] = [];
  }
  // initState
  if (ComponentStates[lastComponentId][stateId] === undefined) {
    setComponentStates(lastComponentId, initialState, stateId);
  }
  const setState = (stateUpdater) => {
    if (typeof stateUpdater === "function") {
      const lastState = ComponentStates[lastComponentId]
        ? ComponentStates[lastComponentId][stateId]
        : initialState;
      setComponentStates(lastComponentId, stateUpdater(lastState), stateId);
      return;
    }
    setComponentStates(lastComponentId, stateUpdater, stateId);
  };
  return [currentState, setState];
}

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
  const offsetY = textComponent.props.offset
    ? textComponent.props.offset + 30
    : 30;
  ctx.fillText(text, 10, offsetY);
}

function drawComponent(component: Component) {
  const { props = {} } = component;
  // const componentEff = getEffect(component.componentId);
  processEffect(component.componentId);
  if (component.type === "canvas") {
    const currentCanvas = getCanvas();
    if (!currentCanvas) {
      canvas = createGameCanvas(component);
      ctx = canvas.getContext("2d")!;
      document.getElementById("root")?.appendChild(canvas);
      return;
    }
  }
  if (component.type === "background") {
    ctx.fillStyle = props.background || "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (component.type === "text") {
    ctx.font = props.font || "16px Arial";
    ctx.fillStyle = props.fillStyle || "#000";
    if (Array.isArray(component.props.children)) {
      let textStr = "";

      component.props.children.forEach((child) => {
        if (typeof child.type === "string" || typeof child.type === "number") {
          textStr += child.type;
        } else {
          throw new Error("text component can only render string or number");
        }
      });
      drawTextNode(textStr, component);
    }
    return;
  }
}

function handleChildren(children: Component) {
  if ((children as Component).type) {
    drawComponent(children as Component);
  }
  // render if single child
  if ((children as Component).type) {
    renderLoop(children as Component);
  }
  if (Array.isArray(children)) {
    children.forEach(renderLoop);
  }
}
function renderLoop(component: Component) {
  const { props = {} } = component;
  lastRenderedComponentId += 1;
  drawComponent(component);
  // recurse child
  if (Array.isArray(props.children) && props.children.length > 0) {
    handleChildren(props.children);
  }
}

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

function render(component: Component) {
  lastComponentId = 0;
  lastRenderedComponentId = 0;
  renderLoop(component);
}

function Background(props) {
  return createElement("background", {
    props,
  });
}

function GameCanvas(props) {
  return createElement("canvas", { props });
}

function Text(props) {
  return createElement("text", { props });
}

function startGame(component: () => Component) {
  function gameLoop() {
    clearCanvas();
    resetComponent();
    runEffectCleanups();
    render(component());
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}

export { startGame, GameCanvas, Background, useEffect, useState, Text };
let Redraw;
Redraw = (window as any).Redraw = {
  createElement,
};
export default Redraw;
