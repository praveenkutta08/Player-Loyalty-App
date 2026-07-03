import { hmacSha256, pbkdf2Sha256, sha256, toHex, utf8 } from './pbkdf2';

// Correctness is proved against published SHA-256 / HMAC / PBKDF2-HMAC-SHA256 test vectors — the
// H8 passcode hashing is only as trustworthy as this hand-rolled primitive, so pin it down.
describe('pbkdf2 crypto primitives', () => {
  it('SHA-256 matches known vectors', () => {
    expect(toHex(sha256(utf8('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(toHex(sha256(utf8('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    // NIST two-block (896-bit) vector exercises the multi-chunk path.
    expect(
      toHex(
        sha256(
          utf8(
            'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmn' +
              'hijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
          ),
        ),
      ),
    ).toBe('cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1');
  });

  it('HMAC-SHA256 matches a known vector', () => {
    expect(
      toHex(hmacSha256(utf8('key'), utf8('The quick brown fox jumps over the lazy dog'))),
    ).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('PBKDF2-HMAC-SHA256 matches RFC-style vectors', () => {
    expect(toHex(pbkdf2Sha256(utf8('password'), utf8('salt'), 1, 32))).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    );
    expect(toHex(pbkdf2Sha256(utf8('password'), utf8('salt'), 2, 32))).toBe(
      'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43',
    );
  });
});
