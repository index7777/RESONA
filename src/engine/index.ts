export type * from './ir.ts';
export { renderProgram, estimateDuration, encodeWav, resolveNum, nominal, ENGINE_VERSION } from './render.ts';
export type { RenderOptions, RenderResult } from './render.ts';
export { validateProgram } from './schema.ts';
export { physicalLibrary, physicalOrder, clonePhysical } from './library.ts';
export type { PhysicalId } from './library.ts';
