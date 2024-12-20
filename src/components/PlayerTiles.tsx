import React, { useEffect, useRef, useState } from "react";
import Tile from "./Tile";
import DroppableArea from "./DroppableArea";
import TileData from "../types/TileData";
import { useAppContext } from "../context/AppContext";

interface PlayerTilesProps {
  interactable?: boolean;
  tiles: string[];
}

const PlayerTiles: React.FC<PlayerTilesProps> = ({ interactable, tiles }) => {
  const {
    returnTileToPlayerTiles,
    gameState,
    setGameState,
    isHost,
    sendMessageToHost,
    sendMessageToPeers,
  } = useAppContext();
  const playerTilesContainer = useRef<HTMLDivElement>(null);
  const [tileStyle, setTileStyle] = useState<React.CSSProperties>({});
  const maxTileWidthHeight = 60;

  useEffect(() => {
    recalculateStyles();
    window.addEventListener("resize", recalculateStyles);
    return () => window.removeEventListener("resize", recalculateStyles);
  }, [tiles]);

  function recalculateStyles() {
    if (!playerTilesContainer.current) return;
    let { clientWidth: width, clientHeight: height } =
      playerTilesContainer.current;
    width = Math.floor(width); // In case it's a float
    height = Math.floor(height); // In case it's a float
    // console.log(`recalculateStyles: width=${width}, height=${height} tiles=${tiles}`);
    const containerPadding = 8; //px each side
    const borderWidth = 2; //px each side
    width -= containerPadding * 2 - borderWidth * 2;
    height -= containerPadding * 2 - borderWidth * 2;

    // Calculate optimal player tiles grid dimensions
    const aspectRatio = width / height;
    const tilesCount = tiles.length;
    const numCols = Math.ceil(Math.sqrt(tilesCount * aspectRatio));
    const numRows = Math.ceil(tilesCount / numCols);

    // Calculate tile size based on available space
    const tileSize = Math.min(
      maxTileWidthHeight,
      Math.floor(Math.min(width / numCols, height / numRows)),
    );

    const tileMargin = Math.floor(tileSize * 0.05); // 5% margin each side
    const tileWidthHeight = tileSize - tileMargin * 2;
    const newTileStyle = {
      width: `${tileWidthHeight}px`,
      height: `${tileWidthHeight}px`,
      fontSize: `${Math.floor(tileWidthHeight * 0.8)}px`,
      borderRadius: `${Math.ceil(tileWidthHeight * 0.05)}px`,
      margin: `${tileMargin}px`,
    };
    setTileStyle(newTileStyle);
    // console.log(`setTileStyle: ${JSON.stringify(newTileStyle)}`);
  }
  function handleReturnPlayerTile(data: TileData) {
    console.log("PlayerTiles handleReturnPlayerTile:", data);
    const gameStateCopy = JSON.parse(JSON.stringify(gameState));
    const newGameState = returnTileToPlayerTiles(gameStateCopy, data);
    if (newGameState) {
      setGameState(newGameState);
      if (isHost) {
        sendMessageToPeers(
          JSON.stringify({ type: "gameState", gameState: newGameState }),
        );
      } else {
        sendMessageToHost(
          JSON.stringify({ type: "gameState", gameState: newGameState }),
        );
      }
    }
  }

  return (
    <DroppableArea
      _droppableRef={playerTilesContainer}
      className="flex h-full w-full flex-wrap content-start"
      style={{ padding: "8px", border: "2px solid #404040" }}
      handleDrop={handleReturnPlayerTile}
    >
      {tiles.map((letter, i) =>
        interactable ? (
          <Tile
            className="flex items-center justify-center rounded bg-slate-300 text-center text-black"
            style={tileStyle}
            key={i}
            letter={letter}
            x={i}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded bg-slate-300 text-center text-black"
            style={tileStyle}
            key={i}
          >
            {letter}
          </div>
        ),
      )}
    </DroppableArea>
  );
};

export default PlayerTiles;
