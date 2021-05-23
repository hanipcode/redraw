import "./index.css";
import { nanoid } from "nanoid";
import produce, { current } from "immer";
import merge from "deepmerge";
import _, { create, first, initial } from "lodash";

/*
 * Documentation: Constants
 */
const COLLISION_DATA: CollisionMap = {};
const SCHEDULED_SETSTATE: Record<string, InitialState[]> = {};
const SCHEDULED_CHILDREN_UPDATE: Record<string, Component[] | null> = {};
const COMPONENT_UPDATE_HANDLER: Record<string, ComponentUpdateHandler[]> = {};
const TIME: TIME = {
  deltaTime: 0,
};
const noop = (...args: any[]) => {};

const Components: Record<string, Component<InitialState>> = {};

const EventByComponents: Record<string, boolean> = {};

const ControllerKey = {
  keyboardLeft: "ArrowLeft",
  keyboardRight: "ArrowRight",
} as const;

const EventNames = {
  keyup: "keyup",
  keydown: "keydown",
} as const;

const CollisionBoxType = {
  Box: "Box",
  Circle: "Circle",
} as const;

/*
 * Documentation: Typings
 */
type ControllerKeyKeys = keyof typeof ControllerKey;
type ControllerKeyValues = typeof ControllerKey[ControllerKeyKeys];
type EventKeyKeys = keyof typeof EventNames;
type EventKeyValues = typeof EventNames[EventKeyKeys];
type GameEventHandler<Param = any> = (param: Param) => void;
type CollisionArray = [string, CollisionBox, CollisionDetail];
type AllCollisionData = Array<CollisionArray>;
type Distance = Vector2;
type CollidedCollisionDatas = CollidedCollisionData[];
type CollidedCollisionData = [CollisionArray, CollisionArray, Distance];
type CollisionMap = Record<string, CollisionArray>;

interface IntersectData {
  isIntersect: boolean;
  distance: Vector2;
}

type GameEventListener<Param = any> = [
  eventKey: EventKeyValues,
  param: Param,
  handler: (...args: any) => void
];

interface StatefulData<State = GivenState> {
  componentId: string;
  setState: (state: State) => State;
  getState: () => State;
  getComponent: () => Component;
  updateChildren: (newChildren: Component[]) => void;
  getChildren: () => Component[];
}

type CollisionTypeKey = keyof typeof CollisionBoxType;
type CollisionType = typeof CollisionBoxType[CollisionTypeKey];
interface CollisionDetail {
  type: CollisionType;
  onCollision?: CollisionEventHandler;
}

interface CollisionEventDetail {
  sourceComponent: Component;
  targetComponent: Component;
  distance: Vector2;
}

type CollisionEventHandler = (event: CollisionEventDetail) => void;

interface TIME {
  deltaTime: number;
}

type DrawFunction<State = any> = (
  component: Component<CombinedState<State>>,
  game: Game
) => void;

interface Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  components: Component[];
  isInitiated: boolean;
  rootHtmlElement: HTMLElement;
}

interface Vector2 {
  x: number;
  y: number;
}
interface BoundingBox {
  x: [number, number];
  y: [number, number];
}

interface CollisionBox {
  min: Vector2;
  max: Vector2;
}

interface GivenState {
  position: Vector2;
  width: number;
  height: number;
  physics: {
    velocity: Vector2;
  };
  style: {
    fillColor: string;
    textStyle: string;
    strokeColor: string;
    lineWidth: number;
  };
}
type CombinedState<State> = GivenState & State;
type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
// just an alias, maybe later on
// the exported type would be named State
type InitialState<State = GivenState> = RecursivePartial<State & GivenState>;

interface Component<State = any> {
  id: string;
  type: string;
  children?: Component[];
  state: CombinedState<State>;
  setState: (
    newState: RecursivePartial<CombinedState<State>>
  ) => CombinedState<State>;
  draw: DrawFunction<CombinedState<State>>;
}

interface StartParam {
  components: Component[];
  rootHtmlElement?: HTMLElement | null;
  style: {
    width: number;
    height: number;
  };
}

interface CreateComponentOption<State = any> {
  initialState?: RecursivePartial<GivenState> & State;
  draw?: DrawFunction;
  children?: Component[];
  width?: number;
  height?: number;
}

interface UseAnimatorParam {
  speed: number;
  maxSpeed: number;
  boundingBox: BoundingBox;
}

interface UseCollisionParam {
  collisionBoxes: CollisionBox;
  onCollision: CollisionEventHandler;
  collisionDetail: Partial<CollisionDetail>;
}

type InternalParam =
  | "canvas"
  | "ctx"
  | "actions"
  | "isInitiated"
  | "components";
type InitOption = Omit<Game, InternalParam> & StartParam;

// create a setState function for specific comp
function createSetState<State = GivenState>(componentId) {
  return (newState: Partial<CombinedState<State>>) => {
    if (!SCHEDULED_SETSTATE[componentId]) {
      SCHEDULED_SETSTATE[componentId] = [];
    }
    SCHEDULED_SETSTATE[componentId] = [
      ...SCHEDULED_SETSTATE[componentId],
      newState,
    ];
  };
}

/*
 * Documentation: Component Related function
 */

