declare module "solc" {
  export function version(): string;
  export function semver(): string;
  export function license(): string;

  export let lowlevel: {
    compileSingle: function(input: string): string;
    compileMulti: function(input: string): string;
    compileCallback: function(input: string): string;
    compileStandard: function(input: string): string;
  };

  export let features: {
    legacySingleInput: boolean,
    multipleInputs: boolean,
    importCallback: boolean,
    nativeStandardJSON: boolean,
  };

  export type ReadCallbackResult = { contents: string } | { error: string };
  export type ReadCallback = (path: string) => ReadCallbackResult;
  export type Callbacks = { import: ReadCallback };
  export function compile(input: string, readCallback?: Callbacks | ReadCallback): string;
}
