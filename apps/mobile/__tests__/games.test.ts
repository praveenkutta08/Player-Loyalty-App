import favoritesReducer, { isFavorite, setFavorite } from '../src/features/games/favoritesSlice';
import { volatility } from '../src/features/games/GameTile';

describe('volatility badge', () => {
  it('maps known volatility to a labelled tone', () => {
    expect(volatility('low')).toEqual({ label: 'Low volatility', tone: 'success' });
    expect(volatility('high')).toEqual({ label: 'High volatility', tone: 'error' });
  });

  it('returns null for unknown/missing volatility', () => {
    expect(volatility(null)).toBeNull();
    expect(volatility('unknown')).toBeNull();
  });
});

describe('game favorites mirror', () => {
  it('adds and removes ids idempotently', () => {
    let state = favoritesReducer(undefined, setFavorite({ id: 'g1', favorite: true }));
    state = favoritesReducer(state, setFavorite({ id: 'g1', favorite: true })); // no dup
    expect(state.gameIds).toEqual(['g1']);
    expect(isFavorite(state, 'g1')).toBe(true);

    state = favoritesReducer(state, setFavorite({ id: 'g1', favorite: false }));
    expect(isFavorite(state, 'g1')).toBe(false);
  });
});
