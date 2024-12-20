import { useEffect, useRef, useState } from "react";

interface OpponentBoardProps {
  board: string[][];
}

const OpponentBoard: React.FC<OpponentBoardProps> = ({ board }) => {
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [tileWidthHeight, setTileWidthHeight] = useState<number>(50);

  useEffect(() => {
    const recalculateTileWidthHeight = () => {
      if (!boardContainerRef.current) return;
      let { clientWidth: boardWidth, clientHeight: boardHeight } =
        boardContainerRef.current;
      boardWidth = Math.floor(boardWidth); // In case it's a float
      boardHeight = Math.floor(boardHeight); // In case it's a float
      console.log(`recalculateTileWidthHeight: width=${boardWidth}, height=${boardHeight}`);
      const containerPadding = 16; //px each side
      boardWidth -= containerPadding * 2;
      boardHeight -= containerPadding * 2;
      const numCols = board[0].length;
      const numRows = board.length;
      const maxTileSize = Math.floor(Math.min(boardWidth, boardHeight) / 5);
      const tileSize = Math.floor(
        Math.min(maxTileSize, boardWidth / numCols, boardHeight / numRows),
      );
      console.log(`tileSize=${tileSize}`);

      const tileMargin = Math.floor(tileSize * 0.05); // 5% margin each side
      const newTileWidthHeight = tileSize - tileMargin * 2;
      setTileWidthHeight(newTileWidthHeight);
    };

    recalculateTileWidthHeight();
    window.addEventListener("resize", recalculateTileWidthHeight);
    return () =>
      window.removeEventListener("resize", recalculateTileWidthHeight);
  }, [board]);

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

  return (
    <div
      ref={boardContainerRef}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      {board.map((row, y) => (
        <div key={y} className="flex">
          {row.map((letter, x) =>
            letter === "" ? (
              <div key={`${y}-${x}`} style={getGridStyles()} />
            ) : (
              <div
                key={`${y}-${x}`}
                style={getGridStyles()}
                className="flex items-center justify-center"
              >
                <div
                  style={getBoardTileStyles()}
                  className={
                    "flex items-center justify-center bg-slate-300 text-center text-black"
                  }
                >
                  {letter}
                </div>
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

export default OpponentBoard;