const getComponent = (componentId: string) => Components[componentId];

const setComponent = (componentId: string, component: Component) => {
  Components[componentId] = component;
};

function updateComponentTree(componentId: string, component: Component) {
  Components[componentId] = component;
}

/*
 * Documentation: Collision Related Founction
 */
const isComponentHaveCollision = (componentId: string) =>
  !!COLLISION_DATA[componentId];
const getComponentCollisionBox = (componentId: string) =>
  COLLISION_DATA[componentId];

const setCollisionBoxes = (collisionBoxes: CollisionArray) => {
  const componentId = collisionBoxes[0];
  COLLISION_DATA[componentId] = collisionBoxes;
};

const getAllCollisionData = (): AllCollisionData => {
  const collisionDataKey = Object.keys(COLLISION_DATA);
  const result: AllCollisionData = [];
  for (let i = 0; i < collisionDataKey.length; i++) {
    const componentId = collisionDataKey[i];
    const currentCollision = getComponentCollisionBox(componentId);
    result.push(currentCollision);
  }
  return result;
};

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

const getComponentCollisionBody = (component: Component): CollisionBox => {
  try {
    const {
      position: { x, y },
      width,
      height,
    } = component.state;
    if (typeof width !== "number" || typeof height !== "number") {
      throw new Error(
        `Width Or Height Not A Number: You use collision on component ${component.type} without defining width and height. check the component`
      );
    }
    const [_, __, collisionDetail] = getComponentCollisionBox(component.id);

    // circle
    if (collisionDetail.type === CollisionBoxType.Circle) {
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
  } catch (err) {
    debugger;
    throw err;
  }
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

const getComponentCollisionBodyWithOffset = (
  component: Component
): CollisionBox => {
  const componentCollisionBody = getComponentCollisionBody(component);
  const [_, collisionOffset] = getComponentCollisionBox(component.id);
  const collisionBodyWithOffset = calculateCollisionOffset(
    componentCollisionBody,
    collisionOffset
  );
  const velocityCollisionBox = getCollisionBoxFromVelocity(
    component.state.physics.velocity
  );
  const collisionBodyWithVelocityOffset = calculateCollisionOffset(
    collisionBodyWithOffset,
    velocityCollisionBox
  );
  return collisionBodyWithVelocityOffset;
};

const drawCollisionBound = (game: Game, component: Component): void => {
  const { ctx } = game;
  const collisionBodyWithOffset =
    getComponentCollisionBodyWithOffset(component);
  const { min, max } = collisionBodyWithOffset;
  const width = max.x - min.x;
  const height = max.y - min.y;
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 4;
  ctx.strokeRect(min.x, min.y, width, height);
};

function processCollision() {
  const collidedComponents = getComponentsCollidedWith();
  initCollisionEventFromCollidedComponents(collidedComponents);
}

function getCollidedComponent(
  sortedCollisions: AllCollisionData
): CollidedCollisionDatas {
  const collidedComponents: CollidedCollisionDatas = [];

  for (let i = 1; i < sortedCollisions.length; i++) {
    const [, prevCollision, prevCollisionDetail] = sortedCollisions[i - 1];
    const [, currentCollision, nextCollisionDetail] = sortedCollisions[i];
    // if both have no onCollision Event, omit it
    if (!prevCollisionDetail.onCollision && !nextCollisionDetail.onCollision) {
      continue;
    }
    const checkCollisionData = checkCollision(prevCollision, currentCollision);
    if (checkCollisionData.isIntersect) {
      collidedComponents.push([
        sortedCollisions[i - 1],
        sortedCollisions[i],
        checkCollisionData.distance,
      ]);
    }
  }
  return collidedComponents;
}

function getComponentsCollidedWith(): CollidedCollisionDatas {
  const collisions = getAllCollisionData();
  const collisionBodies: AllCollisionData = collisions.map(([componentId]) => {
    const component = getComponent(componentId);
    const [_, collisionBox, collisionDetail] =
      getComponentCollisionBox(componentId);
    // if collision have no component body, just use the offset directly
    if (!component) {
      return [componentId, collisionBox, collisionDetail];
    }
    return [
      componentId,
      getComponentCollisionBodyWithOffset(component),
      collisionDetail,
    ];
  });
  const sortedCollision = collisionBodies.sort(minCollisionArrayCompare);
  const collidedComponents = getCollidedComponent(sortedCollision);

  return collidedComponents;
}

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

function isIntersect(collisionBox1: CollisionBox, collisionBox2: CollisionBox) {
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
  const distanceX = Math.abs(collisionBox2.min.x - collisionBox1.max.x);
  const distanceY = Math.abs(collisionBox2.min.y - collisionBox1.max.y);
  const distance: Vector2 = {
    x: distanceX,
    y: distanceY,
  };
  return {
    isIntersect: isCurrentlyIntersect,
    distance,
  };
}

function initCollisionEventFromCollidedComponents(
  collidedData: CollidedCollisionDatas
) {
  for (let i = 0; i < collidedData.length; i++) {
    const collisionArrData: CollidedCollisionData = collidedData[i];
    const [sourceCollisionArr, targetCollisionArr, distance] = collisionArrData;
    const [sourceComponentId, _, sourceCollisionDetail] = sourceCollisionArr;
    const [targetComponentId, __, targetCollisionDetail] = targetCollisionArr;
    const sourceComponent = getComponent(sourceComponentId);
    const targetComponent = getComponent(targetComponentId);

    if (sourceCollisionDetail.onCollision) {
      sourceCollisionDetail.onCollision({
        sourceComponent,
        targetComponent,
        distance,
      });
    }
    if (targetCollisionDetail.onCollision) {
      targetCollisionDetail.onCollision({
        sourceComponent: targetComponent,
        targetComponent: sourceComponent,
        distance,
      });
    }
  }
}

function multiplyVector(vector: Vector2, factor: Vector2 | number): Vector2 {
  if (!(factor as Vector2).x && !(factor as Vector2).y) {
    return {
      x: vector.x * (factor as number),
      y: vector.y * (factor as number),
    };
  }
  return {
    x: vector.x * (factor as Vector2).x,
    y: vector.y * (factor as Vector2).y,
  };
}

/*
 * Documentation: Core Game Engine
 * This is where creating component until rendering Happened
 */

const CANVAS_INTERNAL_ID = "__canvasInternalId";

function createGameCanvas({ width, height }): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = CANVAS_INTERNAL_ID;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/*
 * Documentation: Use Canvas
 * Use canvas is used in favor of ability to get global game object
 * Use canvas itself wait for when canvas availble and then running tha canvas handler
 */
type UseCanvasHandler = (canvas: HTMLCanvasElement) => void;
function useCanvas(handler: UseCanvasHandler): void {
  let animationFrame;
  function loop() {
    const currentCanvas = document.getElementById(CANVAS_INTERNAL_ID);
    if (currentCanvas) {
      handler(currentCanvas as HTMLCanvasElement);
      cancelAnimationFrame(animationFrame);
      return;
    }
    animationFrame = requestAnimationFrame(loop);
  }
  loop();
}

function initGame(option: InitOption): Game {
  const canvas = createGameCanvas({
    width: option.style.width,
    height: option.style.height,
  });
  const ctx = canvas.getContext("2d")!;
  const { rootHtmlElement } = option;
  rootHtmlElement.appendChild(canvas);
  return {
    ...option,
    canvas,
    ctx,
    isInitiated: false,
  };
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function prepareCanvasToDrawComponent(
  component: Component<GivenState>,
  canvas: HTMLCanvasElement
) {
  const context = canvas.getContext("2d")!;
  const { style } = component.state;
  context.fillStyle = style.fillColor || context.fillStyle;
  context.font = style.textStyle || context.font;
  context.strokeStyle = style.strokeColor || context.strokeStyle;
  context.lineWidth = style.lineWidth || context.lineWidth;
}

function renderComponent(game: Game, component: Component) {
  prepareCanvasToDrawComponent(component, game.canvas);
  if (component.draw) {
    component.draw(component, game);
  }
  if (component.children && component.children.length > 0) {
    for (let i = 0; i < component.children.length; i++) {
      const childComponent = component.children[i];
      prepareCanvasToDrawComponent(childComponent, game.canvas);
      renderComponent(game, childComponent);
    }
  }
}

function renderComponents(game: Game) {
  // clear canvas before every render
  clearCanvas(game.canvas);
  for (let i = 0; i < game.components.length; i++) {
    const component = game.components[i];
    renderComponent(game, component);
  }
}

function getScheduledSetStateFor(componentId: string): InitialState[] {
  if (
    SCHEDULED_SETSTATE[componentId] &&
    SCHEDULED_SETSTATE[componentId].length > 0
  ) {
    const currentScheduledState = merge(SCHEDULED_SETSTATE[componentId], []);
    // remove the will be processed scheduled setstate
    SCHEDULED_SETSTATE[componentId] = [];
    return currentScheduledState;
  }
  return [];
}

const updateChildren = (componentId: string, newChildren: Component[]) => {
  SCHEDULED_CHILDREN_UPDATE[componentId] = [...newChildren];
};

function getScheduledChildUpdateFor(componentId: string): Component[] | null {
  if (
    SCHEDULED_CHILDREN_UPDATE[componentId] &&
    SCHEDULED_CHILDREN_UPDATE[componentId] !== null
  ) {
    const currentScheduledChildUpdate = merge(
      SCHEDULED_CHILDREN_UPDATE[componentId]!,
      []
    );
    // remove the will be processed scheduled setstate
    SCHEDULED_CHILDREN_UPDATE[componentId] = null;
    return currentScheduledChildUpdate;
  }
  return null;
}

function updateGameComponent(components: Component[]) {
  return components.map((component) => {
    let reducedComponentState = component.state;

    // Set state handler
    const scheduledSetState = getScheduledSetStateFor(component.id);
    let stateUpdated = false;
    if (scheduledSetState.length > 0) {
      reducedComponentState = scheduledSetState.reduce(
        (prevState, newState) => {
          return merge(prevState, newState);
        },
        reducedComponentState
      );
      stateUpdated = true;
    }

    // update children handler
    const updatedChildren = getScheduledChildUpdateFor(component.id);
    const children = updatedChildren ? updatedChildren : component.children;

    const newComponent = {
      ...component,
      children,
      state: reducedComponentState,
    };

    if (newComponent.children) {
      newComponent.children = updateGameComponent(newComponent.children);
    }

    updateComponentTree(component.id, newComponent);
    // if state updated return on update handler
    const updateHandler = getComponentUpdateHandler(component.id);
    if (stateUpdated && updateHandler && updateHandler.length > 0) {
      updateHandler.forEach((handler) =>
        requestAnimationFrame(() => handler(newComponent))
      );
    }
    return newComponent;
  });
}

function gameTick(game: Game) {
  function gameLoop(game: Game) {
    const t1 = performance.now();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => processCollision());
      // if not yet initiated do initial drawing and return
      if (!game.isInitiated) {
        // clear canvas
        renderComponents(game);
        gameLoop({
          ...game,
          isInitiated: true,
        });
        return;
      }

      // update state if action exist
      let gameWithNewState: Game = game;
      const newGameComponents = updateGameComponent(game.components);
      gameWithNewState = {
        ...game,
        components: newGameComponents,
      };
      renderComponents(gameWithNewState);
      const t2 = performance.now();
      TIME.deltaTime = t2 - t1;
      requestAnimationFrame(() => processCollision());

      gameLoop(gameWithNewState);
    });
  }
  gameLoop(game);
}

