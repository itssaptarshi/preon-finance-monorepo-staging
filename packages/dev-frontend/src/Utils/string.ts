// @ts-nocheck
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const formatWalletAddress = (
  address: string,
  startChars: number,
  endChars: number,
  maxDisplayLength: number
): string => {
  if (address.length > maxDisplayLength) {
    let start: string = address.substring(0, startChars);
    let end: string = address.substring(address.length - endChars, address.length);
    while (start.length + end.length < maxDisplayLength) {
      start = start + ".";
    }
    return start + end;
  }
  return address;
};
