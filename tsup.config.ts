import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/redis-adapter.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node18",
  treeshake: true,
  minify: false
});
