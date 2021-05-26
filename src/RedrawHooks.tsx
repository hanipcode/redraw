import { useEffect, useState, useCallback } from "./Redraw";

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

export { useAnimator, useControllerState, usePhysics };
export type { BoundingBox, Vector2 };
