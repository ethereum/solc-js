import { CompileBindings, CoreBindings, SolJson, SupportedMethods } from '../common/types';

import { setupCore } from './core';
import { getSupportedMethods } from './helpers';
import { setupCompile } from './compile';

export default function setupBindings (solJson: SolJson): {
  coreBindings: CoreBindings,
  compileBindings: CompileBindings,
  methodFlags: SupportedMethods,
} {
  const coreBindings = setupCore(solJson);
  const compileBindings = setupCompile(solJson, coreBindings);
  const methodFlags = getSupportedMethods(solJson);

  return {
    methodFlags,
    coreBindings,
    compileBindings
  };
}
