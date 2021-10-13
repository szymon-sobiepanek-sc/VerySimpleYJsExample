## Standard Lerna/Yarn stuff to get started

1. `lerna bootstrap`
2. `yarn`

## How to run

There are three commands to run:

1. `yarn workspace crdt run run` (any time you change the index.html, kill this process and restart)
2. `yarn workspace crdt watch` (runs rollup in watch mode for changes to the crdt javascript files)
3. `yarn run:ws` (runs the websocket server)
4. Open up `http://localhost:8000` in multiple browsers

To test and see what happens:

1. Open up the devtools console
2. Type any of these into the console:
   - `actions.add()` adds your random id to the shared state
   - `actions.pop()` removes the head of the shared state
   - `actions.display()` prints out the shared state
