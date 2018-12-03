declare module "solc" {
  export function version(): string;
  export function semver(): string;
  export function license(): string;

  export let features: {
    legacySingleInput: boolean,
    multipleInputs: boolean,
    importCallback: boolean,
    nativeStandardJSON: boolean,
  };

  export type ReadCallbackResult = { contents: string } | { error: string };
  export type ReadCallback = (path: string) => ReadCallbackResult;
  export function compile(input: string, readCallback?: ReadCallback): string;
}
