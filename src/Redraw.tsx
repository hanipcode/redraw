import "./jsxTyping";
import { clearCanvas, CanvasDrawer } from "./CanvasDrawer";
import { world } from "./physics";

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

type fun<T> = (...args: any[]) => T;
function createUseMemo(): [
  <T>(value: fun<T>, dependency: any[]) => T,
  () => void
] {
  const memoizedDependency = {};
  const memoizedValue = {};
  let lastMemoId = -1;
  const resetMemoId = () => {
    lastMemoId = -1;
  };
  function useMemo<T>(value: fun<T>, dependency: any[], key?: string): T {
    if (!Array.isArray(dependency)) {
      throw new Error(`Dependency should be an array`);
    }
    let usedKey;
    if (!key) {
      lastMemoId += 1;
      usedKey = lastMemoId;
    } else {
      usedKey = key;
    }

    const currentEffectMemoizedDependency = memoizedDependency[usedKey];
    // current effect not found. set and update usedKey
    if (!currentEffectMemoizedDependency) {
      memoizedDependency[usedKey] = dependency;
      const returnedValue = value();
      memoizedValue[usedKey] = returnedValue;
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
      return memoizedValue[usedKey];
    }
    memoizedValue[usedKey] = value();
    memoizedDependency[usedKey] = dependency;
    return memoizedValue[usedKey] as ReturnType<typeof value>;
  }

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

type UseStateReturn<State> = [
  State,
  (stateUpdater: StateUpdater<State>) => void
];
type StateUpdater<State> = State | ((newState: State) => State);

type UseStateFn = <State = any>(initialState?: State) => UseStateReturn<State>;
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

  function useState<State = any>(initialState?: State): UseStateReturn<State> {
    lastStateId += 1;
    const setState = createSetState(lastStateId);

    // initial State
    if (!States[lastStateId]) {
      States[lastStateId] = {
        id: lastStateId,
        value: initialState,
      };
    }

    return [States[lastStateId].value as State, setState];
  }

  return [useState, resetLastStateId];
}

const [useEffect, resetEffecthash] = createUseEffect();
const [useMemo, resetMemoHash] = createUseMemo();
const [useState, resetStateHash] = createUseState();
const useCallback = (fn: (...args: any[]) => any, dependency: any[]) =>
  useMemo(() => fn, dependency);

export type RefType<T = any> = {
  current: T | null;
};

function createUseRef(): [<T>() => RefType<T>, () => void] {
  const Refs = {};
  let lastRefId = -1;

  const resetLastRefId = () => {
    lastRefId = -1;
  };

  function createRefObject<T>(lastRefId): RefType<T> {
    if (Refs[lastRefId]) {
      return Refs[lastRefId];
    }
    const refData: RefType<T> = {
      // @ts-ignore
      set current(data) {
        Refs[lastRefId] = data;
      },
      // @ts-ignore
      get current() {
        return Refs[lastRefId];
      },
    };
    return refData;
  }

  function useRef<T>(): RefType<T> {
    lastRefId += 1;
    const ref = createRefObject<T>(lastRefId);

    return ref;
  }

  return [useRef, resetLastRefId];
}
const [useRef, resetRefHash] = createUseRef();

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

function render(component: Component) {
  renderLoop(component);
}

function startGame(component: () => Component) {
  function gameLoop(time) {
    clearCanvas();
    resetComponentHash();
    resetEffecthash();
    resetMemoHash();
    resetStateHash();
    resetRefHash();
    render(component());
    world.step(1 / 60, time / 1000);
    requestAnimationFrame(gameLoop);
  }
  gameLoop(0);
}

export {
  startGame,
  useEffect,
  useState,
  createElement,
  useMemo,
  useCallback,
  useRef,
};
let Redraw;
Redraw = (window as any).Redraw = {
  createElement,
};
export default Redraw;
