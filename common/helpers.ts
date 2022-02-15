/**
 * Returns true if and only if the value is null or undefined.
 *
 * @param value
 */
export function isNil (value: any): boolean {
  // Uses == over === which compares both null and undefined.
  return value == null;
}

/**
 * Returns true if and only if the value is an object and not an array.
 *
 * @param value
 */
export function isObject (value: any): boolean {
  // typeof [] will result in an 'object' so this additionally uses Array.isArray
  // to confirm it's just an object.
  return typeof value === 'object' && !Array.isArray(value);
}