function start({ components, style, rootHtmlElement }: StartParam) {
  if (!rootHtmlElement) {
    throw new Error("rootHtmlElement is not found!");
  }
  const game = initGame({
    rootHtmlElement: rootHtmlElement as HTMLElement,
    components,
    style,
  });
  gameTick(game);
}

function createComponent<State = any>(
  type: string,
  option: CreateComponentOption<State> = {}
): Component<CombinedState<State>> {
  const defaultState: GivenState = {
    position: {
      x: 0,
      y: 0,
    },
    physics: {
      velocity: {
        x: 0,
        y: 0,
      },
    },
    width: 0,
    height: 0,
    style: {
      lineWidth: 1,
      fillColor: "black",
      textStyle: "16px Arial",
      strokeColor: "black",
    },
  };
  const defaultOption = {
    reducer: [],
    children: [],
  };
  const { width, height } = option;
  const combinedOption = {
    ...defaultOption,
    ...option,
    state: {
      ...defaultState,
      ...{ width, height },
      ...option.initialState,
    },
  };
  const componentId = nanoid();
  const setState = createSetState(componentId);
  const currentComponent: Component = {
    id: componentId,
    type,
    setState,
    draw: combinedOption.draw!,
    state: combinedOption.state,
    children: combinedOption.children,
  };
  // @ts-ignore
  setComponent(componentId, currentComponent);
  // @ts-ignore
  return currentComponent;
}

