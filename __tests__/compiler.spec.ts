import linker = require("../linker.js");
import solc = require("../index");
import * as semver from "semver";
const axios = require("axios");
const fs = require("fs");
import { execSync } from "child_process";
/*
import {
  getBytecode,
  getBytecodeStandard,
  getGasEstimate,
  expectError,
  expectNoError
} from "./helpers";
*/

/*
async function download(version: string) {
  let url: string = `https://ethereum.github.io/solc-bin/bin/soljson-${version}.js`;
  let path: string = `/tmp/${version}.js`;
  let writer: any = fs.createWriteStream(path);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// New compiler interface features 0.1.6, 0.2.1, 0.4.11, 0.5.0, etc.
// 0.4.0 added pragmas (used in tests above)
const versions: Array<string> = [
  "v0.1.1+commit.6ff4cd6",
  "v0.1.6+commit.d41f8b7",
  "v0.2.0+commit.4dc2445",
  "v0.2.1+commit.91a6b35",
  "v0.3.6+commit.3fc68da",
  "v0.4.0+commit.acd334c9",
  "v0.4.11+commit.68ef5810",
  "v0.4.12+commit.194ff033",
  "v0.4.26+commit.4563c3fc",
  "latest"
];
*/

/*
const solcs: Array<string> = [];

async function initialize() {
  let promises: Array<any> = [];
  versions.forEach(version => {
    promises.push(download(version));
  });

  let results = await Promise.all(promises);
  versions.forEach(version => {
    const newSolc = require("../wrapper.js")(require(`/tmp/${version}.js`));
    solcs.push(newSolc);
  });
}
*/
function runTests(solc, versionText) {
  console.log(`Running tests with ${versionText} ${solc.version()}`);

  function getBytecode(output: any, fileName: string, contractName: string) {
    try {
      let outputContract;
      if (semver.lt(solc.semver(), "0.4.9")) {
        outputContract = output["contracts"][contractName];
      } else {
        outputContract = output["contracts"][fileName + ":" + contractName];
      }
      return outputContract["bytecode"];
    } catch (e) {
      return "";
    }
  }
  
  function getBytecodeStandard(
    output: any,
    fileName: string,
    contractName: string
  ) {
    try {
      let outputFile;
      if (semver.lt(solc.semver(), "0.4.9")) {
        outputFile = output.contracts[""];
      } else {
        outputFile = output.contracts[fileName];
      }
      return outputFile[contractName]["evm"]["bytecode"]["object"];
    } catch (e) {
      return "";
    }
  }
  
  function getGasEstimate(output: any, fileName: string, contractName: string) {
    try {
      var outputFile;
      if (semver.lt(solc.semver(), "0.4.9")) {
        outputFile = output.contracts[""];
      } else {
        outputFile = output.contracts[fileName];
      }
      return outputFile[contractName]["evm"]["gasEstimates"];
    } catch (e) {
      return "";
    }
  }
  
  function expectError(output: any, errorType: any, message: string) {
    if (output.errors) {
      for (let error in output.errors) {
        error = output.errors[error];
        if (error["type"] === errorType) {
          if (message) {
            if (error["message"].match(message) !== null) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  function expectNoError(output: any) {
    if (output["errors"]) {
      for (let error in output["errors"]) {
        error = output["errors"][error];
        if (error["severity"] === "error") {
          return false;
        }
      }
    }
    return true;
  }

  describe(versionText, () => {
    describe("Version and license", () => {
      test("check version", () => {
        expect(typeof solc.version()).toBe("string");
      });
      test("check semver", () => {
        expect(typeof solc.semver()).toBe("string");
      });
      test("check license", () => {
        expect(
          typeof solc.license() === "undefined" ||
            typeof solc.license() === "string"
        ).toBeTruthy();
      });
    });
  });

  describe("Compilation", () => {
    test("single files can be compiled (using lowlevel API)", () => {
      if (typeof solc.lowlevel.compileSingle !== "function") {
        console.log(
          "Low-level compileSingle interface not implemented by this compiler version."
        );
        return;
      }

      let output = JSON.parse(
        solc.lowlevel.compileSingle("contract A { function g() public {} }")
      );
      expect(output["contracts"]).toBeTruthy();
      let bytecode = getBytecode(output, "", "A");
      expect(typeof bytecode).toBe("string");
      expect(bytecode.length).toBeGreaterThan(0);
    });

    test("invalid source code fails properly (using lowlevel API)", () => {
      // TODO: try finding an example which doesn't crash it?
      if (semver.eq(solc.semver(), "0.4.11")) {
        console.log("Skipping on broken compiler version");
        return;
      }

      if (typeof solc.lowlevel.compileSingle !== "function") {
        console.log(
          "Low-level compileSingle interface not implemented by this compiler version."
        );
        return;
      }

      let output = JSON.parse(
        solc.lowlevel.compileSingle(
          "contract x { this is an invalid contract }"
        )
      );
      if (semver.lt(solc.semver(), "0.1.4")) {
        expect(
          output.error.indexOf("Parser error: Expected identifier")
        ).not.toBe(-1);
        return;
      }

      expect("errors" in output);
      // Check if the ParserError exists, but allow others too
      expect(output.errors.length).toBeGreaterThanOrEqual(1);
      for (let error in output.errors) {
        // Error should be something like:
        //   ParserError
        //   Error: Expected identifier
        //   Parser error: Expected identifier
        expect(
          output.errors[error].indexOf("ParserError") !== -1 ||
            output.errors[error].indexOf("Error: Expected identifier") !== -1 ||
            output.errors[error].indexOf(
              "Parser error: Expected identifier"
            ) !== -1 ||
            output.errors[error].indexOf(": Expected identifier") !== -1 // 0.4.12
        ).toBeTruthy();
      }
    });

    test("multiple files can be compiled (using lowlevel API)", () => {
      // <0.1.6 doesn't have this
      if (typeof solc.lowlevel.compileMulti !== "function") {
        console.log(
          "Low-level compileMulti interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "a.sol":
          "contract A { function f() public returns (uint) { return 7; } }",
        "b.sol":
          'import "a.sol"; contract B is A { function g() public { f(); } }'
      };
      let output = JSON.parse(
        solc.lowlevel.compileMulti(JSON.stringify({ sources: input }))
      );
      let B = getBytecode(output, "b.sol", "B");
      expect(typeof B).toBe("string");
      expect(B.length).toBeGreaterThan(0);
      let A = getBytecode(output, "a.sol", "A");
      expect(typeof A).toBe("string");
      expect(A.length).toBeGreaterThan(0);
    });

    test("lazy-loading callback works (using lowlevel API)", () => {
      // <0.2.1 doesn't have this
      if (typeof solc.lowlevel.compileCallback !== "function") {
        console.log(
          "Low-level compileCallback interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "b.sol":
          'import "a.sol"; contract B is A { function g() public { f(); } }'
      };

      function findImports(path) {
        if (path === "a.sol") {
          return {
            contents:
              "contract A { function f() public returns (uint) { return 7; } }"
          };
        } else {
          return { error: "File not found" };
        }
      }

      let output = JSON.parse(
        solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, {
          import: findImports
        })
      );
      let B = getBytecode(output, "b.sol", "B");
      expect(typeof B).toBe("string");
      expect(B.length).toBeGreaterThan(0);
      var A = getBytecode(output, "a.sol", "A");
      expect(typeof A).toBe("string");
      expect(A.length).toBeGreaterThan(0);
    });

    test("lazy-loading callback works (with file not found) (using lowlevel API)", () => {
      // <0.2.1 doesn't have this
      if (typeof solc.lowlevel.compileCallback !== "function") {
        console.log(
          "Low-level compileCallback interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "b.sol": 'import "a.sol"; contract B { function g() public { f(); } }'
      };
      function findImports(path) {
        return { error: "File not found" };
      }
      let output = JSON.parse(
        solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, {
          import: findImports
        })
      );
      expect("errors" in output);
      // Check if the ParserError exists, but allow others too
      expect(output.errors.length).toBeGreaterThanOrEqual(1);
      for (var error in output.errors) {
        // Error should be something like:
        //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File not found
        //   cont.sol:1:1: Error: Source "lib.sol" not found: File not found
        expect(
          (output.errors[error].indexOf("Error") !== -1 &&
            output.errors[error].indexOf("File not found") !== -1) ||
            output.errors[error].indexOf("not found: File not found") !== -1
        ).toBeTruthy();
      }
    });

    test("lazy-loading callback works (with exception) (using lowlevel API)", () => {
      // <0.2.1 doesn't have this
      if (typeof solc.lowlevel.compileCallback !== "function") {
        console.log(
          "Low-level compileCallback interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "b.sol": 'import "a.sol"; contract B { function g() public { f(); } }'
      };

      function findImports(path) {
        throw new Error("Could not implement this interface properly...");
      }

      expect(() => {
        solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, {
          import: findImports
        });
      }).toThrow("Could not implement this interface properly...");
    });

    test("lazy-loading callback fails properly (with invalid callback) (using lowlevel API)", () => {
      // <0.2.1 doesn't have this
      if (typeof solc.lowlevel.compileCallback !== "function") {
        console.log(
          "Low-level compileCallback interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "cont.sol":
          'import "lib.sol"; contract x { function g() public { L.f(); } }'
      };
      expect(() => {
        solc.lowlevel.compileCallback(
          JSON.stringify({ sources: input }),
          0,
          "this isn't a callback"
        );
      }).toThrowError("Invalid callback object specified.");
    });

    test("file import without lazy-loading callback fails properly (using lowlevel API)", () => {
      // <0.2.1 doesn't have this
      if (typeof solc.lowlevel.compileCallback !== "function") {
        console.log(
          "Low-level compileCallback interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        "b.sol":
          'import "a.sol"; contract B is A { function g() public { f(); } }'
      };
      let output = JSON.parse(
        solc.lowlevel.compileCallback(JSON.stringify({ sources: input }))
      );
      expect("errors" in output).toBeTruthy();
      // Check if the ParserError exists, but allow others too
      expect(output.errors.length).toBeGreaterThanOrEqual(1);
      for (let error in output.errors) {
        // Error should be something like:
        //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File import callback not supported
        //   cont.sol:1:1: Error: Source "lib.sol" not found: File import callback not supported
        expect(
          (output.errors[error].indexOf("Error") !== -1 &&
            output.errors[error].indexOf(
              "File import callback not supported"
            ) !== -1) ||
            output.errors[error].indexOf(
              "not found: File import callback not supported"
            ) !== -1
        ).toBeTruthy();
      }
    });

    test("compiling standard JSON (using lowlevel API)", () => {
      if (typeof solc.lowlevel.compileStandard !== "function") {
        console.log(
          "Low-level compileStandard interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "a.sol": {
            content:
              "contract A { function f() public returns (uint) { return 7; } }"
          },
          "b.sol": {
            content:
              'import "a.sol"; contract B is A { function g() public { f(); } }'
          }
        }
      };

      function bytecodeExists(output, fileName, contractName) {
        try {
          return (
            output.contracts[fileName][contractName]["evm"]["bytecode"][
              "object"
            ].length > 0
          );
        } catch (e) {
          return false;
        }
      }

      let output = JSON.parse(
        solc.lowlevel.compileStandard(JSON.stringify(input))
      );
      expect(bytecodeExists(output, "a.sol", "A")).toBeTruthy();
      expect(bytecodeExists(output, "b.sol", "B")).toBeTruthy();
    });

    test("invalid source code fails properly with standard JSON (using lowlevel API)", () => {
      // TODO: try finding an example which doesn't crash it?
      if (semver.eq(solc.semver(), "0.4.11")) {
        console.log("Skipping on broken compiler version");
        return;
      }

      if (typeof solc.lowlevel.compileStandard !== "function") {
        console.log(
          "Low-level compileStandard interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "x.sol": {
            content: "contract x { this is an invalid contract }"
          }
        }
      };
      let output = JSON.parse(
        solc.lowlevel.compileStandard(JSON.stringify(input))
      );
      expect("errors" in output).toBeTruthy();
      expect(output.errors.length).toBeGreaterThanOrEqual(1);
      // Check if the ParserError exists, but allow others too
      for (let error in output.errors) {
        expect(output.errors[error].type).toBe("ParserError");
      }
    });

    test("compiling standard JSON (with callback) (using lowlevel API)", () => {
      if (typeof solc.lowlevel.compileStandard !== "function") {
        console.log(
          "Low-level compileStandard interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "b.sol": {
            content:
              'import "a.sol"; contract B is A { function g() public { f(); } }'
          }
        }
      };

      function findImports(path) {
        if (path === "a.sol") {
          return {
            contents:
              "contract A { function f() public returns (uint) { return 7; } }"
          };
        } else {
          return { error: "File not found" };
        }
      }

      function bytecodeExists(output, fileName, contractName) {
        try {
          return (
            output.contracts[fileName][contractName]["evm"]["bytecode"][
              "object"
            ].length > 0
          );
        } catch (e) {
          return false;
        }
      }

      let output = JSON.parse(
        solc.lowlevel.compileStandard(JSON.stringify(input), {
          import: findImports
        })
      );
      expect(bytecodeExists(output, "a.sol", "A")).toBeTruthy();
      expect(bytecodeExists(output, "b.sol", "B")).toBeTruthy();
    });

    test("compiling standard JSON (single file)", () => {
      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode", "evm.gasEstimates"]
            }
          }
        },
        sources: {
          "c.sol": {
            content:
              "contract C { function g() public { } function h() internal {} }"
          }
        }
      };

      let output = JSON.parse(solc.compile(JSON.stringify(input)));
      expect(expectNoError(output));
      let C = getBytecodeStandard(output, "c.sol", "C");
      expect(typeof C === "string").toBeTruthy();
      expect(C.length).toBeGreaterThan(0);
      let CGas = getGasEstimate(output, "c.sol", "C");
      expect(typeof CGas === "object").toBeTruthy();
      expect(typeof CGas["creation"] === "object").toBeTruthy();
      expect(
        typeof CGas["creation"]["codeDepositCost"] === "string"
      ).toBeTruthy();
      expect(typeof CGas["external"] === "object").toBeTruthy();
      expect(typeof CGas["external"]["g()"] === "string").toBeTruthy();
      expect(typeof CGas["internal"] === "object").toBeTruthy();
      expect(typeof CGas["internal"]["h()"] === "string").toBeTruthy();
    });

    test("compiling standard JSON (multiple files)", () => {
      // <0.1.6 doesn't have this
      if (!solc.features.multipleInputs) {
        console.log("Not supported by solc");
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode", "evm.gasEstimates"]
            }
          }
        },
        sources: {
          "a.sol": {
            content:
              "contract A { function f() public returns (uint) { return 7; } }"
          },
          "b.sol": {
            content:
              'import "a.sol"; contract B is A { function g() public { f(); } function h() internal {} }'
          }
        }
      };

      let output = JSON.parse(solc.compile(JSON.stringify(input)));
      expect(expectNoError(output)).toBeTruthy();
      var B = getBytecodeStandard(output, "b.sol", "B");
      expect(typeof B === "string").toBeTruthy();
      expect(B.length).toBeGreaterThan(0);
      expect(Object.keys(linker.findLinkReferences(B)).length).toBe(0);
      var BGas = getGasEstimate(output, "b.sol", "B");
      expect(typeof BGas).toBe("object");
      expect(typeof BGas["creation"]).toBe("object");
      expect(typeof BGas["creation"]["codeDepositCost"]).toBe("string");
      expect(typeof BGas["external"]).toBe("object");
      expect(typeof BGas["external"]["g()"]).toBe("string");
      expect(typeof BGas["internal"]).toBe("object");
      expect(typeof BGas["internal"]["h()"]).toBe("string");
      let A = getBytecodeStandard(output, "a.sol", "A");
      expect(typeof A).toBe("string");
      expect(A.length).toBeGreaterThan(0);
    });

    test("compiling standard JSON (abstract contract)", () => {
      // <0.1.6 doesn't have this
      if (!solc.features.multipleInputs) {
        console.log("Not supported by solc");
        return;
      }

      let isVersion6 = semver.gt(solc.semver(), "0.5.99");
      let source;
      if (isVersion6) {
        source = "abstract contract C { function f() public virtual; }";
      } else {
        source = "contract C { function f() public; }";
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode", "evm.gasEstimates"]
            }
          }
        },
        sources: {
          "c.sol": {
            content: source
          }
        }
      };

      let output = JSON.parse(solc.compile(JSON.stringify(input)));
      expect(expectNoError(output)).toBeTruthy();
      let C = getBytecodeStandard(output, "c.sol", "C");
      expect(typeof C).toBe("string");
      expect(C.length).toBe(0);
    });

    test("compiling standard JSON (with imports)", () => {
      // <0.2.1 doesn't have this
      if (!solc.features.importCallback) {
        console.log("Not supported by solc");
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "b.sol": {
            content:
              'import "a.sol"; contract B is A { function g() public { f(); } }'
          }
        }
      };

      function findImports(path) {
        if (path === "a.sol") {
          return {
            contents:
              "contract A { function f() public returns (uint) { return 7; } }"
          };
        } else {
          return { error: "File not found" };
        }
      }

      let output = JSON.parse(
        solc.compile(JSON.stringify(input), { import: findImports })
      );
      expect(expectNoError(output)).toBeTruthy();
      let A = getBytecodeStandard(output, "a.sol", "A");
      expect(typeof A === "string").toBeTruthy();
      expect(A.length).toBeGreaterThan(0);
      let B = getBytecodeStandard(output, "b.sol", "B");
      expect(typeof B).toBe("string");
      expect(B.length).toBeGreaterThan(0);
      expect(Object.keys(linker.findLinkReferences(B)).length).toBe(0);
    });

    test("compiling standard JSON (using libraries)", () => {
      // 0.4.0 has a bug with libraries
      if (semver.eq(solc.semver(), "0.4.0")) {
        console.log("Skipping on broken compiler version");
        return;
      }

      // <0.1.6 doesn't have this
      if (!solc.features.multipleInputs) {
        console.log("Not supported by solc");
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          libraries: {
            "lib.sol": {
              L: "0x4200000000000000000000000000000000000001"
            }
          },
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "lib.sol": {
            content:
              "library L { function f() public returns (uint) { return 7; } }"
          },
          "a.sol": {
            content:
              'import "lib.sol"; contract A { function g() public { L.f(); } }'
          }
        }
      };

      let output = JSON.parse(solc.compile(JSON.stringify(input)));
      expect(expectNoError(output)).toBeTruthy();
      let A = getBytecodeStandard(output, "a.sol", "A");
      expect(typeof A === "string").toBeTruthy();
      expect(A.length).toBeGreaterThan(0);
      expect(Object.keys(linker.findLinkReferences(A)).length).toBe(0);
      let L = getBytecodeStandard(output, "lib.sol", "L");
      expect(typeof L).toBe("string");
      expect(L.length).toBeGreaterThan(0);
    });

    test("compiling standard JSON (with warning >=0.4.0)", () => {
      // In 0.4.0 "pragma solidity" was added. Not including it is a warning.
      if (semver.lt(solc.semver(), "0.4.0")) {
        console.log("Not supported by solc");
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "c.sol": {
            content: "contract C { function f() public { } }"
          }
        }
      };

      let output = JSON.parse(solc.compile(JSON.stringify(input)));
      expect(
        expectError(
          output,
          "Warning",
          "Source file does not specify required compiler version!"
        )
      ).toBeTruthy();
    });

    test("compiling standard JSON (using libraries) (using lowlevel API)", () => {
      // 0.4.0 has a bug with libraries
      if (semver.eq(solc.semver(), "0.4.0")) {
        console.log("Skipping on broken compiler version");
        return;
      }

      if (typeof solc.lowlevel.compileStandard !== "function") {
        console.log(
          "Low-level compileStandard interface not implemented by this compiler version."
        );
        return;
      }

      let input = {
        language: "Solidity",
        settings: {
          libraries: {
            "lib.sol": {
              L: "0x4200000000000000000000000000000000000001"
            }
          },
          outputSelection: {
            "*": {
              "*": ["evm.bytecode"]
            }
          }
        },
        sources: {
          "lib.sol": {
            content:
              "library L { function f() public returns (uint) { return 7; } }"
          },
          "a.sol": {
            content:
              'import "lib.sol"; contract A { function g() public { L.f(); } }'
          }
        }
      };

      let output = JSON.parse(
        solc.lowlevel.compileStandard(JSON.stringify(input))
      );
      expect(expectNoError(output)).toBeTruthy();
      let A = getBytecodeStandard(output, "a.sol", "A");
      expect(typeof A).toBe("string");
      expect(A.length).toBeGreaterThan(0);
      expect(Object.keys(linker.findLinkReferences(A)).length).toBe(0);
      let L = getBytecodeStandard(output, "lib.sol", "L");
      expect(typeof L).toBe("string");
      expect(L.length).toBeGreaterThan(0);
    });

    test("compiling standard JSON (invalid JSON)", () => {
      let output = JSON.parse(solc.compile("{invalid"));
      // TODO: change wrapper to output matching error
      expect(
        expectError(
          output,
          "JSONError",
          "Line 1, Column 2\n  Missing '}' or object member name"
        ) || expectError(output, "JSONError", "Invalid JSON supplied:")
      ).toBeTruthy();
    });

    test("compiling standard JSON (invalid language)", () => {
      let output = JSON.parse(
        solc.compile(
          '{"language":"InvalidSolidity","sources":{"cont.sol":{"content":""}}}'
        )
      );
      expect(
        expectError(output, "JSONError", "supported as a language.") &&
          expectError(output, "JSONError", '"Solidity"')
      ).toBeTruthy();
    });

    test("compiling standard JSON (no sources)", () => {
      let output = JSON.parse(solc.compile('{"language":"Solidity"}'));
      expect(
        expectError(output, "JSONError", "No input sources specified.")
      ).toBeTruthy();
    });

    test("compiling standard JSON (multiple sources on old compiler)", () => {
      let output = JSON.parse(
        solc.compile(
          '{"language":"Solidity","sources":{"cont.sol":{"content":"import \\"lib.sol\\";"},"lib.sol":{"content":""}}}'
        )
      );
      if (solc.features.multipleInputs) {
        expect(expectNoError(output)).toBeTruthy();
      } else {
        expect(
          expectError(
            output,
            "JSONError",
            "Multiple sources provided, but compiler only supports single input."
          ) ||
            expectError(
              output,
              "Parser error",
              "Parser error: Source not found."
            )
        ).toBeTruthy();
      }
    });
  });

  // Only run on the latest version.
  if (versionText === "latest") {
    describe("Loading Legacy Versions", () => {
      test("loading remote version - development snapshot", () => {
        solc.loadRemoteVersion("latest", function(err, solcSnapshot) {
          if (err) {
            console.log("Network error - skipping remote loading test");
            return;
          }
          let input = {
            language: "Solidity",
            settings: {
              outputSelection: {
                "*": {
                  "*": ["evm.bytecode"]
                }
              }
            },
            sources: {
              "cont.sol": {
                content: "contract x { function g() public {} }"
              }
            }
          };
          let output = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
          let x = getBytecodeStandard(output, "cont.sol", "x");
          expect(typeof x).toBe("string");
          expect(x.length).toBeGreaterThanOrEqual(0);
        });
      });
    });
  }
}

runTests(solc, 'latest');

// New compiler interface features 0.1.6, 0.2.1, 0.4.11, 0.5.0, etc.
// 0.4.0 added pragmas (used in tests above)
const versions = [
  "v0.1.1+commit.6ff4cd6",
  "v0.1.6+commit.d41f8b7",
  "v0.2.0+commit.4dc2445",
  "v0.2.1+commit.91a6b35",
  "v0.3.6+commit.3fc68da",
  "v0.4.0+commit.acd334c9",
  "v0.4.11+commit.68ef5810",
  "v0.4.12+commit.194ff033",
  "v0.4.26+commit.4563c3fc"
];
for (var version in versions) {
  version = versions[version];
  execSync(
    `curl -o /tmp/${version}.js https://ethereum.github.io/solc-bin/bin/soljson-${version}.js`
  );
  const newSolc = require("../wrapper.js")(require(`/tmp/${version}.js`));
  runTests(newSolc, version);
}
