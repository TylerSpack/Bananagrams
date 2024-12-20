import { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import PlayerGame from "../components/PlayerGame";
import TileData from "../types/TileData";
import { useAppContext } from "../context/AppContext";

// const initialPlayer: Player = {
//     name: "TestName",
//     tiles: "JJKKQQXXZZB".split(''),
//     board: [
//         ['', '', ''],
//         ['', '', ''],
//         ['', '', '']
//     ]
// }

// const initialGameState: GameState = {
//     players: {
//         "BhvgY1FTE1XHJwd3oGLQC8b2CVy2": initialPlayer
//     },
//     letterPool: "JJKKQQXXZZBBBCCCFFFHHHMMMPPPVVVWWWYYYGGGGLLLLLDDDDDDSSSSSSUUUUUUNNNNNNNNTTTTTTTTTRRRRRRRRROOOOOOOOOOOIIIIIIIIIIIIAAAAAAAAAAAAAEEEEEEEEEEEEEEEEEE".split('')
// }

const TestPlayer = () => {
  const {
    setupGameState,
    givePlayersStartingTiles,
    gameState,
    setGameState,
    setPlayerName,
    playerName,
  } = useAppContext();

  useEffect(() => {
    if (!auth.currentUser) return;
    setPlayerName("TestName");
    if (!playerName) return;
    let newGameState = setupGameState();
    if (newGameState) {
      newGameState = givePlayersStartingTiles(newGameState);
      if (newGameState) {
        setGameState(newGameState);
      }
    }
  }, [auth.currentUser, playerName]);

  return (
    <div className="flex h-full w-full flex-col">
      {auth.currentUser && gameState && <PlayerGame />}
    </div>
  );
};

export default TestPlayer;