type StatefulFunction = (statefulData: StatefulData) => void;
type ComponentUpdateHandler = (component: Component<GivenState>) => void;
function createStatefulComponent<State = any>(
  componentParam: Component | string,
  stateHandler: StatefulFunction
): Component {
  let component: Component;
  if (typeof componentParam === "string") {
    component = createComponent(componentParam);
  } else {
    component = componentParam;
  }
  const statefulData = createStatefulData(component);

  stateHandler(statefulData);
  return component;
}

// create staetful data
function createStatefulData<State = GivenState>(
  component: Component
): StatefulData {
  const _getComponent = () => getComponent(component.id);
  const _updateChildren = (newChildren: Component[]) => {
    updateChildren(component.id, newChildren);
  };
  const _getState = () => _getComponent().state;
  const _getChildren = () => _getComponent().children!;
  return {
    componentId: component.id,
    // @ts-ignore
    setState: createSetState<State>(component.id),
    getComponent: _getComponent,
    updateChildren: _updateChildren,
    getChildren: _getChildren,
    getState: _getState,
  };
}

const setComponentUpdateHandler = (
  componentId: string,
  handler: ComponentUpdateHandler
) => {
  if (!COMPONENT_UPDATE_HANDLER[componentId]) {
    COMPONENT_UPDATE_HANDLER[componentId] = [];
  }
  COMPONENT_UPDATE_HANDLER[componentId] = [
    ...COMPONENT_UPDATE_HANDLER[componentId],
    handler,
  ];
};

const getComponentUpdateHandler = (
  componentId: string
): ComponentUpdateHandler[] => {
  return COMPONENT_UPDATE_HANDLER[componentId];
};

/*
 * Documentation: Hooks
 */

function useOnStateUpdate(
  statefulData: StatefulData,
  handler: ComponentUpdateHandler
) {
  setComponentUpdateHandler(statefulData.componentId, handler);
}

