// bloom.js：两个位置与置位
export function slotsFor(name, bits) {
  const text = String(name);
  let sum = 0;
  for (let index = 0; index < text.length; index += 1) {
    sum += text.charCodeAt(index);
  }
  return [sum % bits, (sum * 3 + 1) % bits];
}

export function setBit(bitmap, index) {
  const next = bitmap.slice();
  while (next.length <= index) next.push(0);
  next[index] = 1;
  return next;
}
