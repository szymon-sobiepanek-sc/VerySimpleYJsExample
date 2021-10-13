"use strict";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export const bundle = () => {
  const myId = Math.floor(Math.random() * 1000);
  console.log(`Starting CRDT id: ${myId}`);

  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider(
    "ws://localhost:4444",
    "something-here",
    ydoc
  );
  provider.on("status", (event) => {
    console.log("Status: " + event.status); // logs "connected" or "disconnected"
  });
  const arr = ydoc.getArray("shared-state");
  arr.observe((event) => {
    console.log(event, arr.toJSON());
  });

  return {
    add: () => {
      arr.push([myId]);
    },
    pop: () => {
      arr.delete(0);
    },
    display: () => {
      console.log(arr.toJSON());
    },
  };
};
