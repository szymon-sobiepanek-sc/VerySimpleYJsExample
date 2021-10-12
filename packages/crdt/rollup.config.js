import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "lib/crdt.js",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    name: "crdt",
  },
  plugins: [commonjs(), resolve(), babel({ babelHelpers: "bundled" })],
};
