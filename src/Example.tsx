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
import { useAnimator, usePhysics, useControllerState } from "./RedrawHooks";
import type { BoundingBox, Vector2 } from "./RedrawHooks";

function Boxes({ numOfBox, onBallCollide }) {
  const [boxes, setBoxes] = useState([]);
  const numOfCol = 10;
  const height = 30;
  const width = 40;
  let currentBoxNum = 0;

  // only count initially
  useEffect(() => {
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
    onBallCollide();
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
  const [score, setScore] = useState(0);
  const onBallCollide = useCallback(() => {
    setScore((oldScore) => oldScore + 10);
  }, []);
  return (
    <GameCanvas>
      <Background background="#dadada">
        <Boxes numOfBox={60} onBallCollide={onBallCollide} />
        <Text x={26} y={30} fillStyle="red">
          Score: {score}
        </Text>
        <Ball />
        <PlayerBar />
      </Background>
    </GameCanvas>
  );
}

startGame(App);
