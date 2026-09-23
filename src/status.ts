/** Read existing local records without changing them or making network calls. */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateWave } from "./waves/wave-engine.js";

console.log(evaluateWave().reason);
for (const file of ["metrics-cache.json", "wave-state.json"]) {
  const path = resolve(import.meta.dirname, "../data", file);
  console.log(`\nHistorical local record: ${file}`);
  console.log(existsSync(path) ? readFileSync(path, "utf8") : "No record present.");
}
