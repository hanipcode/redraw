import { createElement, useMemo } from "./Redraw";
import type { RefType } from "./Redraw";
import { world } from "./physics";
import * as planck from "planck";
import { mpx, pxm } from "./measure";

const PrebuiltComponents = {
  Text: "Text",
  Canvas: "Canvas",
  Background: "Background",
  Box: "Box",
  Circle: "Circle",
} as const;

const PrebuiltComponentsDefaultProps = {
  [PrebuiltComponents.Background]: {
    background: "#000",
  },
  [PrebuiltComponents.Text]: {
    font: "16px Arial",
    fillStyle: "#000",
    lineWidth: 1,
  },
  [PrebuiltComponents.Canvas]: {},
  [PrebuiltComponents.Box]: {
    lineWidth: 1,
  },
  [PrebuiltComponents.Circle]: {
    lineWidth: 1,
  },
} as const;

export type Props<ComponentProps> = ComponentProps & {
  children?: any;
  key?: string;
};

interface BackgroundProps {
  background: string;
}
function Background(props: Props<BackgroundProps>) {
  return createElement(PrebuiltComponents.Background, {
    props,
  });
}

function GameCanvas(props) {
  return createElement(PrebuiltComponents.Canvas, { props });
}

interface TextProps {
  font?: string;
  fillStyle?: string;
  x: number;
  y: number;
  lineWidth?: number;
}

function Text(props: Props<TextProps>) {
  return createElement(PrebuiltComponents.Text, { props });
}

interface BoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fillStyle: string;
  strokeStyle?: string;
  lineWidth?: number;
}

function Box(props: Props<BoxProps>) {
  return createElement(PrebuiltComponents.Box, { props });
}

interface CircleProps {
  x: number;
  y: number;
  size: number;
  fillStyle: string;
  strokeStyle?: string;
  lineWidth?: number;
}

function Circle(props: Props<CircleProps>) {
  return createElement(PrebuiltComponents.Circle, { props });
}

interface CircleBodyProps extends CircleProps {
  type?: "static" | "kinematic" | "dynamic";
  bodyRef?: RefType<planck.Body>;
  name: string;
}

function CircleBody(props: Props<CircleBodyProps>) {
  const body = useMemo<planck.Body>(() => {
    const body = world.createBody({
      position: planck.Vec2(pxm(props.x), pxm(props.y)),
      type: props.type || "static",
      bullet: true,
      userData: {
        name: props.name,
      },
    });
    const shape = planck.Circle(pxm(props.size) / 8) as unknown as planck.Shape;
    body.createFixture({
      shape: shape,
      density: 1,
      friction: 0.1,
      restitution: 0.8,
    });
    return body;
  }, []);
  if (props.bodyRef) {
    props.bodyRef.current = body;
  }
  const position = body.getPosition();
  return <Circle {...props} x={mpx(position.x)} y={mpx(position.y)} />;
}

interface BoxBodyProps extends BoxProps {
  type?: "static" | "kinematic" | "dynamic";
  bodyRef?: RefType<planck.Body>;
  name: string;
}

function BoxBody({ type = "static", ...props }: Props<BoxBodyProps>) {
  const body = useMemo<planck.Body>(
    () => {
      const body = world.createBody({
        position: planck.Vec2(pxm(props.x), pxm(props.y)),
        userData: {
          name: props.name,
        },
        type: type,
      });
      const shapeWidth = pxm(props.width) / 2;
      const shape = planck.Box(
        shapeWidth,
        pxm(props.height),
        planck.Vec2(shapeWidth, pxm(props.height))
      ) as planck.Shape;
      body.createFixture({
        shape: shape,
        density: 20,
        friction: 0,
      });
      return body;
    },
    [],
    props.key
  );
  const position = body.getPosition();
  if (props.bodyRef) {
    props.bodyRef.current = body;
  }
  return <Box {...props} x={mpx(position.x)} y={mpx(position.y)} />;
}

function BoxBodyDoubleFixture({
  type = "static",
  ...props
}: Props<BoxBodyProps>) {
  const body = useMemo<planck.Body>(
    () => {
      const body = world.createBody({
        position: planck.Vec2(pxm(props.x), pxm(props.y)),
        userData: {
          name: props.name,
        },
        type: type,
      });
      const shapeWidth = pxm(props.width) / 2;
      const shapeLeft = planck.Box(
        shapeWidth / 2,
        pxm(props.height / 1.6),
        planck.Vec2(shapeWidth / 2, pxm(props.height / 2))
      ) as planck.Shape;
      const shapeRight = planck.Box(
        shapeWidth / 2,
        pxm(props.height / 1.6),
        planck.Vec2(shapeWidth * 1.6, pxm(props.height / 2))
      ) as planck.Shape;
      body.createFixture({
        shape: shapeLeft,
        density: 0.1,
        userData: {
          sideName: "left",
        },
        friction: 0.3,
      });
      body.createFixture({
        shape: shapeRight,
        density: 0.1,
        userData: {
          sideName: "right",
        },
        friction: 0.3,
      });

      return body;
    },
    [],
    props.key
  );
  const position = body.getPosition();
  if (props.bodyRef) {
    props.bodyRef.current = body;
  }
  return <Box {...props} x={mpx(position.x)} y={mpx(position.y)} />;
}

interface GroundBodyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  drawGround?: boolean;
  alloswSleep?: boolean;
  name: string;
}

function GroundBody({
  width,
  height,
  x,
  y,
  drawGround = false,
  alloswSleep = true,
  name,
}: Props<GroundBodyProps>) {
  const body = useMemo(() => {
    const body = world.createBody({
      position: planck.Vec2(pxm(x), pxm(y)),
      allowSleep: alloswSleep,
      userData: {
        name: name,
      },
    });
    const groundBox = planck.Box(
      pxm(width) / 2,
      pxm(height) / 2,
      planck.Vec2(pxm(width / 2), pxm(height / 2))
    ) as planck.Shape;
    body.createFixture({
      shape: groundBox,
    });
    return body;
  }, []);
  if (!drawGround) {
    return null;
  }
  return <Box x={x} y={y} width={width} height={height} fillStyle="#444" />;
}

function Fragment({ children }: any) {
  return createElement("Fragment", {
    props: {
      children,
    },
  });
}

export {
  PrebuiltComponents,
  Background,
  GameCanvas,
  Text,
  Box,
  BoxBodyDoubleFixture,
  Circle,
  Fragment,
  CircleBody,
  GroundBody,
  BoxBody,
  PrebuiltComponentsDefaultProps,
};
