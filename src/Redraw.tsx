import "./jsxTyping";
import { clearCanvas, CanvasDrawer } from "./CanvasDrawer";

type ChildrenType = Component | Component[] | string | Function;
interface CreateElementParam {
  props: any;
  children?: ChildrenType;
}

interface Vector2 {
  x: number;
  y: number;
}

interface CollisionBox {
  min: Vector2;
  max: Vector2;
}
type CollisionId = number;
type CollisionArray = [CollisionId, CollisionBox, CollisionDetail];
interface CollisionDetail {
  name: string;
}

interface IntersectData {
  isIntersect: boolean;
  distance: Vector2;
}
type CollisionEventHandler = (event: CollisionEventData) => void;

type Distance = Vector2;
type CollisionEventData = [CollisionArray, CollisionArray, Distance];
const CollisionBoxType = {
  Box: "Box",
  Circle: "Circle",
} as const;
interface UseCollisionParam {
  collisionName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: keyof typeof CollisionBoxType;
  velocity: Vector2;
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

const getCollisionBoxFromVelocity = (velocity: Vector2): CollisionBox => {
  let minX;
  let minY;
  let maxX;
  let maxY;
  if (velocity.y > 0) {
    maxY = velocity.y;
    minY = 0;
  } else {
    minY = velocity.y;
    maxY = 0;
  }
  if (velocity.x > 0) {
    maxX = velocity.x;
    minX = 0;
  } else {
    minX = velocity.x;
    maxX = 0;
  }
  return {
    min: {
      x: minX,
      y: minY,
    },
    max: {
      x: maxX,
      y: maxY,
    },
  };
};

type UseCollisionFn = (param: UseCollisionParam) => {
  checkCollidedWith: (
    collisionData: CollisionEventData[] | null,
    collisionName: string
  ) => CollisionEventData[];
  isCollided: boolean;
  collidedData: CollisionEventData[] | null;
  collisionBox: CollisionBox;
};
function createUseCollision(): [UseCollisionFn, () => void, () => void] {
  const CollisionBoxes: CollisionArray[] = [];
  let CollidedComponents: Record<number, CollisionEventData[]> = {};
  let lastCollisionBoxId: number = -1;

  const resetLastCollisionBoxId = () => {
    lastCollisionBoxId = -1;
  };
  const calculateCollisionOffset = (
    collisionBox1: CollisionBox,
    collisionBox2: CollisionBox
  ): CollisionBox => {
    return {
      min: {
        x: collisionBox1.min.x + collisionBox2.min.x,
        y: collisionBox1.min.y + collisionBox2.min.y,
      },
      max: {
        x: collisionBox1.max.x + collisionBox2.max.x,
        y: collisionBox1.max.y + collisionBox2.max.y,
      },
    };
  };

  const getComponentCollisionBody = ({
    x,
    y,
    width,
    height,
    type,
  }): CollisionBox => {
    // circle
    if (type === CollisionBoxType.Circle) {
      return {
        min: {
          x: x - width / 2,
          y: y - height / 2,
        },
        max: {
          x: x + width / 2,
          y: y + height / 2,
        },
      };
    }

    return {
      min: {
        x,
        y,
      },
      max: {
        x: x + width,
        y: y + height,
      },
    };
  };

  function getMinCollisionBoxPoint(collisionBox: CollisionBox): Vector2 {
    return {
      x: collisionBox.min.x,
      y: collisionBox.min.y,
    };
  }

  function minCollisionArrayCompare(
    collisionArr1: CollisionArray,
    collisionArr2: CollisionArray
  ) {
    return minCollisionBox(collisionArr1[1], collisionArr2[1]);
  }

  function minCollisionBox(
    collisionBox1: CollisionBox,
    collisionBox2: CollisionBox
  ) {
    const minCollisionBox1 = getMinCollisionBoxPoint(collisionBox1);
    const minCollisionBox2 = getMinCollisionBoxPoint(collisionBox2);
    const { x: x1, y: y1 } = minCollisionBox1;
    const { x: x2, y: y2 } = minCollisionBox2;
    const factorM1 = Math.sqrt(x1 * x1 + y1 * y1);
    const factorM2 = Math.sqrt(x2 * x2 + y2 * y2);
    return factorM1 - factorM2;
  }

  function isInside(collisionBox1: CollisionBox, collisionBox2: CollisionBox) {
    const widthC1 = collisionBox1.min.x + collisionBox1.max.x;
    const widthC2 = collisionBox2.min.x + collisionBox2.max.x;
    const heightC1 = collisionBox1.min.y + collisionBox1.max.y;
    const heightC2 = collisionBox2.min.y + collisionBox2.max.y;

    if (widthC1 < widthC2 && heightC1 < heightC2) {
      return true;
    }
    return false;
  }

  function isIntersect(
    collisionBox1: CollisionBox,
    collisionBox2: CollisionBox
  ) {
    const d1x = collisionBox2.min.x - collisionBox1.max.x;
    const d1y = collisionBox2.min.y - collisionBox1.max.y;
    const d2x = collisionBox1.min.x - collisionBox2.max.x;
    const d2y = collisionBox1.min.y - collisionBox2.max.y;

    if (d1x > 0 || d1y > 0) {
      return false;
    }

    if (d2x > 0 || d2y > 0) {
      return false;
    }
    return true;
  }

  function checkCollision(
    collisionBox1: CollisionBox,
    collisionBox2: CollisionBox
  ): IntersectData {
    const isCurrentlyIntersect = isIntersect(collisionBox1, collisionBox2);
    const distanceX = Math.abs(collisionBox1.min.x - collisionBox2.max.x);
    const distanceY = Math.abs(collisionBox1.min.y - collisionBox2.max.y);
    const distance: Vector2 = {
      x: distanceX,
      y: distanceY,
    };
    return {
      isIntersect: isCurrentlyIntersect,
      distance,
    };
  }

  function processCollision() {
    const collisions = CollisionBoxes;
    const sortedCollisions = collisions.sort(minCollisionArrayCompare);
    const collidedComponents: CollisionEventData[] = [];
    CollidedComponents = {};

    for (let i = 1; i < sortedCollisions.length; i++) {
      const [prevCollisionId, prevCollision] = sortedCollisions[i - 1];
      const [currentCollisionId, currentCollision] = sortedCollisions[i];
      const checkCollisionData = checkCollision(
        prevCollision,
        currentCollision
      );
      if (!CollidedComponents[prevCollisionId]) {
        CollidedComponents[prevCollisionId] = [];
      }
      if (!CollidedComponents[currentCollisionId]) {
        CollidedComponents[currentCollisionId] = [];
      }
      if (checkCollisionData.isIntersect) {
        CollidedComponents[currentCollisionId].push([
          sortedCollisions[i],
          sortedCollisions[i - 1],
          checkCollisionData.distance,
        ]);
      }
    }
    return collidedComponents;
  }
  const checkCollidedWith = (
    collided: CollisionEventData[] | null,
    collisionName: string
  ): CollisionEventData[] | null => {
    if (!collided) return null;
    const collidedWithNames = collided.filter((collisionData) => {
      const [, collisionTarget] = collisionData;
      const [, , collisionTargetDetail] = collisionTarget;
      return collisionTargetDetail.name === collisionName;
    });
    if (collidedWithNames.length < 1) {
      return null;
    }
    return collidedWithNames;
  };

  const useCollision = (param: UseCollisionParam) => {
    lastCollisionBoxId += 1;
    const { collisionName } = param;
    const bodyCollisionBox = getComponentCollisionBody({
      x: param.x,
      y: param.y,
      width: param.width,
      height: param.height,
      type: param.type,
    });
    const velocityCollisionBox = getCollisionBoxFromVelocity(param.velocity);
    const collisionBox = calculateCollisionOffset(
      bodyCollisionBox,
      velocityCollisionBox
    );
    const collisionDetail: CollisionDetail = { name: collisionName };
    CollisionBoxes[lastCollisionBoxId] = [
      lastCollisionBoxId,
      collisionBox,
      collisionDetail,
    ];
    let collidedData: CollisionEventData[] | null = null;
    if (
      CollidedComponents[lastCollisionBoxId] &&
      CollidedComponents[lastCollisionBoxId].length > 0
    ) {
      collidedData = CollidedComponents[lastCollisionBoxId];
    }
    const isCollided = Array.isArray(collidedData) && collidedData.length > 0;
    return {
      collidedData,
      checkCollidedWith,
      isCollided,
      collisionBox: bodyCollisionBox,
    };
  };
  // @ts-ignore
  return [useCollision, resetLastCollisionBoxId, processCollision];
}

const [useCollision, resetCollisionHash, processCollision] =
  createUseCollision();
const [useEffect, resetEffecthash] = createUseEffect();
const [useMemo, resetMemoHash] = createUseMemo();
const [useState, resetStateHash] = createUseState();
const useCallback = (fn: (...args: any[]) => void, dependency: any[]) =>
  useMemo(() => fn, dependency);

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
    resetCollisionHash();
    processCollision();
    render(component());
    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}

export {
  startGame,
  useEffect,
  useState,
  createElement,
  useMemo,
  useCallback,
  useCollision,
};
let Redraw;
Redraw = (window as any).Redraw = {
  createElement,
};
export default Redraw;
