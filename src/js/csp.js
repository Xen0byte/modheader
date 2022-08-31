export function toCspString(cspMap) {
  return Object.entries(cspMap)
    .map(([name, value]) => `${name} ${value}`)
    .join('; ');
}
