function State(value) {
  this.current = value;
}

State.prototype.hum = function () {
  return this;
};
State.prototype.update = function () {
  this.current = 6;
};

const MemoizedFn = {};

const createMemoizedFn = (fn, id) => {
  if (!MemoizedFn[0]) {
    MemoizedFn[0] = fn();
    return MemoizedFn[0];
  }
  return fn();
};

const Stated = {
  d: new State(5),
};
function createSetState() {
  const State = {};
  const setState = () => {
    State[0] = 20;
  };
  return (initialValue) => {
    if (!State[0]) {
      State[0] = initialValue;
    }
    return [State[0], setState];
  };
}
const getState = createSetState();

let cuy = 10;
function Component() {
  const [state, setState] = getState(12);
  const panembahan = createMemoizedFn(
    () => () => {
      console.log(state);
      setState();
    },
    0
  );
  panembahan();
  return {};
}

Component();
Component();
