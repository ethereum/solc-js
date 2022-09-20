import { setupCore } from './core';
import { getSupportedMethods } from './helpers';
import { setupCompile } from './compile';

export default function setupBindings (solJson) {
  const coreBindings = setupCore(solJson);
  const compileBindings = setupCompile(solJson, coreBindings);
  const methodFlags = getSupportedMethods(solJson);

  return {
    methodFlags,
    coreBindings,
    compileBindings
  };
}
