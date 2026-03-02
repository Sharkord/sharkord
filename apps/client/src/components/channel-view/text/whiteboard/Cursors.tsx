import { type WhiteboardCursor } from '@sharkord/shared';
import { memo } from 'react';

type CursorsProps = {
  cursors: Map<number, WhiteboardCursor>;
  currentUserId: number;
};

const Cursors = memo(({ cursors, currentUserId }: CursorsProps) => {
  return (
    <>
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        if (userId === currentUserId) return null;

        return (
          <g
            key={userId}
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              transition: 'transform 0.12s linear'
            }}
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill="#3b82f6"
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={8}
              y={24}
              fill="white"
              fontSize={11}
              fontWeight={500}
              style={{
                paintOrder: 'stroke',
                stroke: '#1e40af',
                strokeWidth: 3,
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              }}
            >
              {cursor.userName}
            </text>
          </g>
        );
      })}
    </>
  );
});

export { Cursors };
