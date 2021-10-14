"use strict";
import * as go from "gojs";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const $ = go.GraphObject.make;

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
  
  const nodes = ydoc.getMap("nodes");
  // const links = ydoc.getArray("links");
  
  const updateNode = (key, update) => {
    const current = nodes.get(key);
      nodes.set(key, {
        ...current,
        ...update,
      });
  };

  const goJSDiagram =
    $(go.Diagram, "goJSDiagramDiv");

  nodes.observe((event) => {
    goJSDiagram.model.commit((model) => {
      const nodesArray = Object.values(nodes.toJSON());
      model.mergeNodeDataArray(nodesArray);
    }, "synchronizeNodeData");
  });

  // links.observe((event) => {
  //   goJSDiagram.model.commit((model) => {
  //     model.mergeLinkDataArray(links.toArray());
  //   }, "synchronizeLinkData");
  // });

 
  goJSDiagram.nodeTemplate =
    $(go.Node, "Auto",  
      new go.Binding("location", 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
        new go.Binding("fill", "color")),
      $(go.TextBlock,
        { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, 
        new go.Binding("text", "key"))
    );
    goJSDiagram.addDiagramListener("SelectionMoved", e => {
      const selectedNode = e.diagram.selection.first();
      const key = selectedNode.key;
      const x =  selectedNode.location.x;
      const y =  selectedNode.location.y;
      updateNode(key, {
        loc: go.Point.stringify(new go.Point(x, y)),
      });
    });
  // afterTransaction jakie dane
  return {
    initDiagram: () => {
      const key = 'A';
      nodes.set(key, 
        { 
          key, 
          color: "lightgreen", 
          loc: go.Point.stringify(new go.Point(Math.random() * 100, Math.random() * 100)) },
      );
    },
    addNode: () => {
      const key = `${Math.ceil(Math.random()*100)}`;
      nodes.set(key, 
        { 
          key, 
          color: "lightblue", 
          loc: go.Point.stringify(new go.Point(Math.random() * 100, Math.random() * 100)) },
      );
    },
    setNodeColor: (key) => {
      updateNode(key, {
        color: "orange",
      }) 
    },
    removeNode:() => {
      nodes.delete(0);
    },
    clean: () => {
      nodes.forEach((value, key) => {
        nodes.delete(key);
      });
    },

    // add: () => {
    //   arr.push([myId]);
    // },
    // pop: () => {
    //   arr.delete(0);
    // },
    // display: () => {
    //   console.log(arr.toJSON());
    // },
  };
};
