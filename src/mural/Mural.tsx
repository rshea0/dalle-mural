import mergeProps from 'merge-props';
import { observer } from 'mobx-react-lite';
import { useImperativeHandle, useRef } from 'react';

import {
  BrushSize,
  canvasToImage,
  clearCanvas,
  cropCanvasToImage,
  getContextOrFail,
  Rect,
} from '../canvas';
import { ZStack } from '../components/ZStack';
import { models } from '../store';
import { ImageDataUrl } from '../utils';
import { BrushFillLayer } from './BrushFillLayer';
import { BrushOutlineLayer } from './BrushOutlineLayer';
import { GridLayer } from './GridLayer';
import { MainLayer } from './MainLayer';
import { SelectionLayer } from './SelectionLayer';
import { useMouseBrush } from './use-mouse-brush';
import { useMouseRectSelection } from './use-mouse-rect-selection';

export interface MuralRef {
  rasterize: () => ImageDataUrl;
  getRectImage: (rect: Rect) => ImageDataUrl;
  getEraseMask: () => ImageDataUrl;
  clearEraseFill: () => void;
}

export const Mural = observer(_Mural);

// TODO: replace canSelect and canErase with a mode prop
function _Mural({
  mural,
  isGridVisible = true,
  canSelect = false,
  onSelectionChange,
  onSelect,
  onDeselect,
  selectedGeneration,
  canErase,
  eraseBrushSize,
  onEraseStart,
  muralRef,
  ...passthrough
}: {
  mural: models.Mural;
  isGridVisible?: boolean;
  canSelect: boolean;
  onSelectionChange: (rect: Rect | null) => void;
  onSelect: () => void;
  onDeselect: () => void;
  selectedGeneration: models.Generation | null;
  canErase: boolean;
  eraseBrushSize: BrushSize;
  onEraseStart: () => void;
  muralRef?: React.Ref<MuralRef>;
}) {
  const {
    //
    selection,
    isSelected,
    events: selectionEvents,
  } = useMouseRectSelection({
    canSelect,
    onSelectionChange,
    onSelect,
    onDeselect,
    dimensions: models.Generation.DIMENSIONS,
    adjust: rect =>
      snapToGrid({
        rect,
        subdivideRatio: mural.gridSubdivideRatio,
      }),
  });

  const {
    brush: eraseBrush,
    isPainting: isErasing,
    events: brushEvents,
  } = useMouseBrush({
    canPaint: canErase,
    size: eraseBrushSize,
    onPaintStart: onEraseStart,
  });

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const eraseFillCanvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(muralRef, getHandle);

  return (
    <ZStack
      width={mural.width}
      height={mural.height}
      {...mergeProps(selectionEvents, brushEvents, passthrough)}
    >
      <MainLayer
        mural={mural}
        canvasRef={mainCanvasRef}
      />

      <GridLayer mural={mural} />

      <SelectionLayer
        selection={selection}
        isSelected={isSelected}
        selectedGeneration={selectedGeneration}
      />

      <BrushFillLayer
        brush={eraseBrush}
        isPainting={isErasing}
        canvasRef={eraseFillCanvasRef}
      />
      <BrushOutlineLayer brush={eraseBrush} />
    </ZStack>
  );

  function getHandle(): MuralRef {
    return {
      rasterize: () => canvasToImage(mainCanvasRef.current!),
      getRectImage: rect =>
        cropCanvasToImage({
          canvas: mainCanvasRef.current!,
          rect,
        }),
      getEraseMask: () => canvasToImage(eraseFillCanvasRef.current!),
      clearEraseFill: () => {
        const ctx = getContextOrFail(eraseFillCanvasRef.current!);
        clearCanvas(ctx);
      },
    };
  }
}

function snapToGrid({
  rect,
  subdivideRatio,
}: {
  rect: Rect;
  subdivideRatio: number;
}): Rect {
  const squareSize = models.Generation.SIZE * subdivideRatio;

  return {
    ...rect,
    x: snapValue(rect.x),
    y: snapValue(rect.y),
  };

  function snapValue(value: number): number {
    return value - (value % squareSize);
  }
}
