const MOCK = new URL("./server.js", import.meta.url).href;
const UI = new URL("./server-ui.js", import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === "@minecraft/server") return { url: MOCK, shortCircuit: true };
  if (specifier === "@minecraft/server-ui") return { url: UI, shortCircuit: true };
  return next(specifier, context);
}
