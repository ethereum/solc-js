import { SolJson, SupportedMethods } from '../common/types';
import { isNil } from '../common/helpers';

export function bindSolcMethod<T> (solJson: SolJson, method: string, returnType: string, args: string[], defaultValue: T): T {
  if (isNil(solJson[`_${method}`]) && defaultValue !== undefined) {
    return defaultValue;
  }

  return solJson.cwrap(method, returnType, args);
}

export function bindSolcMethodWithFallbackFunc<T> (solJson: SolJson, method: string, returnType: string, args: string[], fallbackMethod: string, finalFallback: any = undefined): T {
  const methodFunc = bindSolcMethod(solJson, method, returnType, args, null);

  if (!isNil(methodFunc)) {
    return methodFunc;
  }

  return bindSolcMethod(solJson, fallbackMethod, returnType, args, finalFallback);
}

export function getSupportedMethods (solJson: SolJson): SupportedMethods {
  return {
    licenseSupported: anyMethodExists(solJson, 'solidity_license'),
    versionSupported: anyMethodExists(solJson, 'solidity_version'),
    allocSupported: anyMethodExists(solJson, 'solidity_alloc'),
    resetSupported: anyMethodExists(solJson, 'solidity_reset'),
    compileJsonSupported: anyMethodExists(solJson, 'compileJSON'),
    compileJsonMultiSupported: anyMethodExists(solJson, 'compileJSONMulti'),
    compileJsonCallbackSupported: anyMethodExists(solJson, 'compileJSONCallback'),
    compileJsonStandardSupported: anyMethodExists(solJson, 'compileStandard', 'solidity_compile')
  };
}

function anyMethodExists (solJson: SolJson, ...names: string[]): boolean {
  return names.some(name => !isNil(solJson[`_${name}`]));
}
