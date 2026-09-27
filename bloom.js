// bloom.js：两个位置与置位
export function slotsFor(name, bits) {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return [sum % bits, (sum * 3 + 1) % bits];
}

export function setBit(bitmap, index) {
  const next = bitmap.slice();
  next[index] = 1;
  return next;
}