function useEvent(statefulData: StatefulData) {
  const PressedKeys: Partial<Record<ControllerKeyValues, boolean>> = {};

  let Events: GameEventListener[] = [];

  const addEventListener = <Param = any>(event: GameEventListener<Param>) => {
    Events = [...Events, event];
  };

  const keydownListener = (e: KeyboardEvent) => {
    PressedKeys[e.key] = true;
    // get event with type keydown and process it
    const event = getEventByEventNames(EventNames.keydown);
    event.forEach(processEvent);
  };
  const keyUpListener = (e: KeyboardEvent) => {
    PressedKeys[e.key] = false;
    const event = getEventByEventNames(EventNames.keyup);
    event.forEach(processEvent);
  };
  const cleanupDomListener = () => {
    if (EventByComponents[statefulData.componentId]) {
      document.removeEventListener("keydown", keydownListener);
      document.removeEventListener("keyup", keyUpListener);
      delete EventByComponents[statefulData.componentId];
    }
  };

  const addKeyDownListener = (handler: GameEventHandler<null>) => {
    addEventListener([EventNames.keydown, null, handler]);
  };

  const addKeyUpListener = (handler: GameEventHandler<null>) => {
    addEventListener([EventNames.keyup, null, handler]);
  };

  const getEventByEventNames = (
    eventName: EventKeyValues
  ): GameEventListener[] => {
    return Events.filter((event) => {
      const [currentEventname] = event;
      return eventName === currentEventname;
    });
  };

  const processEvent = (event: GameEventListener) => {
    const [_, param, handler] = event;
    handler(param);
  };

  const isNoKeyPressed = () => {
    return Object.keys(PressedKeys).every((key) => {
      return PressedKeys[key] !== true;
    });
  };

  cleanupDomListener();
  EventByComponents[statefulData.componentId] = true;
  document.addEventListener("keydown", keydownListener);
  document.addEventListener("keyup", keyUpListener);

  return {
    addEventListener,
    addKeyUpListener,
    addKeyDownListener,
    PressedKeys,
    isNoKeyPressed,
  };
}

function useAnimator(
  statefulData: StatefulData,
  param: RecursivePartial<UseAnimatorParam> = {}
) {
  const defaultParam: RecursivePartial<UseAnimatorParam> = {
    speed: 1,
    maxSpeed: Number.POSITIVE_INFINITY,
  };
  const combinedParam = {
    ...defaultParam,
    ...param,
  };
  const { boundingBox, maxSpeed } = combinedParam as UseAnimatorParam;
  let { speed } = combinedParam as UseAnimatorParam;

  let animationFrame;
  function loop() {
    let component: Component<InitialState> = statefulData.getComponent();
    if (!component) {
      stopLoop();
      return;
    }
    const { velocity: dV } = component.state.physics;

    const newPosX = component.state.position.x + dV.x;
    const newPosY = component.state.position.y + dV.y;

    // if bounding box is defined, can't move outside bounding box
    // can't move horizontally outside bounding box X if defined
    if (boundingBox) {
      if (boundingBox.x) {
        if (newPosX <= boundingBox.x[0] || newPosX >= boundingBox.x[1]) {
          dV.x = 0;
          component.setState({ physics: { velocity: dV } });
          stopLoop();
          return;
        }
      }
      // can't move vertically outside bounding box y if defined
      if (boundingBox.y) {
        if (newPosY <= boundingBox.y[0] || newPosY >= boundingBox.y[1]) {
          dV.y = 0;
          component.setState({ physics: { velocity: dV } });
          stopLoop();
          return;
        }
      }
    }

    if (dV.x > 0 || dV.x < 0) {
      dV.x *= 1 - speed * 0.001 * TIME.deltaTime;
      component.setState({
        position: { x: newPosX },
        physics: { velocity: dV },
      });
    }
    if (dV.y > 0 || dV.y < 0) {
      dV.y *= 1 - speed * 0.001 * TIME.deltaTime;
      component.setState({
        position: { y: newPosY },
        physics: { velocity: dV },
      });
    }

    animationFrame = requestAnimationFrame(loop);
  }

  const startLoop = () => {
    loop();
  };
  const stopLoop = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  };

  const animateLeft = (speedParam = speed) => {
    stopLoop();
    let component: Component<InitialState> = statefulData.getComponent();
    const { velocity: dV } = component.state.physics;
    if (dV.x > 0) {
      dV.x = 0;
    }
    dV.x -= speed * TIME.deltaTime;
    if (dV.x < maxSpeed * -1) {
      dV.x = maxSpeed * -1;
    }
    component.setState({
      physics: {
        velocity: dV,
      },
    });
    startLoop();
  };

  const animateUp = () => {
    stopLoop();
    let component: Component<InitialState> = statefulData.getComponent();
    const { velocity: dV } = component.state.physics;
    if (dV.x < 0) {
      dV.x = 0;
    }
    dV.y -= speed * TIME.deltaTime;
    if (dV.y < maxSpeed * -1) {
      dV.y = maxSpeed * -1;
    }
    component.setState({
      physics: {
        velocity: dV,
      },
    });
    startLoop();
  };

  const animateRight = () => {
    stopLoop();
    let component: Component<InitialState> = statefulData.getComponent();
    const { velocity: dV } = component.state.physics;
    if (dV.x < 0) {
      dV.x = 0;
    }
    dV.x += speed * TIME.deltaTime;
    if (dV.x > maxSpeed) {
      dV.x = maxSpeed;
    }
    component.setState({
      physics: {
        velocity: dV,
      },
    });
    startLoop();
  };

  const animateDown = () => {
    stopLoop();
    let component: Component<InitialState> = statefulData.getComponent();
    const { velocity: dV } = component.state.physics;
    dV.y += speed * TIME.deltaTime;
    if (dV.y > maxSpeed) {
      dV.y = maxSpeed;
    }
    component.setState({
      physics: {
        velocity: dV,
      },
    });
    startLoop();
  };

  const deccelerate = (factor: number | Vector2 = 0.04) => {
    let component: Component<InitialState> = statefulData.getComponent();
    let { velocity: dV } = component.state.physics;
    dV = multiplyVector(dV, factor);
    component.setState({
      physics: {
        velocity: dV,
      },
    });
  };

  const updateVelocity = (velocity: Vector2) => {
    let component: Component<InitialState> = statefulData.getComponent();
    let { velocity: dV } = component.state.physics;
    dV = velocity;
    component.setState({
      physics: {
        velocity: dV,
      },
    });
  };

  const bounce = () => {
    let component: Component<InitialState> = statefulData.getComponent();
    let { velocity: dV } = component.state.physics;
    const newDv: Vector2 = {
      x: dV.x * -1,
      y: dV.y,
    };
    component.setState({
      position: {
        x: component.state.position.x + newDv.x,
      },
      physics: {
        velocity: newDv,
      },
    });
    startLoop();
  };

  const updateSpeed = (newSpeed: number) => {
    speed = newSpeed;
  };

  const getCurrentSpeed = (): number => speed;

  return {
    updateSpeed,
    getCurrentSpeed,
    updateVelocity,
    animateLeft,
    animateRight,
    deccelerate,
    animateUp,
    animateDown,
    bounce,
  };
}

