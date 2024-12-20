import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from '@ionic/react';
//Firebase
import { auth } from "../firebase/firebaseConfig";
//Components
import DroppableArea from '../components/DroppableArea';
import OpponentGames from '../components/OpponentGames';
import PlayerGame from '../components/PlayerGame';
//Types
import GameState from '../types/GameState';
import TileData from '../types/TileData';
//Context
import { useAppContext } from '../context/AppContext';


const Guest: React.FC = () => {
  const {
    gameState,
    setGameState,
    playerName,
    setToastMessage,
    setToastIsOpen,
    setToastType,
    toastMessage,
    toastIsOpen,
    toastType,
    connectToHost,
    sendMessageToHost,
  } = useAppContext();
  // const [gameState, setGameState] = useState<GameState>();
  const gameWinnerIDRef = useRef<string>();
  
  const { sessionID } = useParams<{ sessionID: string }>();
  //Kinda hacky react stuff
  const runOnce = useRef<boolean>();



  useEffect(() => {
    if (runOnce.current) return;
    runOnce.current = true;
    connectToHost(sessionID);
  }, []);



  function onPeelClick() {
    sendMessageToHost(JSON.stringify({ type: "peel" }));
  }

  function handleDump(data: TileData) {
    sendMessageToHost(JSON.stringify({ type: "dump", tile: data.letter }));
  }

  if (!(gameState && auth.currentUser?.uid && gameState.players[auth.currentUser.uid])) {
    if (!gameState) console.log("No game state found.");
    if (!auth.currentUser?.uid) console.log("No authenticated user found.");
    else if (!gameState?.players[auth.currentUser?.uid]) console.log("No player found in game state.");
    return (
      <IonPage>
        <IonContent fullscreen>
          <div>Waiting for host to start game...</div>
        </IonContent>
      </IonPage>
    )
  }
  else {
    return (
      <IonPage>
        <IonContent fullscreen>

          <div className="w-full h-full flex flex-col">

            <div className="w-full flex-1 flex flex-col md:flex-row border-b overflow-hidden">
              <PlayerGame />
              <OpponentGames />
            </div>

            <div className="w-full p-4 flex items-center justify-between">
              <div className="flex justify-center items-center text-lg font-bold text-gray-200 mb-4">
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
    )
  }
}

export default Guest