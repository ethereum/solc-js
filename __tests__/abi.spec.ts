import abi = require("../src/abi");
import {
  ABI
} from "../src/abi";

let constructorAbi: ABI = {
  type: 'constructor',
  inputs: [],
  payable: true,
  stateMutability: 'payable'
}

let constructorNonPayableAbi: ABI = {
  inputs: [],
  payable: false,
  stateMutability: 'nonpayable',
  type: 'constructor'
}

let fallbackAbi: ABI = {
  payable: true,
  stateMutability: 'payable',
  type: 'fallback'
}

let functionAbi: ABI = {
  inputs: [],
  payable: true,
  stateMutability: 'payable',
  type: 'function'
}

let functionViewAbi: ABI = {
  inputs: [],
  constant: true,
  stateMutability: 'view',
  type: 'function'
}

let functionNonPayableAbi: ABI = {
  inputs: [],
  payable: false,
  stateMutability: 'pure',
  type: 'function'
}

let fallbackNonPayableAbi: ABI = {
  type: 'fallback',
  stateMutability: 'nonpayable'
}

let eventAbi: ABI = {
  inputs: [],
  type: 'event'
}


describe("ABI translator", () => {

  test("Empty ABI", () => {
    expect(abi.update("0.4.0", [])).toEqual([]);
  });
  test("0.1.1 (no constructor)", () => {
    expect(abi.update("0.1.1", [])).toEqual([constructorAbi, fallbackAbi]);
  });
  test("0.3.6 (constructor)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'constructor' }];
    expect(abi.update("0.3.6", input)).toEqual([constructorAbi, fallbackAbi]);
  });
  test("0.3.6 (function)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'function' }];
    expect(abi.update("0.3.6", input)).toEqual([functionAbi, fallbackAbi]);
  });
  test("0.3.6 (event)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'event' }];
    expect(abi.update("0.3.6", input)).toEqual([eventAbi, fallbackAbi]);
  });
  test("0.3.6 (has no fallback)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'constructor' }];
    expect(abi.update("0.3.6", input)).toEqual([constructorAbi, fallbackAbi]);
  });
  test("0.4.0 (has fallback)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'constructor' }, { type: 'fallback' }];
    expect(abi.update("0.4.0", input)).toEqual([constructorAbi, fallbackNonPayableAbi]);
  });
  test("0.4.0 (constant function)", () => {
    let input: Array<ABI> = [{ inputs: [], type: 'function', constant: true }];
    expect(abi.update("0.4.0", input)).toEqual([functionViewAbi]);
  });
  test("0.4.1 (constructor not payable)", () => {
    let input: Array<ABI> = [{ inputs: [], payable: false, type: 'constructor' }];
    expect(abi.update("0.4.1", input)).toEqual([constructorAbi]);
  });
  test("0.4.5 (constructor payable)", () => {
    let input: Array<ABI> = [{ inputs: [], payable: false, type: 'constructor' }];
    expect(abi.update("0.4.5", input)).toEqual([constructorNonPayableAbi]);
  });
  test("0.4.16 (statemutability)", () => {
    let input: Array<ABI> = [{ inputs: [], payable: false, stateMutability: 'pure', type: 'function' }];
    expect(abi.update("0.4.16", input)).toEqual([functionNonPayableAbi]);
  });
});
