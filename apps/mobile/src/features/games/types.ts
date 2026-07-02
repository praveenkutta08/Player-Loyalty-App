import type { GameOut } from './gamesApi';

/** Gaming stack (under More): catalog (C8) → game detail (C9), plus the full leaderboard (C5). */
export type GamesStackParamList = {
  GamesCatalog: undefined;
  GameDetail: { game: GameOut };
  Leaderboard: undefined;
};
