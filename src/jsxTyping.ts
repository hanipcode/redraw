declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: {
      children: any;
    };
  }
}
interface Component {
  componentId: number;
  type: Component | Component[] | string | Function;
  props: any;
}