function useCollision(
  statefulData: StatefulData,
  param: Partial<UseCollisionParam> = {}
) {
  if (isComponentHaveCollision(statefulData.componentId)) {
    throw new Error(
      `Collision From component with id ${statefulData.componentId} already Exist you can only use 1 collision per component instance. most likely you define or use useCollision twice in the component function`
    );
  }
  const defaultParam: Omit<UseCollisionParam, "onCollision"> = {
    collisionBoxes: {
      min: { x: 0, y: 0 },
      max: { x: 0, y: 0 },
    },
    collisionDetail: {
      type: CollisionBoxType.Box,
    },
  };
  const combinedParam = merge(defaultParam, param) as UseCollisionParam;
  const collisionDetail: CollisionDetail = {
    ...(combinedParam.collisionDetail as CollisionDetail),
    onCollision: combinedParam.onCollision,
  };
  setCollisionBoxes([
    statefulData.componentId,
    combinedParam.collisionBoxes,
    collisionDetail,
  ]);
}

function usePhysics(
  statefulData: StatefulData,
  animatorParam: Partial<UseAnimatorParam> = {}
) {
  const animator = useAnimator(statefulData, {
    speed: 0.0098,
    boundingBox: {
      y: [0, 650],
    },
    ...animatorParam,
  });

  function gravityLoop() {
    const component = statefulData.getComponent();
    if (!component) {
      requestAnimationFrame(gravityLoop);
      return;
    }
    animator.animateDown();
    requestAnimationFrame(gravityLoop);
  }

  gravityLoop();

  return {
    ...animator,
  };
}

/*
 * Documentation: useCameraBound basically implemented
 * By creating a component with 4 component of wall as children
 * that each have a collision box of the canvas edge
 */

type CameraBoundEventHandler = (component: Component<GivenState>) => void;
interface UseCameraBoundParam {
  onCollideTop: CameraBoundEventHandler;
  onCollideLeft: CameraBoundEventHandler;
  onCollideBottom: CameraBoundEventHandler;
  onCollideRight: CameraBoundEventHandler;
}

function useCameraBound(
  statefulData: StatefulData,
  {
    onCollideBottom,
    onCollideLeft,
    onCollideRight,
    onCollideTop,
  }: UseCameraBoundParam
) {
  useCanvas((canvas) => {
    useOnStateUpdate(statefulData, (component) => {
      if (component.state.position.x < 0) {
        onCollideLeft(component);
      }
      if (component.state.position.x > canvas.width) {
        onCollideRight(component);
      }
      if (component.state.position.y < 0) {
        onCollideTop(component);
      }
      if (component.state.position.y > canvas.height) {
        onCollideBottom(component);
      }
    });
  });
}

/*
 * Documentation: Router Related Component
 */

interface Router {
  name: string;
  statefulData: StatefulData;
  Routes: RoutesType;
}
type RoutesType = Record<string, Component>;
const ROUTERS: Record<string, Router> = {};

/**
 * if Router Type is Route, it render only first or defined initial component
 * if Router Type is Component, it render all the children on initial
 */
const RouterType = {
  Route: "Route",
  Component: "Component",
} as const;

type RouterTypeKey = keyof typeof RouterType;
type RouterTypeValues = typeof RouterType[RouterTypeKey];

const setRoutes = (routeName: string, router: Router) => {
  if (ROUTERS[routeName]) {
    throw new Error(`Route name must be unique. ${routeName} is already used`);
  }
  ROUTERS[routeName] = router;
};

const getRouter = (routeName: string): Router => ROUTERS[routeName];

