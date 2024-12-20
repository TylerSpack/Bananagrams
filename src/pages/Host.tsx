import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from "@ionic/react";
//Firebase
import { auth } from "../firebase/firebaseConfig";
//Components
import DroppableArea from "../components/DroppableArea";
import OpponentGames from "../components/OpponentGames";
import PlayerGame from "../components/PlayerGame";
//Types
import MessageData from "../types/MessageData";
import TileData from "../types/TileData";
import GameState from "../types/GameState";
//Context
import { useAppContext } from '../context/AppContext';

const Host: React.FC = () => {
  const {
    gameState,
    setGameState,
    handlePopupMessage,
    setToastMessage,
    setToastIsOpen,
    setToastType,
    toastMessage,
    toastIsOpen,
    toastType,
    peel, //Host only
    dump, //Host only
    givePlayersStartingTiles, //Host only
    setIsHost, //Host only
    setupSession,
    setupGameState,
    sendMessageToPeers,
    sendMessageToPeer,
  } = useAppContext();
  const [gameStarted, setGameStarted] = useState(false);
  const gameWinnerIDRef = useRef<string>();
  const { sessionID } = useParams<{ sessionID: string }>();
  //Kinda hacky react stuff
  const runOnce = useRef<boolean>();

  useEffect(() => {
    if (runOnce.current) return;
    runOnce.current = true;
    setupSession(sessionID);
    setIsHost(true);
  }, []);

  // useEffect(() => {
  //   console.log("useEffect Game State Changed:", gameState);
  //   if (!gameState && !gameStarted) return;
  //   sendMessageToPeers(JSON.stringify({ type: "gameState", gameState: gameState }));
  //   setGameStarted(true);
  // }, [gameState]);


  function startGame() {
    let newGameState = setupGameState();
    if (newGameState) {
      newGameState = givePlayersStartingTiles(newGameState);
      if (newGameState) {
        setGameState(newGameState);
        sendMessageToPeers(JSON.stringify({ type: "gameState", gameState: newGameState }));
      }
    }
  }
  function onPeelClick() {
    if (!gameState || !auth.currentUser?.uid) {
      console.error("No game state or authenticated user found.");
      return;
    }
    else if (gameWinnerIDRef.current) {
      console.error("Game is already over.");
      return;
    }
    const gameStateCopy = JSON.parse(JSON.stringify(gameState));
    const newGameState = peel(gameStateCopy, auth.currentUser.uid);
    if (typeof newGameState === "string") {
      gameWinnerIDRef.current = newGameState;
      sendMessageToPeers(JSON.stringify({ type: "gameOver", winnerID: newGameState }));
      if (newGameState === auth.currentUser?.uid) {
        setToastMessage("Congratulations, you won!");
        setToastType("success");
      }
      else {
        setToastMessage(`Game Over, Winner: ${gameState.players[newGameState].name}`);
        setToastType("medium");
      }
      setToastIsOpen(true);
    }
    else if ('message' in newGameState) {
      handlePopupMessage(newGameState);
    }
    else {
      setGameState(newGameState);
      sendMessageToPeers(JSON.stringify({ type: "gameState", gameState: newGameState }));
    }
  }
  function handleDump(data: TileData) {
    console.log(data);
    if (!gameState || !auth.currentUser?.uid) {
      console.error("No game state or authenticated user found.");
      return;
    }
    const gameStateCopy = JSON.parse(JSON.stringify(gameState));
    const newGameState = dump(gameStateCopy, auth.currentUser.uid, data.letter);
    if ('message' in newGameState) {
      handlePopupMessage(newGameState);
    }
    else if (newGameState) {
      setGameState(newGameState);
      sendMessageToPeers(JSON.stringify({ type: "gameState", gameState: newGameState }));
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen>

        <div className="w-full h-full flex flex-col">

            <div className="w-full flex-1 flex flex-col md:flex-row border-b overflow-hidden">
            {gameState &&
              <>
              <PlayerGame />
              <OpponentGames />
              </>
            }
            </div>
            <div className="w-full p-4 flex items-center justify-between">
            {!gameState && (
              <button onClick={startGame} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200">
                Start Game
              </button>
            )}
            {gameState &&
              <>
                <div className='className="flex justify-center items-center text-lg font-bold text-gray-200 mb-4"'>
                  {gameWinnerIDRef.current ?
                    `Game Over, Winner: ${gameState.players[gameWinnerIDRef.current].name}` :
                    `Tiles Remaining ${gameState.letterPool.length}`}
                </div>
                <button onClick={onPeelClick} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200">
                  Peel
                </button>
                <DroppableArea handleDrop={handleDump} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200">
                  Dump
                </DroppableArea>
              </>
            }

          </div>

        </div>

        <IonToast
          isOpen={toastIsOpen}
          message={toastMessage}
          onDidDismiss={() => setToastIsOpen(false)}
          color={toastType}
          position="top"
          duration={1500}
        ></IonToast>
      </IonContent>
    </IonPage>
  );
};

export default Host;