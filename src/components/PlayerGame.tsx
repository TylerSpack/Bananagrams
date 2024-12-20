import React from 'react'
import PlayerTiles from './PlayerTiles'
import { auth } from '../firebase/firebaseConfig';
import { useAppContext } from '../context/AppContext';
import PlayerBoard from './PlayerBoard';

const PlayerGame: React.FC = () => {
    if (!auth.currentUser) return null;
    const { gameState } = useAppContext();
    if (!gameState) return null;    
    return (
        <div className="w-2/3 h-full p-4">
            <div className="w-full mb-4" style={{ height: '80%' }}>
                <PlayerBoard board={gameState.players[auth.currentUser.uid].board} />
            </div>
            <div className="w-full bg-[#212121]" style={{ height: '15%' }}>
                <PlayerTiles interactable={true} tiles={gameState.players[auth.currentUser.uid].tiles} />
            </div>
        </div>
    )
}

export default PlayerGame