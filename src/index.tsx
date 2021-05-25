import "./index.css";
import Redraw, {
  useEffect,
  useState,
  startGame,
  useMemo,
  useCallback,
} from "./Redraw";
import {
  Background,
  Text,
  GameCanvas,
  Box,
  Circle,
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
  maxSpeed: number;
  boundingBox?: BoundingBox;
}

interface Vector2 {
  x: number;
  y: number;
}

function useAnimator(
  // @ts-ignore
  param: UseAnimatorParam = {}
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

  const [position, setPosition] = useState<Vector2>({
    x: param.x,
    y: param.y,
  });

  const [dV, setVelocity] = useState<Vector2>({
    x: 0,
    y: 0,
  });
  // const d = useMemo(() => {
  //   return `walah bisa gitu, ${dV.x}`;
  // }, [dV]);
  // useMemo(() => {
  //   // console.log("dib", dV);
  // }, [dV]);
  // const animationLoop = () => {
  //   console.log("loop", dV);
  //   console.log(dV);
  // };

  // useEffect(() => {
  //   const animationFrame = animationLoop();
  //   return () => {
  //     cancelAnimationFrame(animationFrame);
  //   };
  // }, []);
  console.log("yang disini", dV);
  const animateLeft = useCallback(() => {
    console.log("dicall", dV);
  }, []);
  useEffect(() => {
    let i = 0;
    setInterval(() => {
      i += 1;
      setVelocity(() => ({
        x: 30 + i,
        y: 30 + i,
      }));
    }, 1000);
  }, []);

  // const animateUp = () => {
  //   const { velocity: dV } = component.state.physics;
  //   if (dV.x < 0) {
  //     dV.x = 0;
  //   }
  //   dV.y -= speed;
  //   if (dV.y < maxSpeed * -1) {
  //     dV.y = maxSpeed * -1;
  //   }
  //   component.state.physics.velocity = dV;
  // };

  // const animateRight = () => {
  //   const { velocity: dV } = component.state.physics;
  //   if (dV.x < 0) {
  //     dV.x = 0;
  //   }
  //   dV.x += speed;
  //   if (dV.x > maxSpeed) {
  //     dV.x = maxSpeed;
  //   }
  //   component.state.physics.velocity = dV;
  // };

  // const animateDown = () => {
  //   const { velocity: dV } = component.state.physics;
  //   dV.y += speed;
  //   if (dV.y > maxSpeed) {
  //     dV.y = maxSpeed;
  //   }
  //   component.state.physics.velocity = dV;
  // };

  // const deccelerate = (factor: number | Vector2 = 0.04) => {
  //   let { velocity: dV } = component.state.physics;
  //   dV = multiplyVector(dV, factor);
  //   component.state.physics.velocity = dV;
  // };

  return {
    // setVelocity,
    position,
    velocity: dV,
    animateLeft,
    // animateRight,
    // deccelerate,
    // animateUp,
    // animateDown,
    // bounce,
  };
}

function Boxes({ numOfBox }) {
  const boxes: any[] = [];
  const numOfCol = 10;
  const height = 30;
  const width = 40;
  let currentBoxNum = 0;

  while (currentBoxNum !== numOfBox) {
    const row = Math.floor(currentBoxNum / numOfCol);
    const col = currentBoxNum % numOfCol;
    const x = 26 + col * width;
    const y = 44 + row * height;
    // @ts-ignore
    boxes.push({ x, y, height, width });
    currentBoxNum++;
  }

  return boxes.map((boxData) => {
    return <Box {...boxData} fillStyle="black" strokeStyle="#FFF" />;
  });
}

function PlayerBar() {
  const { position, velocity, animateLeft } = useAnimator({
    x: 300,
    y: 605,
    speed: 1,
    maxSpeed: Number.POSITIVE_INFINITY,
  });
  animateLeft();

  return (
    <Box
      x={position.x}
      y={position.y}
      width={120}
      height={20}
      strokeStyle="#FFF"
      lineWidth={4}
      fillStyle="black"
    />
  );
}

function App() {
  return (
    <GameCanvas>
      <Background background="#dadada">
        <Boxes numOfBox={40} />
        <Text x={26} y={30} fillStyle="red">
          Time: 0
        </Text>
        <Circle
          x={40}
          y={200}
          fillStyle="#000"
          strokeStyle="#FFF"
          lineWidth={3}
          size={24}
        />
        <PlayerBar />
      </Background>
    </GameCanvas>
  );
}

startGame(App);
