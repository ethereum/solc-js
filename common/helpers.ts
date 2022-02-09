/**
 * returns true if and only if the value is null or undefined.
 * Uses == over === which compares both null and undefined.
 * @param value
 */
function isNil (value: any): boolean {
  return value == null;
}

/**
 * returns true if and only if the value is a object and not an array
 *
 * typeof [] will result in a 'object' so this additonally uses Array.isArray
 * to confirm its just a object.
 *
 * @param value
 */
function isObject (value: any): boolean {
  return typeof value === 'object' && !Array.isArray(value);
}

export {
  isNil, isObject
};
