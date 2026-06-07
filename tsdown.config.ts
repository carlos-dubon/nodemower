import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  dts: true,
  clean: true,
  shims: false,
  treeshake: true,
  // We ship "type": "module", so emit plain .js / .d.ts (not .mjs / .d.mts).
  fixedExtension: false,
});
