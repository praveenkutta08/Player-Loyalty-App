import biometricReducer, {
  dismissEnroll,
  lock,
  setAvailable,
  setEnabled,
  unlock,
} from '../src/features/auth/biometricSlice';
import { isValidPasscode } from '../src/features/auth/biometricStore';

describe('isValidPasscode', () => {
  it('accepts 4–6 digit pins only', () => {
    expect(isValidPasscode('1234')).toBe(true);
    expect(isValidPasscode('123456')).toBe(true);
    expect(isValidPasscode('123')).toBe(false);
    expect(isValidPasscode('1234567')).toBe(false);
    expect(isValidPasscode('12a4')).toBe(false);
    expect(isValidPasscode('')).toBe(false);
  });
});

describe('biometric slice', () => {
  it('only locks when enabled', () => {
    let state = biometricReducer(undefined, lock());
    expect(state.locked).toBe(false); // not enabled -> stays unlocked
    state = biometricReducer(state, setEnabled(true));
    state = biometricReducer(state, lock());
    expect(state.locked).toBe(true);
    state = biometricReducer(state, unlock());
    expect(state.locked).toBe(false);
  });

  it('disabling clears the lock', () => {
    let state = biometricReducer(undefined, setEnabled(true));
    state = biometricReducer(state, lock());
    state = biometricReducer(state, setEnabled(false));
    expect(state.enabled).toBe(false);
    expect(state.locked).toBe(false);
  });

  it('tracks availability + enroll dismissal', () => {
    let state = biometricReducer(undefined, setAvailable(true));
    expect(state.available).toBe(true);
    state = biometricReducer(state, dismissEnroll());
    expect(state.enrollDismissed).toBe(true);
  });
});
