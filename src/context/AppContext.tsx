import { createContext, useContext, useEffect, useRef, useState } from "react";
import GameState from "../types/GameState";
import TileData from "../types/TileData";
import PopupMessage from "../types/PopupMessage";
import { auth, db } from "../firebase/firebaseConfig";
import Player from "../types/Player";
import { useHistory } from "react-router-dom";
import Connection from "../types/Connection";
import {
  DataSnapshot,
  get,
  onChildAdded,
  onValue,
  push,
  ref,
  set,
} from "firebase/database";
import MessageData from "../types/MessageData";

interface AppContextProps {
  //Host only
  setupSession: (sessionID: string) => void;
  sendMessageToPeers: (message: string, excludedPeerIDs?: string[]) => void;
  sendMessageToPeer: (peerID: string, message: string) => void;
  //Guest only
  connectToHost: (sessionID: string) => void;
  sendMessageToHost: (message: string) => void;
  // All players
  gameState: GameState | undefined;
  setGameState: React.Dispatch<React.SetStateAction<GameState | undefined>>;
  returnTileToPlayerTiles: (
    gameState: GameState,
    data: TileData,
  ) => GameState | null;
  setPlayerName: React.Dispatch<React.SetStateAction<string | undefined>>;
  playerName: string | undefined;
  isHost: boolean;
  handlePopupMessage: (message: PopupMessage) => void;
  setToastMessage: React.Dispatch<React.SetStateAction<string>>;
  setToastIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setToastType: React.Dispatch<React.SetStateAction<string>>;
  toastMessage: string;
  toastIsOpen: boolean;
  toastType: string;
  gameWinnerIDRef: React.MutableRefObject<string | undefined>;
  expandedBoardPadding: number;
  //Host only
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
  peel: (
    gameState: GameState,
    playerID: string,
  ) => GameState | PopupMessage | string;
  dump: (
    gameState: GameState,
    playerID: string,
    tile: string,
  ) => GameState | PopupMessage;
  setupGameState: () => GameState | null;
  givePlayersStartingTiles: (gameState: GameState) => GameState | null;
}
const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  //Game Variables
  const [gameState, setGameState] = useState<GameState>();
  const gameStateRef = useRef<GameState>(); //Used so that hostHandleMessage can access the latest game state instead of the outdated one because of it's closure
  const [playerName, setPlayerName] = useState<string>();
  const [selectedTiles, setSelectedTiles] = useState<number[][]>([]);

  const [isHost, setIsHost] = useState<boolean>(false);
  const [toastIsOpen, setToastIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("");
  const gameWinnerIDRef = useRef<string>();
  const expandedBoardPadding = 15;

  //Connection Related Stuff
  //Host only variables
  const connectionsRef = useRef<Map<string, Connection>>(new Map());
  const unsubscribePeerCallbackRef = useRef<(() => void) | null>(null);
  //Guest only variables
  const localConnectionRef = useRef<RTCPeerConnection>();
  const dataChannelRef = useRef<RTCDataChannel>();
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);
  const haveSentPlayerNameRef = useRef(false);

  const history = useHistory();

  //Used so that hostHandleMessage can access the latest game state instead of the outdated one because of it's closure
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  //Host only game functions
  function peel(
    gameStateCopy: GameState,
    playerID: string,
  ): GameState | PopupMessage | string {
    // playerID is there so that we can check and see if it is a valid call to peel
    // It would be invalid if the player has tiles left to use
    // This also prevents the case where multiple players try to call peel at the same time
    if (!gameStateCopy?.players[playerID]) {
      console.log(`Player ${playerID} not found in game state`);
      console.log(gameStateCopy);
      console.error("Player not found in game state");
      return { type: "danger", message: "Player not found in game state" };
    }
    if (gameStateCopy.players[playerID].tiles.length > 0) {
      console.error("Player still has tiles to use");
      return { type: "danger", message: "Player still has tiles to use" };
    }
    //If there's less tiles than players, then the game is over (playerID wins)
    if (
      gameStateCopy.letterPool.length <
      Object.keys(gameStateCopy.players).length
    ) {
      console.log(`${playerID} wins!`);
      return playerID;
    }
    //Give each player 1 tile
    for (const playerID in gameStateCopy.players) {
      const randomIndex = Math.floor(
        Math.random() * gameStateCopy.letterPool.length,
      );
      gameStateCopy.players[playerID].tiles.push(
        gameStateCopy.letterPool.splice(randomIndex, 1)[0],
      );
    }
    return gameStateCopy;
  }
  function dump(
    gameStateCopy: GameState,
    playerID: string,
    tile: string,
  ): GameState | PopupMessage {
    if (!gameStateCopy.players[playerID]) {
      console.error("Player not found in game state");
      return { type: "danger", message: "Player not found in game state" };
    }
    if (gameStateCopy.letterPool.length < 3) {
      console.error("Not enough tiles in the letter pool");
      return { type: "danger", message: "Not enough tiles in the letter pool" };
    }
    if (!gameStateCopy.players[playerID].tiles.includes(tile)) {
      console.error("Player does not have the tile to dump");
      return {
        type: "danger",
        message: "Player does not have the tile to dump",
      };
    } else {
      gameStateCopy.players[playerID].tiles.splice(
        gameStateCopy.players[playerID].tiles.indexOf(tile),
        1,
      );
      const newTiles = [];
      console.log(`Letter pool before dump: ${gameStateCopy.letterPool}`);
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(
          Math.random() * gameStateCopy.letterPool.length,
        );
        newTiles.push(gameStateCopy.letterPool.splice(randomIndex, 1)[0]);
      }
      console.log(`Player ${playerID} dumped ${tile} and received ${newTiles}`);
      gameStateCopy.players[playerID].tiles.push(...newTiles);
      gameStateCopy.letterPool.push(tile);
      console.log(`Letter pool after dump: ${gameStateCopy.letterPool}`);
    }
    return gameStateCopy;
  }
  function setupGameState(): GameState | null {
    const hostID = auth.currentUser?.uid;
    if (!hostID) {
      console.error("No host ID found.");
      return null;
    }
    if (!playerName) {
      console.error("No player name found.");
      return null;
    }
    const letterPool =
      "JJKKQQXXZZBBBCCCFFFHHHMMMPPPVVVWWWYYYGGGGLLLLLDDDDDDSSSSSSUUUUUUNNNNNNNNTTTTTTTTTRRRRRRRRROOOOOOOOOOOIIIIIIIIIIIIAAAAAAAAAAAAAEEEEEEEEEEEEEEEEEE".split(
        "",
      );
    //Temporarily take the first 15 tiles as the letter pool
    // const letterPool = "ABCDEFGHIJKLMNO".split('');
    // const startingBoardSize = 20; //5x5
    // const board: string[][] = Array(startingBoardSize).fill(null).map(() => Array(startingBoardSize).fill(''))
    const players: { [playerID: string]: Player } = {
      [hostID]: {
        board: [[""]],
        tiles: [],
        name: playerName,
      },
    };
    for (const [playerID, _] of connectionsRef.current.entries()) {
      // console.log(`Adding player ${playerID}`);
      players[playerID] = {
        board: [[""]],
        tiles: [],
        name: "", //Name will be received from guest later
      };
    }
    const newGameState: GameState = { players, letterPool };
    return newGameState;
  }
  function givePlayersStartingTiles(
    gameStateCopy: GameState,
  ): GameState | null {
    if (!gameStateCopy) {
      console.error("No game state found.");
      return null;
    }
    for (const playerID in gameStateCopy.players) {
      const player = gameStateCopy.players[playerID];
      for (let i = 0; i < 21; i++) {
        const randomIndex = Math.floor(
          Math.random() * gameStateCopy.letterPool.length,
        );
        player.tiles.push(gameStateCopy.letterPool.splice(randomIndex, 1)[0]);
      }
    }
    return gameStateCopy;
  }

  //All players game functions
  function returnTileToPlayerTiles(
    gameStateCopy: GameState,
    data: TileData,
  ): GameState | null {
    console.log("returnTileToPlayerTiles");
    //Sanity checks
    const playerID = auth.currentUser?.uid;
    if (!playerID) {
      console.error("No authenticated user found.");
      return null;
    }
    if (!gameStateCopy.players[playerID]) {
      console.error("Player not found in game state.");
      return null;
    }

    //Check if the tile is coming from the player tiles - if so, do nothing
    if (data.y === undefined) {
      return null;
    }
    //Adjust x and y to account for the expanded board padding
    data.x -= expandedBoardPadding;
    data.y -= expandedBoardPadding;
    if (gameStateCopy.players[playerID].board[data.y][data.x] === "") {
      console.error("No tile found at this location, this shouldn't happen");
      return null;
    }
    if (gameStateCopy.players[playerID].board[data.y]?.[data.x] === undefined) {
      console.error("Tile is out of bounds, this shouldn't happen");
      console.error(
        data,
        gameStateCopy.players[playerID].board,
        expandedBoardPadding,
      );
      return null;
    }

    //Return the tile to the player tiles
    gameStateCopy.players[playerID].tiles.push(data.letter);
    gameStateCopy.players[playerID].board[data.y][data.x] = "";
    return gameStateCopy;
  }

  //Popup Message Method
  function handlePopupMessage(message: PopupMessage) {
    setToastMessage(message.message);
    setToastIsOpen(true);
    setToastType(message.type);
  }

  //WebRTC - Host only
  function setupSession(sessionID: string) {
    console.log(`setupSession(${sessionID})`);
    const hostID = auth.currentUser?.uid;
    if (!hostID) {
      console.log("No authenticated user found.");
      history.push(`/home`);
      return;
    }
    console.log(`Setting up session: ${sessionID}`);
    set(ref(db, `sessions/${sessionID}/host`), hostID);
    set(ref(db, `sessions/${sessionID}/peers`), null);

    //Listen for peers
    const peersRef = ref(db, `sessions/${sessionID}/peers`);
    const unsubscribe = onChildAdded(peersRef, (snapshot) => {
      handleFirebasePeerAdded(snapshot, sessionID);
    });
    unsubscribePeerCallbackRef.current = unsubscribe;
  }
  function handleFirebasePeerAdded(snapshot: DataSnapshot, sessionID: string) {
    // console.log('inside the onChildAdded, about to call handleFirebasePeerAdded');
    // handleFirebasePeerAdded(snapshot, sessionID);
    const peerID = snapshot.key;
    if (!peerID || connectionsRef.current.has(peerID)) {
      console.log(
        `connections.current.has(${peerID}): `,
        peerID && connectionsRef.current.has(peerID),
      );
      return;
    }
    const peerData = snapshot.val();
    addNewPeerConnection(
      sessionID,
      peerID,
      peerData.offer,
      peerData.candidates,
    );
  }
  function addNewPeerConnection(
    sessionID: string,
    peerID: string,
    offer: string,
    candidates?: string,
  ) {
    console.log(
      `addNewPeerConnection(${sessionID}, ${peerID}, ${offer}, ${candidates})`,
    );
    console.log(`Adding new peer connection: ${peerID}`);
    // Create new connection for this peer
    const connection = new RTCPeerConnection();
    connectionsRef.current.set(peerID, { connection: connection });
    connection.ondatachannel = (e) => {
      console.log(`Data channel created by peer ${peerID}`);
      const dataChannel = e.channel;
      dataChannel.onmessage = (e) => {
        hostHandleMessage(peerID, e.data);
      };
      dataChannel.onopen = () =>
        console.log(`data channel open with ${peerID}`);
      dataChannel.onclose = () => {
        console.log(`data channel closed with ${peerID}`);
        connectionsRef.current.get(peerID)?.ICEunsubscribe?.();
        connectionsRef.current.delete(peerID);
        //Remove from firebase
        const peerRef = ref(db, `sessions/${sessionID}/peers/${peerID}`);
        set(peerRef, null);
      };
      connectionsRef.current.set(peerID, {
        connection: connection,
        dataChannel: dataChannel,
      });
    };
    connection.setRemoteDescription(JSON.parse(offer)).then(() => {
      console.log(
        `Accepted offer from peer ${peerID}, set as remote description`,
      );
      connection.createAnswer().then((answer) => {
        console.log(`Answer created for peer ${peerID}: `, answer);
        connection.setLocalDescription(answer);
        const answerRef = ref(
          db,
          `sessions/${sessionID}/peers/${peerID}/answer`,
        );
        set(answerRef, JSON.stringify(answer));
        console.log(
          `Answer sent to sessions/${sessionID}/peers/${peerID}/answer for peer to receive`,
        );
      });
    });
    if (candidates) {
      console.group(`Adding existing candidates for peer ${peerID}`);
      JSON.parse(candidates).forEach((candidate: RTCIceCandidateInit) => {
        console.log(`New candidate from peer ${peerID}: `, candidate);
        connection.addIceCandidate(candidate);
      });
      console.groupEnd();
    }
    // Listen for this peer's ICE candidates
    const ICEunsubscribe = onChildAdded(
      ref(db, `sessions/${sessionID}/peers/${peerID}/candidates`),
      (snapshot) => {
        const candidate = JSON.parse(snapshot.val());
        console.log(`New candidate from peer ${peerID}: `, candidate);
        connection.addIceCandidate(candidate);
      },
    );
    connectionsRef.current.set(peerID, {
      ...connectionsRef.current.get(peerID),
      connection: connection,
      ICEunsubscribe,
    });
  }
  function sendMessageToPeers(message: string, excludedPeerIDs: string[] = []) {
    // console.log(`sendMessageToPeers(${message}, ${excludedPeerIDs})`);
    connectionsRef.current.forEach((connection, peerID) => {
      if (!excludedPeerIDs.includes(peerID) && connection.dataChannel) {
        console.log(`Sending message to ${peerID}:`, JSON.parse(message));
        connection.dataChannel.send(message);
      }
    });
  }
  function sendMessageToPeer(peerID: string, message: string) {
    // console.log(`sendMessageToPeer(${peerID}, ${message})`);
    const connection = connectionsRef.current.get(peerID);
    if (connection?.dataChannel) {
      connection.dataChannel.send(message);
    } else {
      handlePopupMessage({
        type: "danger",
        message: `Data channel not found for ${peerID}`,
      });
    }
  }
  function hostHandleMessage(peerID: string, message: string) {
    const msgData = JSON.parse(message) as MessageData;
    console.log(`Message from ${peerID}:`, msgData);

    //Handle error cases
    if (!gameStateRef.current) {
      console.error("No game state found.");
      return;
    } else if (!msgData["type"]) {
      console.error("No message type found.", msgData);
      return;
    } else if (msgData.type === "peel" && gameWinnerIDRef.current) {
      sendMessageToPeer(
        peerID,
        JSON.stringify({
          type: "popupMessage",
          message: { type: "medium", message: "Game is already over." },
        }),
      );
      return;
    } else if (msgData.type === "dump" && !msgData.tile) {
      console.error("Dump message should have a tile.");
      return;
    } else if (msgData.type === "gameState" && !msgData.gameState) {
      console.error("Board update message should have a player object.");
      return;
    } else if (msgData.type === "setPlayerName" && !msgData.playerName) {
      console.error("Player name update message should have a player name.");
      return;
    }

    const gameStateCopy: GameState = JSON.parse(
      JSON.stringify(gameStateRef.current),
    );
    switch (msgData.type) {
      case "peel": {
        const newGameState = peel(gameStateCopy, peerID);
        if (typeof newGameState === "string") {
          gameWinnerIDRef.current = newGameState;
          sendMessageToPeers(
            JSON.stringify({ type: "gameOver", winnerID: newGameState }),
          );
        } else if ("message" in newGameState) {
          sendMessageToPeer(
            peerID,
            JSON.stringify({ type: "popupMessage", message: newGameState }),
          );
        } else {
          setGameState(newGameState);
          sendMessageToPeers(
            JSON.stringify({ type: "gameState", gameState: newGameState }),
          );
        }
        break;
      }
      case "dump": {
        if (msgData.tile) {
          const newGameState = dump(gameStateCopy, peerID, msgData.tile);
          if ("message" in newGameState) {
            sendMessageToPeer(
              peerID,
              JSON.stringify({ type: "popupMessage", message: newGameState }),
            );
          } else {
            setGameState(newGameState);
            sendMessageToPeers(
              JSON.stringify({ type: "gameState", gameState: newGameState }),
            );
          }
        }
        break;
      }
      case "gameState": {
        if (!msgData.gameState) {
          console.error("No game state found in message.");
          return;
        }
        console.log(
          `Received game state update from ${peerID}: `,
          msgData.gameState,
        );
        setGameState(msgData.gameState);
        sendMessageToPeers(
          JSON.stringify({ type: "gameState", gameState: msgData.gameState }),
          [peerID],
        );
        break;
      }
      case "setPlayerName": {
        //Update player name
        if (!msgData.playerName) {
          console.error("No player name found in message.");
          return;
        }
        if (!gameStateRef.current.players[peerID]) {
          console.error("Player not found in game state.");
          return;
        }
        gameStateCopy.players[peerID].name = msgData.playerName;
        setGameState(gameStateCopy);
        sendMessageToPeers(
          JSON.stringify({ type: "gameState", gameState: gameStateCopy }),
        );
        break;
      }
      default:
        console.error("Unknown message type.");
        break;
    }
  }

  //WebRTC - Guest only
  function connectToHost(sessionID: string) {
    console.log(`connectToHost(${sessionID})`);
    const peerID = auth.currentUser?.uid;
    if (!peerID) {
      console.error("No authenticated user found.");
      history.push("/home");
    }
    const sessionRef = ref(db, `sessions/${sessionID}/host`);
    get(sessionRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log(
            `Session exists at sessions/${sessionID}/host: ${snapshot.val()}`,
          );
          const newLocalConnection = new RTCPeerConnection();
          newLocalConnection.onicecandidate = (e) => {
            if (e.candidate) {
              // Push guests's ICE candidates to Firebase under the peers/${peerID}/candidates path
              console.log("New ICE candidate: ", e.candidate);
              console.log(`auth.currentUser?.uid: ${auth.currentUser?.uid}`);
              const candidatesRef = ref(
                db,
                `sessions/${sessionID}/peers/${peerID}/candidates`,
              );
              push(candidatesRef, JSON.stringify(e.candidate)).catch((e) =>
                console.error(
                  `push(candidatesRef (sessions/${sessionID}/peers/${peerID}/candidates), JSON.stringify(e.candidate))`,
                  e,
                ),
              );
            } else {
              console.log("No more ICE candidates");
            }
          };
          // Setup data channel
          const newDataChannel =
            newLocalConnection.createDataChannel("dataChannel");
          newDataChannel.onmessage = (e) => {
            guestHandleMessage(e.data);
          };
          newDataChannel.onopen = () => console.log("channel open with host");
          newDataChannel.onclose = () => {
            console.log("channel closed with host");
            const peerRef = ref(db, `sessions/${sessionID}/peers/${peerID}`);
            set(peerRef, null).catch((e) =>
              console.error(
                `set(peerRef (sessions/${sessionID}/peers/${peerID}), null)`,
                e,
              ),
            );
            dataChannelRef.current = undefined;
            localConnectionRef.current = undefined;
            //Handle connection close
          };
          dataChannelRef.current = newDataChannel;
          // Create offer and send to host
          newLocalConnection.createOffer().then((offer) => {
            console.log("Offer created: ", offer);
            newLocalConnection.setLocalDescription(offer);
            const offerRef = ref(
              db,
              `sessions/${sessionID}/peers/${peerID}/offer`,
            );
            set(offerRef, JSON.stringify(offer)).catch((e) =>
              console.error(
                `set(offerRef (sessions/${sessionID}/peers/${peerID}/offer), JSON.stringify(offer))`,
                e,
              ),
            );
            // Listen for host's answer
            const answerRef = ref(
              db,
              `sessions/${sessionID}/peers/${peerID}/answer`,
            );
            const answerUnsubscribe = onValue(answerRef, (snapshot) => {
              if (snapshot.exists()) {
                const answer = JSON.parse(snapshot.val());
                console.log("Answer received: ", answer);
                newLocalConnection
                  .setRemoteDescription(answer)
                  .catch((e) => console.error(e));
                // Listen for host's ICE candidates
                const ICEUnsubscribe = onChildAdded(
                  ref(db, `sessions/${sessionID}/hostCandidates`),
                  (snapshot) => {
                    const candidate = JSON.parse(snapshot.val());
                    console.log("New host candidate: ", candidate);
                    newLocalConnection.addIceCandidate(candidate);
                  },
                );
                unsubscribeFunctionsRef.current.push(ICEUnsubscribe);
              }
            });
            unsubscribeFunctionsRef.current.push(answerUnsubscribe);
          });
          localConnectionRef.current = newLocalConnection;
        } else {
          console.log(`No session found at sessions/${sessionID}/host`);
          history.push("/home");
        }
      })
      .catch((e) =>
        console.error(`get(ref(db, \`sessions/${sessionID}/host\`))`, e),
      );
  }
  function sendMessageToHost(message: string) {
    // console.log('sendMessageToHost', message);
    if (dataChannelRef.current) {
      dataChannelRef.current.send(message);
    } else {
      console.log("Data channel not available");
    }
  }
  function guestHandleMessage(message: string) {
    console.log("Message received: ", message);
    const msgData = JSON.parse(message);
    if (haveSentPlayerNameRef.current === false) {
      //This is the very first message from the host, send player name
      if (!playerName) {
        console.error("No player name found.");
      } else {
        sendMessageToHost(
          JSON.stringify({ type: "setPlayerName", playerName: playerName }),
        );
        haveSentPlayerNameRef.current = true;
      }
    }
    if (msgData.type === "gameState") {
      console.log("Received game state update: ", msgData.gameState);
      setGameState(msgData.gameState);
    } else if (msgData.type === "gameOver") {
      console.log("Game over, winner: ", msgData.winnerID);
      gameWinnerIDRef.current = msgData.winnerID;
      if (msgData.winnerID === auth.currentUser?.uid) {
        setToastMessage("Congratulations, you won!");
        setToastType("success");
      } else {
        setToastMessage(
          `Game Over, Winner: ${gameState?.players[msgData.winnerID].name}`,
        );
        setToastType("medium");
      }
      setToastIsOpen(true);
    } else if (msgData.type === "popupMessage") {
      setToastMessage(msgData.message.message);
      setToastType(msgData.message.type);
      setToastIsOpen(true);
    }
  }

  return (
    <AppContext.Provider
      value={{
        gameState,
        setGameState,
        setPlayerName,
        playerName,
        returnTileToPlayerTiles,
        isHost,
        handlePopupMessage,
        setToastMessage,
        setToastIsOpen,
        setToastType,
        toastMessage,
        toastIsOpen,
        toastType,
        gameWinnerIDRef,
        expandedBoardPadding,
        setIsHost,
        peel,
        dump,
        givePlayersStartingTiles,
        setupGameState,
        //WebRTC - Host only
        setupSession,
        sendMessageToPeers,
        sendMessageToPeer,
        //WebRTC - Guest only
        connectToHost,
        sendMessageToHost,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within a AppProvider");
  }
  return context;
};
