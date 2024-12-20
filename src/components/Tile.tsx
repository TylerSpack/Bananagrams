import { useRef, useEffect, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAppContext } from "../context/AppContext";

interface TileProps {
  className?: string;
  style?: React.CSSProperties;
  letter: string;
  x?: number;
  y?: number;
}

const Tile = ({ className, style, letter, x, y }: TileProps) => {
  const draggableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = draggableRef.current;
    if (element) {
      const cleanup = draggable({
        element,
        getInitialData: () => ({ letter, x, y }), //Initializes data of the draggable
        onDragStart: () => {},
        // onDrop: () => setIsDragging(false),
      });
      return cleanup;
    }
  }, [letter]);

  return (
    <div ref={draggableRef} className={className} style={style}>
      {letter}
    </div>
  );
};

export default Tile;
