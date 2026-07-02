import { compareVersions, needsForceUpdate } from '../src/lib/version';

describe('compareVersions', () => {
  it('orders plain semver-ish strings', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
    expect(compareVersions('2', '1.9.9')).toBe(1);
  });
});

describe('needsForceUpdate (G8/M16)', () => {
  it('forces when the build is below the manifest floor', () => {
    expect(needsForceUpdate('0.0.1', '1.0.0')).toBe(true);
    expect(needsForceUpdate('1.1.9', '1.2')).toBe(true);
  });

  it('does not force at or above the floor', () => {
    expect(needsForceUpdate('1.2.0', '1.2')).toBe(false);
    expect(needsForceUpdate('2.0.0', '1.9.9')).toBe(false);
  });

  it('never bricks the app on missing or malformed floors', () => {
    expect(needsForceUpdate('0.0.1', undefined)).toBe(false);
    expect(needsForceUpdate('0.0.1', null)).toBe(false);
    expect(needsForceUpdate('0.0.1', '')).toBe(false);
    expect(needsForceUpdate('0.0.1', 'not-a-version')).toBe(false);
    expect(needsForceUpdate('0.0.1', '1.x')).toBe(false);
  });
});
