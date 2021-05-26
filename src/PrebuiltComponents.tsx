import { createElement } from "./Redraw";

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

// const drawCollisionBound = (game: Game, component: Component): void => {
//   const { ctx } = game;
//   const collisionBodyWithOffset =
//     getComponentCollisionBodyWithOffset(component);
//   const { min, max } = collisionBodyWithOffset;
//   const width = max.x - min.x;
//   const height = max.y - min.y;
//   ctx.strokeStyle = "blue";
//   ctx.lineWidth = 4;
//   ctx.strokeRect(min.x, min.y, width, height);
// };

function CollisionBoxDrawer({ isDrawCollision, collisionBox, lineWidth = 2 }) {
  if (!isDrawCollision || !collisionBox) {
    return null;
  }
  const { min, max } = collisionBox;
  const width = max.x - min.x;
  const height = max.y - min.y;
  return (
    <Box
      x={min.x}
      y={min.y}
      width={width}
      height={height}
      strokeStyle="blue"
      fillStyle="transparent"
      lineWidth={lineWidth}
    />
  );
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
  Circle,
  Fragment,
  PrebuiltComponentsDefaultProps,
  CollisionBoxDrawer,
};
