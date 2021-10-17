import * as go from "gojs";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
// import { createCursorTemplate } from "./coursorTemplate.js";

const $ = go.GraphObject.make;

const TEXT_BLOCK_NAME = 'TEXT_BLOCK';
const TEXT_PADDING = 8;

export const usernamePanel = (
    properties,
    ...children
) => $(
    go.Panel,
    go.Panel.Spot,
    {
        alignment: new go.Spot(0, 0, 20, 20),
        alignmentFocus: new go.Spot(0, 0),
        ...properties
    },
    ...children
);

export const usernameBackground = (...bindings) => $(
    go.Shape,
    'RoundedRectangle',
    {
        alignment: go.Spot.LeftCenter,
        alignmentFocus: go.Spot.LeftCenter,
        strokeWidth: 0,
    },
    new go.Binding('desiredSize', '', (textBlock) => {
        textBlock.part.ensureBounds();

        const { width } = textBlock.actualBounds;
        return new go.Size(width + 2 * TEXT_PADDING, 25);
    }).ofObject(TEXT_BLOCK_NAME),
    ...bindings
);

export const usernameText = (...bindings) => $(
    go.TextBlock,
    {
        name: TEXT_BLOCK_NAME,
        font: `14px Arial`,
        stroke: "white",
        alignment: new go.Spot(0, 0.5, TEXT_PADDING, 0),
        alignmentFocus: go.Spot.LeftCenter,
    },
    ...bindings
);

// eslint-disable-next-line max-len
const geometryString = 'M 0.192806,0 4.6417128,12 6.888184,6.691651 11.807194,4.5366539 Z';

export const updatePosition = (
    cursor,
    newLocation
) => {
    cursor.diagram.model.setDataProperty(cursor.data, 'loc', newLocation);
};

const arrow = () => $(
    go.Shape,
    {
        geometryString: go.Geometry.fillPath(geometryString),
        desiredSize: new go.Size(25, 25),
        alignment: go.Spot.TopLeft,
        alignmentFocus: go.Spot.TopLeft,
        stroke: 'transparent'
    },
    new go.Binding('fill', 'color')
);

const cursor = (...children) => $(
    go.Node,
    go.Panel.Spot,
    new go.Binding("location", 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
    {
        pickable: false,
        selectable: false,
    },
    ...children
);

export const createCursorTemplate = () => ({
    category: "cursor",
    template: cursor(
        arrow(),
        usernamePanel(
            {
                alignment: new go.Spot(0, 0, 20, 20),
                alignmentFocus: new go.Spot(0, 0)
            },
            usernameBackground(new go.Binding('fill', 'color')),
            usernameText(new go.Binding('text', 'username'))
        )
    )
});

// import { createNodeTemplate } from "./nodeTemplate.js";

export const createNodeTemplate = () => ({
  category: 'node',
  template: $(go.Node, go.Panel.Auto,  
      new go.Binding("location", 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
      new go.Binding("fill", "color")),
      $(go.TextBlock,
      { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, 
      new go.Binding("text", "key"))
  ),
});


const divRect = {
  x: 10,
  y: 10,
};

const userColors = [
  "lightblue",
  "orange",
  "lightgreen",
  "pink",
  "green",
];

export const bundle = () => {
  const goJSDiagram =
    $(go.Diagram, "goJSDiagramDiv");

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
  
  const templates = new go.Map(); // In TypeScript you could write: new go.Map<string, go.Node>();
  
  const coursorTemplate = createCursorTemplate();
  const nodeTemplate = createNodeTemplate();
  
  templates.add(coursorTemplate.category, coursorTemplate.template);
  templates.add(nodeTemplate.category, nodeTemplate.template);
  
  goJSDiagram.nodeTemplateMap = templates;

  const getUserLoc = (user) => 
   go.Point.stringify(new go.Point(user.position.x, user.position.y));

  
  const getUserCoursorKey= (user) => `user${user.id}`;

  const updateCoursorNode = (user) => {
    const model = goJSDiagram.model;
    const cursorData = model.findNodeDataForKey(getUserCoursorKey(user));
    model.startTransaction("modified property");
    model.set(cursorData, "loc", getUserLoc(user));
    goJSDiagram.updateAllTargetBindings();
    console.log(cursorData.loc ,user.position.x, user.position.y);
    model.commitTransaction("modified property");
  };

  const addCoursorNode = (user) => {
    const model = goJSDiagram.model;
    if(user.position) {
      model.startTransaction("modified property");    
      model.addNodeData({
        key: getUserCoursorKey(user),
        loc: getUserLoc(user),
        color: userColors[ Math.ceil(Math.random() * 100) % userColors.length ], 
        category: coursorTemplate.category,
        username: user.id,
      });
      model.commitTransaction("modified property");
    }
  };

  const upsertPosition = (user) => {
    const cursorNode = goJSDiagram.findNodeForKey(getUserCoursorKey(user));
    if (cursorNode) {
      updateCoursorNode(user);
    } else {
      addCoursorNode(user);
    }
  };
  
  const awareness = provider.awareness

  // You can observe when a user updates their awareness information
  awareness.on('change', changes => {
    // Whenever somebody updates their awareness information,
    // we log all awareness information from all users.
    console.log(Array.from(awareness.getStates().values()))
    Array.from(awareness.getStates().values()).forEach(user => {
      if (user.id !== myId) {
        upsertPosition(user);
      }
    });
  })

    // You can think of your own awareness information as a key-value store.
    // We update our "user" field to propagate relevant user information.
  awareness.setLocalStateField('id', myId);

  const nodes = ydoc.getMap("nodes");
  // const links = ydoc.getArray("links");
  
  const updateNode = (key, update) => {
    const current = nodes.get(key);
      nodes.set(key, {
        ...current,
        ...update,
      });
  };

  // ydoc.on('afterTransaction', (transaction, nodesAfterTransaction ) => {
  //   console.log(transaction);
  // });

  nodes.observe((event) => {
    console.log('nodes changed');
    console.log(event.changes)
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


    goJSDiagram.addDiagramListener("SelectionMoved", e => {
      const selectedNode = e.diagram.selection.first();
      const key = selectedNode.key;
      const x =  selectedNode.location.x;
      const y =  selectedNode.location.y;
      updateNode(key, {
        loc: go.Point.stringify(new go.Point(x, y)),
      });
    });

  const handler = (event) => {
    const position = {
      x: event.x - divRect.x - goJSDiagram.viewportBounds.x,
      y: event.y - divRect.y - goJSDiagram.viewportBounds.y,
      id: myId,
    }
    awareness.setLocalStateField('position', position);
  }
  goJSDiagram?.div.addEventListener('mousemove', handler);

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
          category: nodeTemplate.category,
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
  };
};
