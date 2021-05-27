import * as planck from "planck";

const gravity = planck.Vec2(0.0, 10);

const world = planck.World({
  gravity,
});

export { world };
