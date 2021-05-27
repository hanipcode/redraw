import "./index.css";
import "./jsxTyping";
import { pxm, mpx } from "./measure";
import Redraw, {
  useEffect,
  useState,
  startGame,
  useMemo,
  useRef,
} from "./Redraw";
import { useControllerState } from "./RedrawHooks";
import {
  Background,
  Text,
  GameCanvas,
  Box,
  Circle,
  CircleBody,
  GroundBody,
  Fragment,
  BoxBody,
} from "./PrebuiltComponents";
import * as planck from "planck";

function getContactWith(
  body: planck.Body | null,
  name: string
): [planck.Body, planck.Contact] | null {
  if (!body) {
    return null;
  }
  const contactList = body.getContactList();
  if (!contactList) {
    return null;
  }
  let contact = contactList;
  do {
    const userData: any = contact.other?.getUserData();
    if (userData && userData.name === name) {
      return [contact.other!, contact.contact];
    }
    contact = contact.next!;
  } while (contact?.next);
  return null;
}

function Boxes({ numOfBox }) {
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

  return boxes.map((boxData) => {
    return (
      <BoxWithCollision {...boxData} key={`CurrentBox-${currentBoxNum}`} />
    );
  });
}

function BoxWithCollision({ x, y, height, width, key }) {
  return (
    <BoxBody
      name={`Boxese-${key}`}
      key={key}
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
  const bodyRef = useRef<planck.Body>();
  const { PressedKeys, iskKeyPressed, isNoKeyPressed, ControllerKey } =
    useControllerState();
  useEffect(() => {
    if (iskKeyPressed(ControllerKey.ArrowLeft)) {
      bodyRef.current?.setLinearVelocity(planck.Vec2(-20, 0));
    }
    if (iskKeyPressed(ControllerKey.ArrowRight)) {
      bodyRef.current?.setLinearVelocity(planck.Vec2(20, 0));
    }
    if (isNoKeyPressed()) {
      bodyRef.current?.setLinearVelocity(planck.Vec2(0, 0));
    }
  }, [PressedKeys]);
  const position = bodyRef.current?.getPosition();
  const velocity = bodyRef.current?.getLinearVelocity();
  if (position && position.x <= 0 && velocity!.x <= 0) {
    bodyRef.current?.setLinearVelocity(planck.Vec2(0, 0));
  }
  if (position && position.x >= pxm(320) && velocity!.x >= 0) {
    bodyRef.current?.setLinearVelocity(planck.Vec2(0, 0));
  }
  return (
    <Fragment>
      <BoxBody
        x={300}
        y={605}
        width={barWidth}
        height={20}
        bodyRef={bodyRef}
        strokeStyle="#FFF"
        type="kinematic"
        name="PlayerBar"
        lineWidth={4}
        fillStyle="black"
      />
    </Fragment>
  );
}

function Ball() {
  const bodyRef = useRef<planck.Body>();
  const body = bodyRef.current;
  const contactWithBar = getContactWith(body, "PlayerBar");
  if (contactWithBar) {
    const [_, contact] = contactWithBar;
    const data: any = contact.getFixtureA().getUserData() || {};
    if (data.sideName === "left") {
      body?.applyLinearImpulse(
        planck.Vec2(pxm(0.5), pxm(-6)),
        planck.Vec2(0, 0)
      );
    }
    if (data.sideName === "right") {
      body?.applyLinearImpulse(
        planck.Vec2(pxm(-0.5), pxm(-6)),
        planck.Vec2(0, 0)
      );
    }
  }
  return (
    <Fragment>
      <CircleBody
        type="dynamic"
        name="ball"
        x={300}
        y={300}
        fillStyle="#000"
        strokeStyle="#FFF"
        lineWidth={3}
        bodyRef={bodyRef}
        size={24}
      />
    </Fragment>
  );
}

function Ground() {}

function App() {
  return (
    <GameCanvas>
      <Background background="#dadada">
        <Ball />
        <PlayerBar />
        <GroundBody
          x={0}
          y={645}
          width={605}
          height={5}
          drawGround
          name="BottomGround"
        />
        <GroundBody
          x={445}
          y={0}
          width={5}
          height={650}
          drawGround
          name="RightGround"
        />
        <GroundBody
          x={0}
          y={0}
          width={5}
          height={650}
          drawGround
          name="LeftGroud"
        />
        <GroundBody
          x={0}
          y={0}
          width={605}
          height={5}
          drawGround
          name="BottomGround"
        />
      </Background>
    </GameCanvas>
  );
}

startGame(App);
