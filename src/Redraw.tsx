import "./jsxTyping";
import {
  PrebuiltComponents,
  PrebuiltComponentsDefaultProps as DefaultProps,
} from "./PrebuiltComponents";

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
let Components = {};

function setLastComponentId(componentId: number) {
  lastComponentId = componentId;
}

function getLastComponentId(): number {
  return lastComponentId;
}

const ComponentStates: Record<string, any[]> = {};

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

function resetComponent() {
  Components = {};
}

function createUseMemo(): [
  (
    value: (...args: any[]) => any,
    dependency: any[]
  ) => ReturnType<typeof value>,
  () => void
] {
  const memoizedDependency = {};
  const memoizedValue = {};
  let lastMemoId = 0;
  const resetMemoId = () => {
    lastComponentId = 0;
  };
  const useMemo = (value: (...args: any[]) => any, dependency: any[]) => {
    if (!Array.isArray(dependency)) {
      throw new Error(`Dependency should be an array`);
    }
    const currentEffectMemoizedDependency = memoizedDependency[lastMemoId];
    // current effect not found. set and update lastMemoid
    if (!currentEffectMemoizedDependency) {
      memoizedDependency[lastMemoId] = dependency;
      memoizedValue[lastMemoId] = value();
      lastMemoId += 1;
      return memoizedValue[lastMemoId];
    }
    if (dependency.length !== currentEffectMemoizedDependency.length) {
      throw new Error(
        "Dependency cannot have dynamic size and must be same every render"
      );
    }
    let isSameDependency = true;
    for (let i = 0; i < dependency.length; i += 1) {
      if (dependency[i] !== currentEffectMemoizedDependency[i]) {
        isSameDependency = false;
        break;
      }
    }
    if (isSameDependency) {
      return memoizedValue[lastMemoId];
    }
    memoizedValue[lastMemoId] = value();
    return memoizedValue[lastMemoId];
  };

  return [useMemo, resetMemoId];
}

function createUseEffect(): [
  (effect: EffectFn, dependency: any[]) => void,
  () => void
] {
  const Effects = {};
  const EffectDependencies = {};
  const CleanupFunctions = {};
  let lastEffectId = 0;
  const resetEffectId = () => {
    lastEffectId = 0;
  };

  const useEffect = (effect: EffectFn, dependency: any[]) => {
    if (!Array.isArray(dependency)) {
      throw new Error(`Dependency should be an array`);
    }
    const currentEffect = Effects[lastEffectId];
    const currentEffectDependency = EffectDependencies[lastEffectId];
    if (!currentEffect) {
      // set effect
      Effects[lastEffectId] = effect;
      // set deps
      EffectDependencies[lastEffectId] = dependency;
      // run last effect and set return value as cleanup function
      CleanupFunctions[lastEffectId] = Effects[lastEffectId]();
      lastEffectId += 1;
      return;
    }

    // checking dependency
    if (dependency.length !== currentEffectDependency.length) {
      throw new Error(
        "Dependency cannot have dynamic size and must be same every render"
      );
    }
    let isSameDependency = true;
    for (let i = 0; i < dependency.length; i += 1) {
      if (dependency[i] !== currentEffectDependency[i]) {
        isSameDependency = false;
        break;
      }
    }
    if (isSameDependency) {
      // if dependency is the same, dont run function
      return;
    }
    // run cleanup function first
    if (typeof CleanupFunctions[lastEffectId] === "function") {
      CleanupFunctions[lastEffectId]();
    }
    EffectDependencies[lastEffectId] = dependency;
    Effects[lastEffectId] = effect;
    CleanupFunctions[lastEffectId] = Effects[lastEffectId]();
  };

  return [useEffect, resetEffectId];
}

function createUseState(): [] {
  const States: Record<string, { id: number; value: any }> = {};
  let lastStateId = 0;

  const resetLastStateId = () => {
    lastStateId = 0;
  };

  function useState<State = any>(initialState?: State): UseStateReturn {
    const setState = (stateUpdater: StateUpdater<State>) => {
      if (typeof stateUpdater === "function") {
        const lastState: State = States[lastStateId]
          ? States[lastStateId]
          : initialState;
        States[lastStateId] = (stateUpdater as Function)(lastState);
        return;
      }
      States[lastStateId] = stateUpdater;
    };

    // initial State
    if (!States[lastStateId]) {
      States[lastStateId] = {
        id: lastStateId,
        value: initialState,
      };
    }

    return [States[lastStateId], setState];
  }

  return [useState, lastStateId];
}

const [useEffect, resetEffecthash] = createUseEffect();
const [useMemo, resetMemoHash] = createUseMemo();
const useState = createUseState();
const useCallback = (fn: (...args: any[]) => void, dependency: any[]) =>
  useMemo(fn, dependency);

type StateUpdater<State> = State | ((newState: State) => State);
type UseStateReturn<State = any> = [
  State,
  (stateUpdater: StateUpdater<State>) => void
];

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
        } else {
          throw new Error("text component can only render string or number");
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
const getDrawFn = (componentType: string) => {
  return CanvasDrawer[componentType] || undefined;
};

function drawComponent(component: Component) {
  // const componentEff = getEffect(component.componentId);
  const drawFn = getDrawFn(component.type as string);
  if (drawFn) {
    drawFn(component);
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
  renderLoop(component);
}

function startGame(component: () => Component) {
  function gameLoop() {
    clearCanvas();
    resetComponent();
    resetEffecthash();
    resetMemoHash();
    render(component());
    // setInterval(gameLoop, 1000);
  }
  setInterval(gameLoop, 1000);
}

export { startGame, useEffect, useState, createElement, useMemo };
let Redraw;
Redraw = (window as any).Redraw = {
  createElement,
};
export default Redraw;
