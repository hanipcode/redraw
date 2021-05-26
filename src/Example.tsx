import "./index.css";
import "./jsxTyping";
import Redraw, {
  useEffect,
  useState,
  startGame,
  useMemo,
  useCallback,
  useCollision,
} from "./Redraw";
import {
  Background,
  Text,
  GameCanvas,
  Box,
  Circle,
  CollisionBoxDrawer,
  Fragment,
} from "./PrebuiltComponents";

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
interface BoundingBox {
  x: [number, number];
  y: [number, number];
}

interface UseAnimatorParam {
  x: number;
  y: number;
  speed: number;
  maxSpeed?: number;
  boundingBox?: BoundingBox;
}

type UsePhysicsParam = Partial<UseAnimatorParam> & {
  x: number;
  y: number;
};
interface Vector2 {
  x: number;
  y: number;
}

const ControllerKey = {
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
} as const;

type ControllerKeyKeys = keyof typeof ControllerKey;
type ControllerKeyValues = typeof ControllerKey[ControllerKeyKeys];
function useControllerState() {
  // const PressedKeys: Partial<Record<ControllerKeyValues, boolean>> = {};
  const [PressedKeys, setPressedKeys] = useState<
    Partial<Record<ControllerKeyValues, boolean>>
  >({});
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey) return;
      setPressedKeys((previousLyPressedKey) => ({
        ...previousLyPressedKey,
        [event.key]: true,
      }));
    };
    const onKeyUp = (event: KeyboardEvent) => {
      setPressedKeys((previousLyPressedKey) => ({
        ...previousLyPressedKey,
        [event.key]: false,
      }));
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [PressedKeys]);

  const isNoKeyPressed = useCallback(() => {
    return Object.keys(PressedKeys).every((key) => {
      return PressedKeys[key] !== true;
    });
  }, [PressedKeys]);

  const iskKeyPressed = (key: ControllerKeyKeys) => {
    return PressedKeys[key];
  };
  return {
    PressedKeys,
    iskKeyPressed,
    isNoKeyPressed,
    ControllerKey,
  };
}

