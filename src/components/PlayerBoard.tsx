import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DroppableArea from "./DroppableArea";
import Tile from "./Tile";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebase/firebaseConfig";
import TileData from "../types/TileData";
import GameState from "../types/GameState";

interface PlayerBoardProps {
  board: string[][];
}

const PlayerBoard: React.FC<PlayerBoardProps> = ({ board }) => {
  console.log("Board render");
  const {
    gameState,
    setGameState,
    isHost,
    sendMessageToPeers,
    sendMessageToHost,
    expandedBoardPadding,
  } = useAppContext();

  //Set up the expanded board (for display purposes)
  const expandedBoard = useMemo(() => {
    const rowExtension = Array(expandedBoardPadding).fill("");
    const fullBlankRow = Array(board[0].length + expandedBoardPadding * 2).fill(
      "",
    );
    let expandedBoard = board.map((row) => [
      ...rowExtension,
      ...row,
      ...rowExtension,
    ]);
    expandedBoard = [
      ...Array(expandedBoardPadding).fill(fullBlankRow),
      ...expandedBoard,
      ...Array(expandedBoardPadding).fill(fullBlankRow),
    ];
    return expandedBoard;
  }, [board, expandedBoardPadding]);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  //Input related stuff
  const [currentSelectedInput, setCurrentSelectedInput] = useState<number[]>(
    [],
  );
  const selectedInputRef = useRef<HTMLInputElement>(null);
  const [currentDirection, setCurrentDirection] = useState<"down" | "right">(
    "right",
  );
  const [flashingTiles, setFlashingTiles] = useState<{
    [x: number]: {
      [y: number]: boolean;
    };
  }>({});
  const arrowRef = useRef<HTMLDivElement>(null);
  const [currentArrowStyles, setCurrentArrowStyles] = useState({});

  //Scroll related stuff
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);
  const [mouseStartPosition, setMouseStartPosition] = useState({ x: 0, y: 0 });
  const [tileWidthHeight, setTileWidthHeight] = useState<number>(50);

  

  useEffect(() => {
    if (boardContainerRef.current) {
      const centerScroll = {
        left:
          boardContainerRef.current.scrollWidth / 2 -
          boardContainerRef.current.clientWidth / 2,
        top:
          boardContainerRef.current.scrollHeight / 2 -
          boardContainerRef.current.clientHeight / 2,
      };
      setScroll(centerScroll);
    }
  }, []);

  useEffect(() => {
    if (selectedInputRef.current && currentSelectedInput.length > 0) {
      selectedInputRef.current.focus();
      setCurrentArrowStyles(getNewArrowStyles());
    } else {
      setCurrentArrowStyles({});
      if (
        document.activeElement instanceof HTMLElement &&
        currentSelectedInput.length === 0
      ) {
        document.activeElement.blur();
      }
    }
  }, [currentDirection, currentSelectedInput]);

  useEffect(() => {
    const parent = boardContainerRef.current;
    if (parent) {
      const handleWheelEvent = (e: WheelEvent) =>
        handleWheel(e as unknown as React.WheelEvent);
      parent.addEventListener("wheel", handleWheelEvent, { passive: false });
      parent.scrollLeft = scroll.left;
      parent.scrollTop = scroll.top;

      return () => {
        parent.removeEventListener("wheel", handleWheelEvent);
      };
    }
  }, [tileWidthHeight, scroll]);

  

  //Style functions
  function getBoardTileStyles() {
    return {
      width: tileWidthHeight,
      height: tileWidthHeight,
      fontSize: `${Math.floor(tileWidthHeight * 0.8)}px`,
      borderRadius: `${Math.ceil(tileWidthHeight / 15)}px`,
    };
  }

  function getGridStyles() {
    return {
      width: `${tileWidthHeight}px`,
      height: `${tileWidthHeight}px`,
    };
  }

  function getNewArrowStyles() {
    if (selectedInputRef.current && arrowRef.current) {
      const inputRect = selectedInputRef.current.getBoundingClientRect();
      // console.log('Input rect:', inputRect);
      const arrowWidthHeight = selectedInputRef.current.clientWidth / 3;
      const arrowStyles = {
        position: "absolute",
        width: `${arrowWidthHeight}px`,
        height: `${arrowWidthHeight}px`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        top: "0", //Overridden below
        left: "0", //Overridden below
        backgroundImage: "none", //Set the background as a svg arrow later
        filter: "invert(1)", //Make the svg white instead of black
        zIndex: 1000,
      };
      if (currentDirection === "right") {
        arrowStyles.top = `${inputRect.height / 2 - arrowWidthHeight / 2}px`;
        arrowStyles.left = `${inputRect.width - arrowWidthHeight / 2}px`;
        arrowStyles.backgroundImage = 'url("/arrow_right.svg")';
      } else if (currentDirection === "down") {
        arrowStyles.top = `${inputRect.height - arrowWidthHeight / 2}px`;
        arrowStyles.left = `${inputRect.width / 2 - arrowWidthHeight / 2}px`;
        arrowStyles.backgroundImage = 'url("/arrow_down.svg")';
      }
      return arrowStyles;
    }
    return {};
  }

  //Board functions
  function handleTileDrop(data: TileData, y: number, x: number) {
    console.log("handleTileDrop", data, y, x);
    const gameStateCopy: GameState = JSON.parse(JSON.stringify(gameState));
    const playerID = auth.currentUser?.uid;
    if (
      !playerID ||
      !boardContainerRef.current ||
      !gameState?.players[playerID]
    ) {
      console.error(
        "auth.currentUser or boardContainerRef.current is null - this should never happen",
      );
      return;
    }

    let player = gameStateCopy.players[playerID];
    player.board = JSON.parse(JSON.stringify(expandedBoard));
    let { board, tiles } = player;

    if (!data.y && data.x && tiles[data.x] !== data.letter) {
      console.error(
        `Player does not have the tile to place ${gameState.players[playerID].tiles} - this should never happen`,
      );
      return;
    }
    if (board[y][x] !== "") {
      console.error(
        "Tile already exists at this location - this should never happen",
      );
      return;
    }

    board[y][x] = data.letter;
    if (data?.x !== undefined && data?.y !== undefined)
      board[data.y][data.x] = "";
    else if (data?.x !== undefined) tiles.splice(data.x, 1);

    //Trim board
    while (board[0].every((cell) => cell === "")) board.shift();
    while (board[board.length - 1].every((cell) => cell === "")) board.pop();
    while (board.every((row) => row[0] === ""))
      board.forEach((row) => row.shift());
    while (board.every((row) => row[row.length - 1] === ""))
      board.forEach((row) => row.pop());

    if (currentSelectedInput.length !== 0) updateInputAndScroll(board, y, x);
    //Set and broadcast game state
    setGameState(gameStateCopy);
    const message = JSON.stringify({
      type: "gameState",
      gameState: gameStateCopy,
    });
    if (isHost) sendMessageToPeers(message);
    else sendMessageToHost(message);
  }

  function isSelectedInput(y: number, x: number) {
    const isSelected =
      currentSelectedInput[0] + expandedBoardPadding === y &&
      currentSelectedInput[1] + expandedBoardPadding === x;
    return isSelected;
  }

  function updateInputAndScroll(
    newBoard: string[][],
    expandedRow: number,
    expandedCol: number,
  ) {
    //Special case where the board was empty beforehand
    if (newBoard.length === 1 && newBoard[0].length === 1) {
      console.log(`currentDirection: ${currentDirection}`);
      if (currentDirection === "down") {
        console.log("Setting current selected input to [1, 0]");
        setCurrentSelectedInput([1, 0]);
      } else if (currentDirection === "right") {
        console.log("Setting current selected input to [0, 1]");
        setCurrentSelectedInput([0, 1]);
      }
      if (!boardContainerRef.current) {
        console.error(
          "boardContainerRef.current is null - this should never happen",
        );
        return;
      }
      //Set the scroll to the center of the board
      setScroll({
        left:
          boardContainerRef.current.scrollWidth / 2 -
          boardContainerRef.current.clientWidth / 2,
        top:
          boardContainerRef.current.scrollHeight / 2 -
          boardContainerRef.current.clientHeight / 2,
      });
      return;
    }

    let row = expandedRow;
    let col = expandedCol;
    const moveInCurrentDirection = (direction: "down" | "right") => {
      if (direction === "down") row++;
      else if (direction === "right") col++;
    };
    // console.log(`expandedRow: ${expandedRow}, expandedCol: ${expandedCol}`);
    if (expandedRow < expandedBoardPadding) row = 0;
    else row -= expandedBoardPadding;
    if (col < expandedBoardPadding) col = 0;
    else col -= expandedBoardPadding;

    // console.log("board:", newBoard);
    // console.log(`row: ${row}, col: ${col}`);
    moveInCurrentDirection(currentDirection);
    // console.log(`new row: ${row}, new col: ${col}`);
    if (newBoard[row]?.[col] === undefined || newBoard[row][col] === "") {
      setCurrentSelectedInput([row, col]);
      // console.log(`Setting current selected input to ${row}, ${col}`);
    } else {
      // console.log(`There's a tile at ${row}, ${col}, moving ${currentDirection}`);
      moveInCurrentDirection(currentDirection);
      // console.log(`new row: ${row}, new col: ${col}`);
      if (newBoard[row]?.[col] === undefined || newBoard[row][col] === "") {
        setCurrentSelectedInput([row, col]);
        // console.log(`Setting current selected input to ${row}, ${col}`);
      } else {
        setCurrentSelectedInput([]);
        // console.log(`Setting current selected input to []`);
      }
    }
    const colDiff = Math.max(0, expandedBoardPadding - expandedCol);
    const rowDiff = Math.max(0, expandedBoardPadding - expandedRow);
    console.log(`colDiff: ${colDiff}, rowDiff: ${rowDiff}`);
    if (colDiff === 0 && rowDiff === 0) return;
    setScroll((prev) => {
      const newScroll = { ...prev };
      console.log(`prev scroll: ${newScroll.left}, ${newScroll.top}`);
      newScroll.left += colDiff * tileWidthHeight;
      newScroll.top += rowDiff * tileWidthHeight;
      console.log(`new scroll: ${newScroll.left}, ${newScroll.top}`);
      return newScroll;
    });
  }

  //Event Listeners
  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault(); // Prevent the default zoom behavior

      const parent = boardContainerRef.current;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const mouseX = e.clientX - parentRect.left;
      const mouseY = e.clientY - parentRect.top;
      console.group("handleWheel");
      console.log(`Mouse X: ${mouseX}, Mouse Y: ${mouseY}`);

      const prevTileWidthHeight = tileWidthHeight;
      const tileSizeChange = prevTileWidthHeight / 10;
      const newTileWidthHeight =
        e.deltaY > 0
          ? prevTileWidthHeight - tileSizeChange
          : prevTileWidthHeight + tileSizeChange;
      console.log(`e.deltaY: ${e.deltaY}`);
      console.log(`Previous tile width height: ${prevTileWidthHeight}`);
      console.log(`New tile width height: ${newTileWidthHeight}`);

      // Calculate the new scroll positions
      const boardWidth = board[0].length * prevTileWidthHeight;
      const boardHeight = board.length * prevTileWidthHeight;
      console.log(`Board width: ${boardWidth}, Board height: ${boardHeight}`);

      const mouseXOnBoard = parent.scrollLeft + mouseX;
      const mouseYOnBoard = parent.scrollTop + mouseY;
      const xPercentage = mouseXOnBoard / boardWidth;
      const yPercentage = mouseYOnBoard / boardHeight;
      console.log(
        `Mouse X on board: ${mouseXOnBoard}, Mouse Y on board: ${mouseYOnBoard}`,
      );
      console.log(`X percentage: ${xPercentage}, Y percentage: ${yPercentage}`);

      const newBoardWidth = board[0].length * newTileWidthHeight;
      const newBoardHeight = board.length * newTileWidthHeight;
      console.log(
        `New board width: ${newBoardWidth}, New board height: ${newBoardHeight}`,
      );

      const newScrollLeft = xPercentage * newBoardWidth - mouseX;
      const newScrollTop = yPercentage * newBoardHeight - mouseY;
      console.log(
        `New scroll left: ${newScrollLeft}, New scroll top: ${newScrollTop}`,
      );

      setScroll({ left: newScrollLeft, top: newScrollTop });

      setTileWidthHeight(newTileWidthHeight);
      console.log(`set tile width height: ${newTileWidthHeight}`);
      console.groupEnd();
    }
  }

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      console.log("handleInputKeyDown", e.key, row, col);
      if (auth.currentUser === null || !gameState) {
        console.error(
          "auth.currentUser or gameState is null - this should never happen",
        );
        return;
      }
      if (e.ctrlKey || e.metaKey) return; //If it is the command or control key, return - allows for refreshing the page
      e.preventDefault();
      if (e.key === "ArrowRight") {
        setCurrentDirection("right");
        return true;
      }
      if (e.key === "ArrowDown") {
        setCurrentDirection("down");
        return true;
      }
      if (!/^[a-zA-Z]$/.test(e.key)) {
        console.log("Invalid key", e.key);
        return;
      }

      const playerTilesIndex = gameState.players[
        auth.currentUser.uid
      ].tiles.indexOf(e.key.toUpperCase());
      if (playerTilesIndex === -1) {
        const flashingTilesCopy = JSON.parse(JSON.stringify(flashingTiles));
        flashingTilesCopy[row] = flashingTilesCopy[row] ?? {};
        flashingTilesCopy[row][col] = true;
        setFlashingTiles(flashingTilesCopy);
        setTimeout(() => {
          delete flashingTilesCopy[row][col];
          setFlashingTiles(flashingTilesCopy);
        }, 500);
        return;
      }

      const mockTileData = { letter: e.key.toUpperCase(), x: playerTilesIndex };
      handleTileDrop(mockTileData, row, col);
    },
    [flashingTiles, gameState, handleTileDrop],
  );

  function handleInputFocus(i?: number, j?: number) {
    // console.log(`handleInputFocus: ${i}, ${j}`);
    if (i === undefined || j === undefined) {
      setCurrentSelectedInput([]);
      return;
    }
    setCurrentSelectedInput([
      i - expandedBoardPadding,
      j - expandedBoardPadding,
    ]);
  }

  function handleInputBlur() {
    console.log("handleInputBlur");
    setCurrentSelectedInput([]);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 1) {
      // Middle mouse button
      e.preventDefault();
      e.stopPropagation();
      setIsMiddleMouseDown(true);
      setScroll({
        left: boardContainerRef.current?.scrollLeft || 0,
        top: boardContainerRef.current?.scrollTop || 0,
      });
      setMouseStartPosition({ x: e.clientX, y: e.clientY });
    }
  }

  function handleMouseUp() {
    setIsMiddleMouseDown(false);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isMiddleMouseDown && boardContainerRef.current) {
      const dx = e.clientX - mouseStartPosition.x;
      const dy = e.clientY - mouseStartPosition.y;
      boardContainerRef.current.scrollLeft = scroll.left - dx;
      boardContainerRef.current.scrollTop = scroll.top - dy;
    }
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      ref={boardContainerRef}
      className={`flex h-full w-full flex-col overflow-scroll ${isMiddleMouseDown ? "cursor-grabbing" : ""}`}
    >
      {expandedBoard.map((row, y) => (
        <div key={y} className="flex">
          {row.map((letter, x) =>
            letter === "" ? (
              <DroppableArea
                key={`${y}-${x}`}
                style={getGridStyles()}
                className="relative flex flex-shrink-0 items-center justify-center border border-gray-800 text-center"
                handleDrop={(data: TileData) => {
                  handleTileDrop(data, y, x);
                }}
                handleDragEnter={(element) => {
                  element.classList.add("bg-slate-600");
                }}
                handleDragLeave={(element) => {
                  element.classList.remove("bg-slate-600");
                }}
              >
                <input
                  type="text"
                  className="h-full w-full text-center transition-colors duration-500"
                  style={{
                    backgroundColor: flashingTiles[y]?.[x] ? "red" : "",
                    outline: "none",
                    fontSize: `${Math.floor(tileWidthHeight * 0.6)}px`,
                    cursor: "inherit",
                  }}
                  onFocus={() => {
                    handleInputFocus(y, x);
                  }}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => handleInputKeyDown(e, y, x)}
                  ref={isSelectedInput(y, x) ? selectedInputRef : undefined}
                />
                {currentSelectedInput.length !== 0 && isSelectedInput(y, x) && (
                  <div ref={arrowRef} style={currentArrowStyles}></div>
                )}
              </DroppableArea>
            ) : (
              <div
                key={`${y}-${x}`}
                style={getGridStyles()}
                className="flex items-center justify-center"
              >
                <Tile
                  style={getBoardTileStyles()}
                  className={
                    "flex items-center justify-center bg-slate-300 text-center text-black"
                  }
                  letter={letter}
                  x={x}
                  y={y}
                />
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

export default PlayerBoard;
