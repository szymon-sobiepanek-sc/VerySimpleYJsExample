import * as go from "gojs";
import * as Y from "yjs";
import throttle from 'lodash/throttle';
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
      { margin: 8, font: "bold 14px sans-serif", stroke: '#333', editable: true }, 
      new go.Binding("text", "text").makeTwoWay()
      )
  ),
});

const MOUSE_THROTTLE = 10;

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

  awareness.setLocalStateField('id', myId);
  
  awareness.on('change', changes => {
    Array.from(awareness.getStates().values()).forEach(user => {
      if (user.id !== myId) {
        upsertPosition(user);
      }
    });
  })

  const handler = throttle((event) => {
    const position = {
      x: event.x - divRect.x + goJSDiagram.viewportBounds.x,
      y: event.y - divRect.y + goJSDiagram.viewportBounds.y,
    }
    awareness.setLocalStateField('position', position);
  }, MOUSE_THROTTLE)
  goJSDiagram.div.addEventListener('mousemove', handler);


  const nodes = ydoc.getMap("nodes");
  
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

    goJSDiagram.addDiagramListener("TextEdited", e => {
      const text = e.subject.text;
      const key = e.subject.part.key;
      updateNode(key, {
        text,
      });
    });

  return {
    initDiagram: () => {
      const key = 'A';
      nodes.set(key, 
        { 
          text: "new node",
          key, 
          color: "lightgreen", 
          loc: go.Point.stringify(new go.Point(Math.random() * 100, Math.random() * 100)) },
      );
    },
    addNode: () => {
      const key = `${Math.ceil(Math.random()*100)}`;
      nodes.set(key, 
        { 
          text: "new node",
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
    clean: () => {
      nodes.forEach((value, key) => {
        nodes.delete(key);
      });
    },
  };
};