function useAnimator(param: UseAnimatorParam) {
  const defaultParam: RecursivePartial<UseAnimatorParam> = {
    speed: 1,
    maxSpeed: Number.POSITIVE_INFINITY,
  };
  const combinedParam = {
    ...defaultParam,
    ...param,
  };
  let { speed } = combinedParam as UseAnimatorParam;

  const [position, setPosition] = useState<Vector2>({
    x: param.x,
    y: param.y,
  });

  const [dV, setVelocity] = useState<Vector2>({
    x: 0,
    y: 0,
  });

  const animateLeft = useCallback(() => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      if (newDvX > 0) {
        newDvX = 0;
      }
      newDvX -= speed;
      return {
        x: newDvX,
        y: dV.y,
      };
    });
  }, []);
  const animateRight = useCallback(() => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      if (newDvX < 0) {
        newDvX = 0;
      }
      newDvX += speed;
      return {
        x: newDvX,
        y: dV.y,
      };
    });
  }, []);

  const bounceLeft = useCallback(() => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      let newDvY = dV.y;
      newDvX -= 0.2 - 0.04 * dV.x * -1;
      newDvY = -5;
      return {
        x: newDvX,
        y: newDvY,
      };
    });
  }, []);
  const bounceRight = useCallback(() => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      let newDvY = dV.y;
      if (dV.y < 0) {
        newDvY = -5;
      } else {
        newDvY = 5;
      }
      newDvX += 0.2 + 0.04 * dV.x;
      return {
        x: newDvX,
        y: newDvY,
      };
    });
  }, []);
  const bounceDown = useCallback(() => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      let newDvY = dV.y;
      if (dV.x < 0) {
        newDvX = 2 + 0.04 * dV.x;
      } else {
        newDvX = -2 - 0.04 * dV.x * -1;
      }
      newDvY = 3;
      return {
        x: newDvX,
        y: newDvY,
      };
    });
  }, []);
  const bounceUp = useCallback((xFactor: number = 0) => {
    setVelocity((dV) => {
      let newDvX = dV.x;
      let newDvY = dV.y;
      if (xFactor) {
        newDvX = xFactor;
      } else if (dV.x < 0) {
        newDvX = 0.2 + 0.04 * dV.x;
      } else {
        newDvX = -0.2 - 0.04 * dV.x * -1;
      }
      if (newDvY > 0) {
        newDvY = newDvY * -1;
      }
      newDvY -= 1;
      return {
        x: newDvX,
        y: newDvY,
      };
    });
  }, []);
  const animateDown = useCallback(() => {
    setVelocity((dV) => {
      let newDvY = dV.y;
      newDvY += speed;
      return {
        x: dV.x,
        y: newDvY,
      };
    });
  }, []);
  const stopMovingX = useCallback(() => {
    setVelocity((oldDv) => {
      return {
        x: oldDv.x * 0.04,
        y: oldDv.y,
      };
    });
  }, []);

  // update position based on speed
  useEffect(() => {
    let af;
    function loop() {
      setPosition((oldPosition: Vector2) => {
        let newPosX = oldPosition.x + dV.x;
        let newPosY = oldPosition.y + dV.y;

        if (combinedParam.boundingBox) {
          const boundingBox = combinedParam.boundingBox as BoundingBox;
          if (boundingBox.x && newPosX < boundingBox.x[0]) {
            newPosX = boundingBox.x[0];
            setVelocity((oldDv) => ({
              x: 0,
              y: oldDv.y,
            }));
          }
          if (boundingBox.x && newPosX > boundingBox.x[1]) {
            newPosX = boundingBox.x[1];
            setVelocity((oldDv) => ({
              x: 0,
              y: oldDv.y,
            }));
          }
          if (boundingBox.y && newPosY < boundingBox.y[0]) {
            newPosY = boundingBox.y[0];
            setVelocity((oldDv) => ({
              x: oldDv.x,
              y: 0,
            }));
          }
          if (boundingBox.y && newPosY > boundingBox.y[1]) {
            newPosY = boundingBox.y[1];
            setVelocity((oldDv) => ({
              x: oldDv.x,
              y: 0,
            }));
          }
        }
        return {
          x: newPosX,
          y: newPosY,
        };
      });
      af = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      cancelAnimationFrame(af);
    };
  }, [dV.x, dV.y]);
  // deccelerating loop
  useEffect(() => {
    setVelocity((oldDv) => ({
      x: oldDv.x * 0.995,
      y: oldDv.y * 0.995,
    }));
  }, [dV.x, dV.y]);

  return {
    position,
    velocity: dV,
    animateLeft,
    animateRight,
    animateDown,
    stopMovingX,
    setVelocity,
    bounceLeft,
    bounceRight,
    bounceDown,
    bounceUp,
  };
}

function Boxes({ numOfBox }) {
  const [boxes, setBoxes] = useState([]);
  const numOfCol = 10;
  const height = 30;
  const width = 40;
  let currentBoxNum = 0;

  // only count initially
  useEffect(() => {
    console.log("initial");
    const addedBox = [];
    while (currentBoxNum !== numOfBox) {
      const row = Math.floor(currentBoxNum / numOfCol);
      const col = currentBoxNum % numOfCol;
      const x = 26 + col * width;
      const y = 44 + row * height;
      // @ts-ignore
      addedBox.push({ x, y, height, width, currentBoxNum });
      currentBoxNum++;
    }
    setBoxes(addedBox);
  }, []);

  const onCollide = (boxNum) => {
    const nextBoxes = boxes.filter(
      ({ currentBoxNum }) => currentBoxNum !== boxNum
    );
    setBoxes(nextBoxes);
  };

  return boxes.map((boxData) => {
    return <BoxWithCollision {...boxData} onCollide={onCollide} />;
  });
}

function BoxWithCollision({ x, y, height, width, currentBoxNum, onCollide }) {
  const { checkCollidedWith, collidedData } = useCollision({
    x,
    y,
    height,
    width,
    velocity: { x: 0, y: 0 },
    type: "Box",
    collisionName: "box",
  });
  const collidedWithBall = checkCollidedWith(collidedData, "ball");
  if (collidedWithBall) {
    onCollide(currentBoxNum);
  }
  return (
    <Box
      x={x}
      y={y}
      height={height}
      width={width}
      fillStyle="black"
      strokeStyle="#FFF"
    />
  );
}

