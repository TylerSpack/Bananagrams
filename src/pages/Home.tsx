import React, { useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';


const Home: React.FC = () => {
    const playerNameRef = useRef<HTMLInputElement>(null);
    const joinRoomCodeRef = useRef<HTMLInputElement>(null);
    const history = useHistory();
    const {setPlayerName} = useAppContext();

    function hostGame() {
        if (!playerNameRef.current?.value.trim()) {
            alert("Please enter a player name!");
            return;
        }
        setPlayerName(playerNameRef.current.value.trim());
        //Generate a random 6 digit room code
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`host game with room code: ${roomCode} and player name: ${playerNameRef.current?.value}`);
        history.push(`/host/${roomCode}`);
    }
    function joinGame() {
        if (!playerNameRef.current?.value.trim()) {
            alert("Please enter a player name!");
            return;
        }
        if (!joinRoomCodeRef.current?.value.trim()) {
            alert("Please enter a room code!");
            return;
        }
        setPlayerName(playerNameRef.current.value.trim());
        console.log(`join game with room code: ${joinRoomCodeRef.current?.value}`);
        history.push(`/guest/${joinRoomCodeRef.current?.value}`);
    }

    return (
        <div className='w-full h-full p-4 flex flex-col items-center'>
            <div className='text-4xl font-bold mb-8 text-yellow-400'>Bananagrams</div>
            <input type="text" ref={playerNameRef} placeholder='Player Name' className='py-2 px-4 rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-500 mb-10 text-center' />
            <div className='w-full flex justify-between items-center'>
                <div className='flex flex-col items-center'>
                    <button onClick={hostGame} className='bg-yellow-400 font-semibold py-2 px-6 rounded-lg hover:bg-yellow-500 transition-colors text-black duration-200'>Host Game</button>
                </div>
                <span className='font-bold text-4xl'>OR</span>
                <div className='flex flex-col items-center'>
                    <input type="text" ref={joinRoomCodeRef} placeholder='Room Code' className='py-2 px-4 rounded-lg border-2 border-yellow-400 focus:outline-none focus:border-yellow-500 mb-4 text-center' />
                    <button onClick={joinGame} className='bg-yellow-400 font-semibold py-2 px-6 rounded-lg hover:bg-yellow-500 transition-colors text-black duration-200 mb-4'>Join Game</button>
                </div>
            </div>
        </div>
    )
}

export default Home