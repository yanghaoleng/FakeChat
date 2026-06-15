import "dotenv/config";
import { sampleProject } from "../src/shared/sampleProject";
import { ensureRuntimeDirs } from "./paths";
import { renderProject } from "./render";

await ensureRuntimeDirs();
const result = await renderProject(sampleProject);
console.log(JSON.stringify(result, null, 2));
