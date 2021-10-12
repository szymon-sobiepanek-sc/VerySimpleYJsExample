"use strict";

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export const bundle = () => {
  const myId = Math.floor(Math.random() * 1000);
  console.log(`Starting CRDT id: ${myId}`);

  const ydoc = new Y.Doc();
  const provider = new WebrtcProvider("something-here", ydoc, {
    signaling: ["ws://localhost:4444"],
  });
  const arr = ydoc.getArray("shared-state");
  arr.observe((event) => {
    console.log(event);
  });

  return {
    add: () => {
      arr.push([myId]);
    },
    pop: () => {
      arr.delete(0);
    },
  };
};