function Router(
  name: string,
  Routes: RoutesType,
  initialRouteNames?: string
): Component {
  const routeKeys = Object.keys(Routes);
  if (routeKeys.length === 0) {
    throw new Error(`Cannot initialize route ${name} with 0 route`);
  }
  const initialChildren = Routes[initialRouteNames!]
    ? [Routes[initialRouteNames!]]
    : [Routes[routeKeys[0]]];
  const RouteComponent = createComponent("Route", {
    children: initialChildren,
  });

  let statefulData;
  const RouteStatefulComponent = createStatefulComponent(
    RouteComponent,
    (currentStatefulData) => {
      statefulData = currentStatefulData;
    }
  );
  const Router = {
    name,
    statefulData,
    Routes,
  };
  setRoutes(name, Router);

  return RouteStatefulComponent;
}

function getRouterWithName(name: string) {
  if (!getRouter(name)) {
    throw new Error(
      `Router with name ${name} not found ${JSON.stringify(ROUTERS)}`
    );
  }
  const router = getRouter(name);
  const { statefulData } = router;

  const changeRoute = (newRouteName: string) => {
    if (!router.Routes[newRouteName]) {
      throw new Error(`Route ${newRouteName} not found inside Router ${name}`);
    }
    const routes = router.Routes[newRouteName];
    statefulData.updateChildren([routes]);
  };

  const showRoute = (routeName: string) => {
    if (!router.Routes[routeName]) {
      throw new Error(`Route ${routeName} not found inside Router ${name}`);
    }
    const currentChild = statefulData.getChildren();
    const route = router.Routes[routeName];
    statefulData.updateChildren([...currentChild, route]);
  };

  const hideRoute = (routeName: string) => {
    if (!router.Routes[routeName]) {
      throw new Error(`Route ${routeName} not found inside Router ${name}`);
    }
    const currentChild = statefulData.getChildren();
    const toRemoveComponent = router.Routes[routeName];
    const newRoute = currentChild.filter(
      (component) => component.id !== toRemoveComponent.id
    );
    statefulData.updateChildren(newRoute);
  };

  return {
    changeRoute,
    showRoute,
    hideRoute,
  };
}

