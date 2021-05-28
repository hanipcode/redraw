const meterToPixelRatio = 26;

function mpx(pixel: number): number {
  return pixel * meterToPixelRatio;
}

function pxm(meter: number): number {
  return meter / meterToPixelRatio;
}

export { mpx, pxm };
