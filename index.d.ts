declare module "solc" {
  export type ReadCallbackResult = { contents: string } | { error: string };
  export type ReadCallback = (path: string) => ReadCallbackResult;
  export function compile(input: string, readCallback?: ReadCallback): string;
}
