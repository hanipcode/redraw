import "./index.css";
import Redraw, { useEffect, useState, startGame, useMemo } from "./Redraw";
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
  x: 0;
  y: 0;
  speed: number;
  maxSpeed: number;
  boundingBox: BoundingBox;
}

interface Vector2 {
  x: number;
  y: number;
}

// function useAnimator(
//   // @ts-ignore
//   param: UseAnimatorParam = {}
// ) {

//   const defaultParam: RecursivePartial<UseAnimatorParam> = {
//     speed: 1,
//     maxSpeed: Number.POSITIVE_INFINITY,
//   };
//   const combinedParam = {
//     ...defaultParam,
//     ...param,
//   };
//   const { boundingBox, maxSpeed } = combinedParam as UseAnimatorParam;
//   let { speed } = combinedParam as UseAnimatorParam;

//   const [position, setPosition] = useState<Vector2>({
//     x: param.x,
//     y: param.y,
//   });

//   const [dV, setVelocity] = useState<Vector2>({
//     x: 0,
//     y: 0,
//   })

//   useEffect(() => {
//     let animationFrame;
//     function loop() {
//       const newPosX = position.x + dV.x;
//       const newPosY = position.y + dV.y;

//       // if bounding box is defined, can't move outside bounding box
//       // can't move horizontally outside bounding box X if defined
//       if (boundingBox) {
//         if (boundingBox.x) {
//           if (newPosX <= boundingBox.x[0] || newPosX >= boundingBox.x[1]) {
//             dV.x = 0;
//             component.state.physics.velocity = dV;
//             stopLoop();
//             return;
//           }
//         }
//         // can't move vertically outside bounding box y if defined
//         if (boundingBox.y) {
//           if (newPosY <= boundingBox.y[0] || newPosY >= boundingBox.y[1]) {
//             dV.y = 0;
//             component.state.physics.velocity = dV;
//             stopLoop();
//             return;
//           }
//         }
//       }

//       if (dV.x > 0 || dV.x < 0) {
//         dV.x *= 1 - speed * 0.001;
//         component.state.position.x = newPosX;
//         component.state.physics.velocity = dV;
//       }
//       if (dV.y > 0 || dV.y < 0) {
//         dV.y *= 1 - speed * 0.001;
//         component.state.position.y = newPosY;
//         component.state.physics.velocity = dV;
//       }

//       animationFrame = requestAnimationFrame(loop);
//     }
//   }, []);

//   const startLoop = () => {
//     loop();
//   };
//   const stopLoop = () => {
//     if (animationFrame) {
//       cancelAnimationFrame(animationFrame);
//     }
//   };

//   const animateLeft = (speedParam = speed) => {
//     stopLoop();
//     const { velocity: dV } = component.state.physics;
//     if (dV.x > 0) {
//       dV.x = 0;
//     }
//     dV.x -= speed;
//     if (dV.x < maxSpeed * -1) {
//       dV.x = maxSpeed * -1;
//     }
//     component.state.physics.velocity = dV;
//     startLoop();
//   };

//   const animateUp = () => {
//     stopLoop();
//     const { velocity: dV } = component.state.physics;
//     if (dV.x < 0) {
//       dV.x = 0;
//     }
//     dV.y -= speed;
//     if (dV.y < maxSpeed * -1) {
//       dV.y = maxSpeed * -1;
//     }
//     component.state.physics.velocity = dV;
//     startLoop();
//   };

//   const animateRight = () => {
//     stopLoop();
//     const { velocity: dV } = component.state.physics;
//     if (dV.x < 0) {
//       dV.x = 0;
//     }
//     dV.x += speed;
//     if (dV.x > maxSpeed) {
//       dV.x = maxSpeed;
//     }
//     component.state.physics.velocity = dV;
//     startLoop();
//   };

//   const animateDown = () => {
//     stopLoop();
//     const { velocity: dV } = component.state.physics;
//     dV.y += speed;
//     if (dV.y > maxSpeed) {
//       dV.y = maxSpeed;
//     }
//     component.state.physics.velocity = dV;
//     startLoop();
//   };

//   const deccelerate = (factor: number | Vector2 = 0.04) => {
//     let { velocity: dV } = component.state.physics;
//     dV = multiplyVector(dV, factor);
//     component.state.physics.velocity = dV;
//   };

//   const updateVelocity = (velocity: Vector2) => {
//     let { velocity: dV } = component.state.physics;
//     dV = velocity;
//     component.state.physics.velocity = dV;
//   };

//   const updateSpeed = (newSpeed: number) => {
//     speed = newSpeed;
//   };

//   const getCurrentSpeed = (): number => speed;

//   return {
//     updateSpeed,
//     getCurrentSpeed,
//     updateVelocity,
//     animateLeft,
//     animateRight,
//     deccelerate,
//     animateUp,
//     animateDown,
//     // bounce,
//   };
// }

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
  return (
    <Box
      x={120}
      y={605}
      width={120}
      height={20}
      strokeStyle="#FFF"
      lineWidth={4}
      fillStyle="black"
    />
  );
}

function App() {
  const [countDown, setCountdown] = useState(0);
  useEffect(() => {
    let time;
    time = setInterval(() => {
      // updateNum();
      console.log("pasti running");
      setCountdown((count) => count + 1);
      // setCountdown((count) => count + 1);
    }, 1000);
    return () => {
      console.log("cleaned");
      clearInterval(time);
    };
  }, []);
  return (
    <GameCanvas>
      <Background background="#dadada">
        <Boxes numOfBox={40} />
        <Text x={26} y={30} fillStyle="red">
          Score: {countDown}
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
