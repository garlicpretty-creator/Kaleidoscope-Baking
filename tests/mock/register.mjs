// Maps "@minecraft/server" to the in-memory mock for Node tests.
import { register } from "node:module";
register(new URL("./loader.mjs", import.meta.url));
