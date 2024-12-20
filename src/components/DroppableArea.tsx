import { useRef, useEffect, ReactNode } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface DroppableAreaProps {
    handleDrop: (data: any) => void;
    handleDragEnter?: (element: HTMLDivElement) => void;
    handleDragLeave?: (element: HTMLDivElement) => void;
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    _droppableRef?: React.RefObject<HTMLDivElement>;
}

const DroppableArea = ({ handleDrop, handleDragEnter, handleDragLeave, children, className, style, _droppableRef }: DroppableAreaProps) => {
    const droppableRef = _droppableRef ?? useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = droppableRef.current;
        if (element) {
            const cleanup = dropTargetForElements({
                element,
                onDrop: (args) => {
                    handleDrop(args.source.data);
                },
                onDragEnter: handleDragEnter ?
                (() => {handleDragEnter(element)}) :
                (() => {}),
                onDragLeave: handleDragLeave ?
                (() => {handleDragLeave(element)}) :
                (() => {}),
            });
            return cleanup;
        }
    }, [handleDrop]);

    return (
        <div ref={droppableRef} className={className} style={style}>
            {children}
        </div>
    );
};

export default DroppableArea;
