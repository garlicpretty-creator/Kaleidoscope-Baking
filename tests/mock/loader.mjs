const MOCK = new URL("./server.js", import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === "@minecraft/server") return { url: MOCK, shortCircuit: true };
  return next(specifier, context);
}
