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

function createComponentSystem() {
  let lastComponentId = 0;
  let Components = {};

  const resetComponentHash = () => {
    lastComponentId = 0;
    Components = {};
  };

  const updateComponentTree = (componentTree) => {
    Components = componentTree;
  };

  const updateComponentWithId = (componentId, newComponent) => {
    Components[componentId] = newComponent;
  };

  const addComponent = (newComponent) => {
    Components[lastComponentId] = newComponent;
    lastComponentId += 1;
  };

  const getComponentTree = () => Components;
  const getComponentWithId = (componentId) => Components[componentId];
  const getLastComponentId = () => lastComponentId;

  return {
    resetComponentHash,
    updateComponentTree,
    updateComponentWithId,
    addComponent,
    getComponentTree,
    getComponentWithId,
    getLastComponentId,
  };
}

const {
  resetComponentHash,
  updateComponentTree,
  updateComponentWithId,
  addComponent,
  getComponentTree,
  getComponentWithId,
  getLastComponentId,
} = createComponentSystem();

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
  if (type && (type as Component).type) {
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
    componentId: getLastComponentId(),
    type,
    props: {
      ...preparedProps,
      ...preparedProps.props,
    },
  };
  addComponent(component);
  return component;
}

type CleanupEffectFn = () => void | undefined;
type EffectFn = () => CleanupEffectFn | void;

function createUseMemo(): [
  (
    value: (...args: any[]) => any,
    dependency: any[]
  ) => ReturnType<typeof value>,
  () => void
] {
  const memoizedDependency = {};
  const memoizedValue = {};
  let lastMemoId = -1;
  const resetMemoId = () => {
    lastMemoId = -1;
  };
  const useMemo = (value: (...args: any[]) => any, dependency: any[]) => {
    if (!Array.isArray(dependency)) {
      throw new Error(`Dependency should be an array`);
    }
    // if (typeof value() === "function") {
    //   return value();
    // }
    lastMemoId += 1;

    const currentEffectMemoizedDependency = memoizedDependency[lastMemoId];
    // current effect not found. set and update lastMemoid
    if (!currentEffectMemoizedDependency) {
      memoizedDependency[lastMemoId] = dependency;
      const returnedValue = value();
      memoizedValue[lastMemoId] = returnedValue;
      return returnedValue;
    }
    if (dependency.length !== currentEffectMemoizedDependency.length) {
      throw new Error(
        "Dependency cannot have dynamic size and must be same every render"
      );
    }
    const isSameDependency = dependency.every(
      (dep, i) => dep === currentEffectMemoizedDependency[i]
    );

    if (isSameDependency) {
      return memoizedValue[lastMemoId];
    }
    memoizedValue[lastMemoId] = value();
    memoizedDependency[lastMemoId] = dependency;
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
  let lastEffectId = -1;
  const resetEffectId = () => {
    lastEffectId = -1;
  };

  const useEffect = (effect: EffectFn, dependency: any[]) => {
    if (!Array.isArray(dependency)) {
      throw new Error(`Dependency should be an array`);
    }
    lastEffectId += 1;
    const currentEffect = Effects[lastEffectId];
    const currentEffectDependency = EffectDependencies[lastEffectId];
    if (!currentEffect) {
      // set effect
      Effects[lastEffectId] = effect;
      // set deps
      EffectDependencies[lastEffectId] = dependency;
      // run last effect and set return value as cleanup function
      CleanupFunctions[lastEffectId] = Effects[lastEffectId]();
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

type UseStateReturn<State = any> = [
  State,
  (stateUpdater: StateUpdater<State>) => void
];
type StateUpdater<State> = State | ((newState: State) => State);

type UseStateFn = <State = any>(initialState?: State) => UseStateReturn;
function createUseState(): [UseStateFn, () => void] {
  const States: Record<string, { id: number; value: any }> = {};
  let lastStateId = -1;

  const resetLastStateId = () => {
    lastStateId = -1;
  };

  function createSetState<State = any>(stateId) {
    return (stateUpdater: StateUpdater<State>) => {
      if (typeof stateUpdater === "function") {
        States[stateId].value = (stateUpdater as Function)(
          States[stateId].value
        );
        return;
      }
      States[stateId].value = stateUpdater;
    };
  }

  function useState<State = any>(initialState?: State): UseStateReturn {
    lastStateId += 1;
    // console.log(lastStateId, initialState, "state");
    const setState = createSetState(lastStateId);

    // initial State
    if (!States[lastStateId]) {
      console.log("initial");
      States[lastStateId] = {
        id: lastStateId,
        value: initialState,
      };
    }

    // console.log(lastStateId, States[lastStateId].value, "returned");

    return [States[lastStateId].value, setState];
  }

  return [useState, resetLastStateId];
}

const [useEffect, resetEffecthash] = createUseEffect();
const [useMemo, resetMemoHash] = createUseMemo();
const [useState, resetStateHash] = createUseState();
const useCallback = (fn: (...args: any[]) => void, dependency: any[]) =>
  useMemo(() => fn, dependency);

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
  renderLoop(component);
}

function startGame(component: () => Component) {
  function gameLoop() {
    clearCanvas();
    resetComponentHash();
    resetEffecthash();
    resetMemoHash();
    resetStateHash();
    render(component());
    // setInterval(gameLoop, 1000);
  }
  setInterval(gameLoop, 2000);
}

export { startGame, useEffect, useState, createElement, useMemo, useCallback };
let Redraw;
Redraw = (window as any).Redraw = {
  createElement,
};
export default Redraw;
