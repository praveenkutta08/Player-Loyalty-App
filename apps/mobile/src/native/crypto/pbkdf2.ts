/**
 * Dependency-free PBKDF2-HMAC-SHA256 (H8) — used to store a *salted, stretched hash* of the local
 * unlock passcode instead of the raw PIN. Bare React Native ships no WebCrypto/`crypto`, and pulling
 * in a native crypto module would need pods/gradle wiring, so this is a compact, self-contained
 * implementation verified against published SHA-256 / PBKDF2 test vectors (see pbkdf2.test.ts).
 *
 * A 4–6 digit PIN has tiny entropy — the OS Keychain/Keystore is the real protection. This layer is
 * defense-in-depth: it ensures no literal PIN is ever written to (or recoverable from) storage, and
 * the iteration count raises the cost of brute-forcing an extracted blob.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const BLOCK = 64; // SHA-256 block size in bytes

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** SHA-256 of a byte array → 32-byte digest. */
export function sha256(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const bitLen = len * 8;
  // Pad: 0x80, then zeros, then 64-bit big-endian bit length, to a multiple of 64 bytes.
  const total = (((len + 8) >> 6) + 1) << 6;
  const m = new Uint8Array(total);
  m.set(msg);
  m[len] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 4, bitLen >>> 0, false);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += BLOCK) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15];
      const b = w[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((hv, i) => odv.setUint32(i * 4, hv >>> 0, false));
  return out;
}

/** HMAC-SHA256(key, message) → 32-byte MAC. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > BLOCK) k = sha256(k);
  const kPad = new Uint8Array(BLOCK);
  kPad.set(k);

  const inner = new Uint8Array(BLOCK + message.length);
  const outer = new Uint8Array(BLOCK + 32);
  for (let i = 0; i < BLOCK; i++) {
    inner[i] = kPad[i] ^ 0x36;
    outer[i] = kPad[i] ^ 0x5c;
  }
  inner.set(message, BLOCK);
  outer.set(sha256(inner), BLOCK);
  return sha256(outer);
}

/**
 * PBKDF2-HMAC-SHA256 for a single output block (dkLen ≤ 32, enough for a 256-bit key). Iterates the
 * HMAC `iterations` times, XOR-accumulating, per RFC 8018.
 */
export function pbkdf2Sha256(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  dkLen = 32,
): Uint8Array {
  if (dkLen > 32) throw new Error('pbkdf2Sha256 supports dkLen up to 32');
  // U1 = HMAC(pw, salt || INT_32_BE(1))
  const block1 = new Uint8Array(salt.length + 4);
  block1.set(salt);
  block1[salt.length + 3] = 1; // block index 1, big-endian
  let u = hmacSha256(password, block1);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(password, u);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return t.slice(0, dkLen);
}

const HEX = '0123456789abcdef';

export function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 0x0f];
  return s;
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** UTF-8 encode a string to bytes (TextEncoder where available, else a small ASCII/UTF-8 fallback). */
export function utf8(str: string): Uint8Array {
  const enc = (globalThis as { TextEncoder?: new () => { encode(s: string): Uint8Array } })
    .TextEncoder;
  if (enc) return new enc().encode(str);
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(bytes);
}

/**
 * Random salt. Prefers a CSPRNG (`crypto.getRandomValues`) when the runtime provides one; falls
 * back to `Math.random` otherwise. A salt need only be UNIQUE (not secret) to defeat precomputed
 * tables, so the fallback is acceptable — it never protects confidentiality.
 */
export function randomSalt(bytes = 16): Uint8Array {
  const out = new Uint8Array(bytes);
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < bytes; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** Length-independent constant-time comparison of two hex strings. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