function usePhysics(physicsParam: UsePhysicsParam) {
  const {
    position,
    velocity,
    animateDown,
    stopMovingX,
    ...otherAnimatorProps
  } = useAnimator({
    speed: 0.0098,
    maxSpeed: 10,
    ...physicsParam,
  });

  useEffect(() => {
    animateDown();
  }, [velocity]);

  return {
    position,
    velocity,
    animateDown,
    stopMovingX,
    ...otherAnimatorProps,
  };
}

function PlayerBar() {
  const barWidth = 120;
  const canvasBoundingBox: BoundingBox = {
    x: [0, 450 - barWidth],
    y: [0, 650],
  };
  const { position, velocity, animateLeft, animateRight, stopMovingX } =
    useAnimator({
      x: 300,
      y: 605,
      speed: 3,
      maxSpeed: 5,
      boundingBox: canvasBoundingBox,
    });
  const { collisionBox, isCollided } = useCollision({
    x: position.x,
    y: position.y,
    velocity,
    width: barWidth,
    height: 20,
    collisionName: "bar",
    type: "Box",
  });
  const { PressedKeys, iskKeyPressed, ControllerKey, isNoKeyPressed } =
    useControllerState();
  useEffect(() => {
    if (iskKeyPressed(ControllerKey.ArrowLeft)) {
      animateLeft();
    }
    if (iskKeyPressed(ControllerKey.ArrowRight)) {
      animateRight();
    }
    if (isNoKeyPressed()) {
      stopMovingX();
    }
  }, [PressedKeys]);
  return (
    <Fragment>
      <Box
        x={position.x}
        y={position.y}
        width={barWidth}
        height={20}
        strokeStyle="#FFF"
        lineWidth={4}
        fillStyle="black"
      />
    </Fragment>
  );
}

function Ball() {
  const boundingBox: BoundingBox = {
    x: [12, 450 - 12],
    y: [12, 650 - 12],
  };
  const {
    position,
    velocity,
    setVelocity,
    animateLeft,
    bounceDown,
    bounceLeft,
    bounceUp,
    bounceRight,
  } = usePhysics({
    x: 300,
    y: 300,
    maxSpeed: Number.POSITIVE_INFINITY,
    boundingBox,
  });
  const { collidedData, checkCollidedWith, isCollided, collisionBox } =
    useCollision({
      x: position.x,
      y: position.y,
      velocity,
      width: 24,
      height: 24,
      collisionName: "ball",
      type: "Circle",
    });
  const collideWithBar = checkCollidedWith(collidedData!, "bar");
  const collideWithBox = checkCollidedWith(collidedData!, "box");
  const handleCollideWithBar = useCallback((distance: Vector2) => {
    if (distance.x < 55) {
      bounceUp((55 - distance.x) * 0.1 * -1);
    }
    if (distance.x > 55) {
      bounceUp(distance.x * 0.01);
    }
  }, []);

  const handleCollideWithBox = useCallback((distance: Vector2) => {
    bounceDown();
  }, []);

  // handle collide with walls
  // left
  if (position.x === boundingBox.x[0]) {
    bounceRight();
  }
  // upper
  if (position.y === boundingBox.y[0]) {
    bounceDown();
  }
  if (position.x === boundingBox.x[1]) {
    bounceLeft();
  }
  if (collideWithBar) {
    const collisionData = collideWithBar[0];
    const [, , distance] = collisionData;
    handleCollideWithBar(distance);
  }
  if (collideWithBox) {
    handleCollideWithBox();
  }

  return (
    <Fragment>
      <Circle
        x={position.x}
        y={position.y}
        fillStyle="#000"
        strokeStyle="#FFF"
        lineWidth={3}
        size={24}
      />
    </Fragment>
  );
}

function App() {
  return (
    <GameCanvas>
      <Background background="#dadada">
        <Boxes numOfBox={60} />
        <Text x={26} y={30} fillStyle="red">
          Time: 0
        </Text>
        <Ball />
        <PlayerBar />
      </Background>
    </GameCanvas>
  );
}

startGame(App);
