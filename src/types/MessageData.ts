import GameState from "./GameState";

export default interface MessageData {
    type: "peel" | "dump" | "gameState" | "setPlayerName" | "popupMessage";
    tile?: string;
    gameState?: GameState;
    playerName?: string;
}