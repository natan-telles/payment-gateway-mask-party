const BASE64_URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCheckoutLeadId(uuid: string) {
  if (!UUID_PATTERN.test(uuid)) {
    throw new Error('Invalid checkout lead ID.');
  }

  const hex = uuid.replace(/-/g, '');
  const bytes = Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  );
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const chunk = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    encoded += BASE64_URL_ALPHABET[(chunk >> 18) & 63];
    encoded += BASE64_URL_ALPHABET[(chunk >> 12) & 63];
    if (second !== undefined) encoded += BASE64_URL_ALPHABET[(chunk >> 6) & 63];
    if (third !== undefined) encoded += BASE64_URL_ALPHABET[chunk & 63];
  }

  return encoded;
}

export function decodeCheckoutLeadId(value: string) {
  if (UUID_PATTERN.test(value)) return value;
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of value) {
    const digit = BASE64_URL_ALPHABET.indexOf(character);
    buffer = (buffer << 6) | digit;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
      buffer &= (1 << bits) - 1;
    }
  }

  if (bytes.length !== 16 || buffer !== 0) return null;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