type UseRouterHandler = (router: ReturnType<typeof getRouterWithName>) => void;
function useRouter(name: string, handler: UseRouterHandler): void {
  let animationFrame;
  function loop() {
    // wait for Routers available by checking if it have keys
    // DO NOT USE useRouter if you don't have any Router in your app
    if (Object.keys(ROUTERS).length > 0) {
      const router = getRouterWithName(name);
      handler(router);
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = requestAnimationFrame(loop);
  }
  loop();
}

// IMPLEMENTATION LEVEL
// EXAMPLES

function Background({ bgColor = "#dadada" } = {}): Component {
  const initialState: InitialState = {
    style: {
      fillColor: bgColor,
    },
  };
  const draw: DrawFunction<Component> = (component, game: Game) => {
    const { canvas, ctx } = game;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return createComponent("Background", {
    initialState,
    draw,
  });
}

type ScoreState = CombinedState<{
  score: number;
}>;

function Score(): Component {
  const initialState: InitialState<ScoreState> = {
    score: 0,
    style: {
      fillColor: "red",
      textStyle: "14px Arial",
    },
  };
  const draw: DrawFunction<ScoreState> = (component, game) => {
    const { state } = component;
    const { canvas, ctx } = game;
    ctx.fillText(`Score: ${state.score}`, 20, 30);
  };

  return createComponent("Score", {
    initialState,
    draw,
  });
}

function Text({
  x,
  y,
  text = "",
  fontSize = "14px",
  fontFamily = "Arial",
  fontColor = "#000",
  useStroke = false,
  lineWidth = 1,
}): Component {
  const initialState: InitialState = {
    position: {
      x,
      y,
    },
    style: {
      strokeColor: fontColor,
      fillColor: fontColor,
      textStyle: `400 ${fontSize} '${fontFamily}'`,
      lineWidth,
    },
  };

  const draw: DrawFunction<Component> = (component, game) => {
    const { ctx } = game;
    const { state } = component;
    const { position } = state;
    if (useStroke) {
      ctx.strokeText(text, position.x, position.y);
    } else {
      ctx.fillText(text, position.x, position.y);
    }
  };

  const TextComponent = createComponent("Text", {
    draw,
    initialState,
  });

  return TextComponent;
}

function Box({ x, y, height, width, boxNumber }): Component {
  const initialState: InitialState<{ boxNumber: number; destroyed: boolean }> =
    {
      position: {
        x,
        y,
      },
      boxNumber,
      style: {
        strokeColor: "#FFF",
      },
    };
  const draw: DrawFunction<{ boxNumber: number; destroyed: boolean }> = (
    component,
    game
  ) => {
    const { ctx } = game;
    const { state } = component;
    const { position } = state;
    if (state.destroyed) {
      return;
    }
    ctx.lineWidth = 3;
    ctx.fillRect(position.x, position.y, width, height);
    ctx.strokeRect(position.x, position.y, width, height);
  };
  const Box = createComponent("Box", {
    initialState,
    draw,
    width,
    height,
  });
  return createStatefulComponent(Box, (statefulData) => {
    useCollision(statefulData);
  });
}

function Boxes({ numOfBox }) {
  return createStatefulComponent("Boxes", (statefulData) => {
    const boxes: Component[] = [];
    const numOfCol = 10;
    const height = 30;
    const width = 40;
    let currentBoxNum = 0;

    const onHitByBall = (ballNum: number) => {
      const currentChildren = statefulData.getChildren();
      const newChildren = currentChildren.filter((child) => {
        return child.state.boxNumber !== ballNum;
      });
      statefulData.updateChildren(newChildren);
    };

    while (currentBoxNum !== numOfBox) {
      const row = Math.floor(currentBoxNum / numOfCol);
      const col = currentBoxNum % numOfCol;
      const x = 26 + col * width;
      const y = 50 + row * height;
      boxes.push(Box({ x, y, height, width, boxNumber: currentBoxNum }));
      currentBoxNum++;
    }
    statefulData.updateChildren(boxes);
  });
}

type PlayerBarState = CombinedState<{}>;

function PlayerBar(): Component {
  const initialState: InitialState<PlayerBarState> = {
    position: {
      x: 170,
      y: 600,
    },
    style: {
      fillColor: "#555",
    },
  };

  const width = 120;
  const height = 20;

  const draw: DrawFunction<Component<PlayerBarState>> = (component, game) => {
    const { state } = component;
    const { style, position } = state;
    const { ctx } = game;
    ctx.fillRect(position.x, position.y, width, height);
  };

  const PlayerBar = createComponent("PlayerBar", {
    draw,
    initialState,
    width,
    height,
  });

  return createStatefulComponent(PlayerBar, (statefulData) => {
    useCollision(statefulData);
    const animator = useAnimator(statefulData, {
      speed: 2,
      maxSpeed: 10,
      boundingBox: {
        x: [0, 450 - 118],
      },
    });

    const eventHook = useEvent(statefulData);

    eventHook.addKeyDownListener(() => {
      // if keyboard left pressed
      if (eventHook.PressedKeys.ArrowLeft) {
        animator.animateLeft();
      }
      if (eventHook.PressedKeys.ArrowRight) {
        animator.animateRight();
      }
    });

    eventHook.addKeyUpListener(() => {
      if (eventHook.isNoKeyPressed()) {
        animator.deccelerate();
      }
    });
  });
}

function Ball(): Component {
  const initialState: InitialState = {
    style: {
      strokeColor: "#EEE",
      fillColor: "#333",
      lineWidth: 3,
    },
    position: {
      x: 120,
      y: 280,
    },
  };

  const size = 24;
  const draw: DrawFunction<InitialState> = (component, game: Game) => {
    const { state } = component;
    const { ctx } = game;

    ctx.beginPath();
    ctx.arc(state.position.x, state.position.y, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  const Ball = createComponent("Ball", {
    initialState,
    draw,
    width: size,
    height: size,
  });

  return createStatefulComponent(Ball, (statefulData) => {
    const animator = usePhysics(statefulData, {
      maxSpeed: 8,
    });
    useCameraBound(statefulData, {
      onCollideBottom: (ev) => {},
      onCollideLeft: (component) => {
        animator.updateVelocity({
          x: 5,
          y: 0,
        });
      },
      onCollideRight: (component) => {
        const { state } = component;
        let updatedYVelocity = 0;
        // if ball currently goes up
        if (state.physics.velocity.y < 0) {
          updatedYVelocity = 10;
        }
        // if ball goes down
        if (state.physics.velocity.y > 0) {
          updatedYVelocity = -10;
        }
        animator.updateVelocity({
          x: -10,
          y: updatedYVelocity,
        });
      },
      onCollideTop: noop,
    });
    useCollision(statefulData, {
      collisionDetail: {
        type: CollisionBoxType.Circle,
      },
      onCollision: ({ targetComponent, distance }) => {
        if (targetComponent.type === "PlayerBar") {
          let direction;
          if (distance.x < 55) {
            direction = "left";
          } else {
            direction = "right";
          }
          const factor = direction === "left" ? 3 : -3;
          animator.updateVelocity({
            x: factor,
            y: -14,
          });
        }
        if (targetComponent.type === "Box") {
          const state = statefulData.getState();
          targetComponent.state.destroyed = true;
          let updatedXVelocity = 0;
          // if ball currently goes left
          if (state.physics.velocity.x < 0) {
            updatedXVelocity = 3;
          } else {
            updatedXVelocity = -3;
          }
          animator.updateVelocity({
            x: -5,
            y: 14,
          });
        }
      },
    });
  });
}

function GamePage(): Component {
  const children = [
    Background(),
    Score(),
    Boxes({ numOfBox: 60 }),
    PlayerBar(),
    Ball(),
  ];
  return createComponent("GamePage", {
    children,
  });
}

function GameOverPage(): Component {
  const children = [
    Background({ bgColor: "#222" }),
    Text({
      x: 68,
      y: 200,
      fontFamily: "Press Start 2P",
      fontSize: "36px",
      text: "Game Over",
      fontColor: "white",
    }),
  ];

  return createComponent("GameOverPage", {
    children,
  });
}

function World(): Component {
  return Router(
    "MainRouter",
    {
      GamePage: GamePage(),
      GameOverPage: GameOverPage(),
    },
    "GamePage"
  );
}

start({
  components: [World()],
  rootHtmlElement: document.getElementById("root"),
  style: {
    width: 450,
    height: 650,
  },
});
