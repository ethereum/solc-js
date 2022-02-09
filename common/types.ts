/**
 * A mapping between the library name and the target address location.
 *
 * Containing support for two level configuration.
 */
export interface LibraryPlaceholdersMapping {
  [libraryName: string]: string | { [location: string]: string };
}

/**
 * A mapping between library name and the largest offset witin the byte code.
 */
export interface LinkReferences {
  [libraryName: string]: Array<{ start: number, length: number }>;
}
