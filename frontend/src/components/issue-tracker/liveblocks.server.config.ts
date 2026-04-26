import { Liveblocks } from "@liveblocks/node";

let _instance: Liveblocks | null = null;

export function getLiveblocks(): Liveblocks {
  if (!_instance) {
    if (!process.env.LIVEBLOCKS_SECRET_KEY) {
      throw new Error("LIVEBLOCKS_SECRET_KEY is not configured");
    }
    _instance = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  }
  return _instance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const liveblocks: Liveblocks = new Proxy({} as Liveblocks, {
  get(_target, prop, receiver) {
    return Reflect.get(getLiveblocks(), prop, receiver);
  },
});
