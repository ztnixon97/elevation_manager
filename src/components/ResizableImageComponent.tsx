import React, { useRef, useEffect, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

interface Props {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
}

const ResizableImageComponent: React.FC<Props> = ({ node, updateAttributes, selected }) => {
  const { src, width = '300px', alignment = 'center' } = node.attrs;
  const [currentWidth, setCurrentWidth] = useState(parseInt(width));
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - startXRef.current;
    const newWidth = Math.max(100, startWidthRef.current + dx);
    setCurrentWidth(newWidth); // only update local state
  };

  const onMouseUp = () => {
    if (isResizing) {
      updateAttributes({ width: `${currentWidth}px` }); // commit update once
      setIsResizing(false);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    setIsResizing(true);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing]);

  const handleAlign = (align: string) => {
    updateAttributes({ alignment: align });
  };

  return (
    <NodeViewWrapper className={`image-node align-${alignment}`} style={{ textAlign: alignment }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={src}
          alt=""
          style={{
            width: `${currentWidth}px`,
            maxWidth: '100%',
            border: selected ? '2px solid #2196f3' : 'none',
            transition: isResizing ? 'none' : 'width 0.1s ease-in-out',
          }}
        />
        {selected && (
          <div
            onMouseDown={onMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 12,
              height: 12,
              background: '#2196f3',
              borderRadius: '50%',
              cursor: 'nwse-resize',
              zIndex: 10,
            }}
          />
        )}
      </div>

      {selected && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => handleAlign('left')} style={{ marginRight: 4 }}>Left</button>
          <button onClick={() => handleAlign('center')} style={{ marginRight: 4 }}>Center</button>
          <button onClick={() => handleAlign('right')}>Right</button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ResizableImageComponent;
