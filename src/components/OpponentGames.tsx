import React from 'react'
import PlayerTiles from './PlayerTiles'
import { auth } from '../firebase/firebaseConfig'
import { useAppContext } from '../context/AppContext'
import OpponentBoard from './OpponentBoard'

const OpponentGames: React.FC = () => {
    if (!auth.currentUser) return null;
    const { gameState } = useAppContext();
    if (!gameState) return null;

    return (
        <div className="hidden md:block md:w-1/3 md:h-full border-l p-4">
            {Object.keys(gameState.players).map((playerID, i) => (
                playerID !== auth.currentUser?.uid && (
                    <div key={i} className="w-full h-2/5 flex flex-col">
                        <div className="text-center font-bold text-2xl">{gameState.players[playerID].name}</div>
                        <div className="w-full" style={{ height: 'clamp(60%, 80%, 80%)' }}>
                            <OpponentBoard board={gameState.players[playerID].board} />
                        </div>
                        <div className="w-full h-1/5">
                            <PlayerTiles interactable={false} tiles={gameState.players[playerID].tiles} key={i} />
                        </div>
                    </div>
                )
            ))}
        </div>
    )
}

export default OpponentGames