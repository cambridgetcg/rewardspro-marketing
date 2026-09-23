/** Retired acquisition entrypoint, including historical --force/--dry-run flags. */
import { evaluateWave } from "./waves/wave-engine.js";

console.log(evaluateWave().reason);
