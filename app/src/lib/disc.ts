export const DISC = {
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  createMarket: new Uint8Array([103, 226, 97, 235, 200, 188, 251, 254]),
  postOracle: new Uint8Array([165, 97, 14, 41, 6, 74, 148, 83]),
  setMarketStatus: new Uint8Array([101, 175, 83, 107, 200, 141, 155, 182]),
  deposit: new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
  openOrIncrease: new Uint8Array([157, 151, 190, 107, 185, 208, 241, 21]),
  reduce: new Uint8Array([14, 237, 91, 53, 69, 236, 67, 251]),
  liquidate: new Uint8Array([223, 179, 226, 125, 48, 46, 39, 74]),
} as const;
