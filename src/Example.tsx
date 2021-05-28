import "./index.css";
import "./jsxTyping";
import { pxm, mpx } from "./measure";
import Redraw, {
  useEffect,
  useState,
  startGame,
  useMemo,
  useRef,
  useCallback,
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
  BoxBodyDoubleFixture,
} from "./PrebuiltComponents";
import * as planck from "planck";
import { world } from "./physics";

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

function Boxes({ numOfBox, onBallHit }) {
  const [boxes, setBoxes] = useState<any[]>([]);
  const numOfCol = 10;
  const height = 30;
  const width = 40;

  // only count initially
  useEffect(() => {
    let currentBoxNum = 0;
    const addedBox: any[] = [];
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

  const onHitByBall = useCallback((boxNum) => {
    setBoxes((oldState) =>
      oldState.filter((state) => state.currentBoxNum !== boxNum)
    );
    onBallHit();
  }, []);

  return boxes.map((boxData, i) => {
    return (
      <BoxWithCollision
        {...boxData}
        key={`CurrentBox-${boxData.currentBoxNum}`}
        boxNum={boxData.currentBoxNum}
        onHitByBall={onHitByBall}
      />
    );
  });
}

function BoxWithCollision({ x, y, height, width, key, onHitByBall, boxNum }) {
  // @ts-ignore
  const bodyRef = useRef<planck.Body>(`Refkey-${key}`);
  const body = bodyRef.current;
  if (body) {
    const collideWithBall = getContactWith(bodyRef.current, "ball");
    if (collideWithBall && world) {
      onHitByBall(boxNum);
      const [ball, contact] = collideWithBall;
      ball.applyForce(planck.Vec2(0, -5), planck.Vec2(0, 0));
      body.destroyFixture(contact.getFixtureA());
    }
  }
  return (
    <BoxBody
      name={`Boxese-${key}`}
      key={key}
      x={x}
      y={y}
      bodyRef={bodyRef}
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
  useEffect(() => {
    if (position && position.x <= 0 && velocity!.x <= 0) {
      bodyRef.current?.setLinearVelocity(planck.Vec2(0, 0));
    }
    if (position && position.x >= pxm(320) && velocity!.x >= 0) {
      bodyRef.current?.setLinearVelocity(planck.Vec2(0, 0));
    }
  }, [position?.x, position?.y, velocity?.x, velocity?.y]);

  return (
    <Fragment>
      <BoxBodyDoubleFixture
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
  useEffect(() => {
    if (contactWithBar) {
      const [_, contact] = contactWithBar;
      const data: any = contact.getFixtureA().getUserData() || {};
      if (data.sideName === "left") {
        body?.applyLinearImpulse(
          planck.Vec2(pxm(1), pxm(-9)),
          planck.Vec2(0, 0)
        );
      }
      if (data.sideName === "right") {
        body?.applyLinearImpulse(
          planck.Vec2(pxm(-1), pxm(-9)),
          planck.Vec2(0, 0)
        );
      }
    }
  }, [contactWithBar]);

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

function App() {
  const [score, setScore] = useState(0);

  const onBallHit = useCallback(() => {
    setScore((prevScore) => prevScore + 10);
  }, []);

  return (
    <GameCanvas>
      <Background background="#dadada">
        <Text x={25} y={30} fillStyle="red">
          Score: {score}
        </Text>
        {/* <Boxes numOfBox={60} onBallHit={onBallHit} /> */}
        <Ball onBallHit={onBallHit} />
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
