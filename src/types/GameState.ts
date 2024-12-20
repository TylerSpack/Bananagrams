import Player from "./Player";

export default interface GameState {
  letterPool: string[];
  players: { [playerID: string]: Player };
}