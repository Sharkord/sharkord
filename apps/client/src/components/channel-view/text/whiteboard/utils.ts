import {
  type Color,
  type Layer,
  LayerType,
  type PathLayer,
  type Point,
  Side,
  type XYWH
} from '@sharkord/shared';

export const colors: Color[] = [
  { r: 243, g: 82, b: 35 },
  { r: 255, g: 198, b: 38 },
  { r: 68, g: 202, b: 99 },
  { r: 39, g: 142, b: 237 },
  { r: 155, g: 105, b: 245 },
  { r: 252, g: 142, b: 42 },
  { r: 82, g: 82, b: 82 },
  { r: 255, g: 255, b: 255 },
  { r: 0, g: 0, b: 0 }
];

export function colorToCss(color: Color): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function getContrastingTextColor(color: Color): string {
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  return luminance > 182 ? '#000' : '#fff';
}

export function pointerEventToCanvasPoint(
  e: React.PointerEvent,
  camera: Point,
  svgElement: SVGSVGElement | null
): Point {
  const rect = svgElement?.getBoundingClientRect();
  const offsetX = rect?.left ?? 0;
  const offsetY = rect?.top ?? 0;
  return {
    x: Math.round(e.clientX - offsetX) - camera.x,
    y: Math.round(e.clientY - offsetY) - camera.y
  };
}

export function penPointsToPathLayer(
  points: number[][],
  color: Color
): PathLayer {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    type: LayerType.Path,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    fill: color,
    points: points.map(([x, y, pressure]) => [x - minX, y - minY, pressure])
  };
}

export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

export function findIntersectingLayersWithRectangle(
  layerIds: string[],
  layers: Record<string, Layer>,
  a: Point,
  b: Point
): string[] {
  const rect = {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  };

  return layerIds.filter((layerId) => {
    const layer = layers[layerId];
    if (!layer) return false;

    return (
      rect.x + rect.width > layer.x &&
      rect.x < layer.x + layer.width &&
      rect.y + rect.height > layer.y &&
      rect.y < layer.y + layer.height
    );
  });
}

export function resizeBounds(bounds: XYWH, corner: Side, point: Point): XYWH {
  const result = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };

  if ((corner & Side.Left) === Side.Left) {
    result.x = Math.min(point.x, bounds.x + bounds.width);
    result.width = Math.abs(bounds.x + bounds.width - point.x);
  }

  if ((corner & Side.Right) === Side.Right) {
    result.x = Math.min(point.x, bounds.x);
    result.width = Math.abs(point.x - bounds.x);
  }

  if ((corner & Side.Top) === Side.Top) {
    result.y = Math.min(point.y, bounds.y + bounds.height);
    result.height = Math.abs(bounds.y + bounds.height - point.y);
  }

  if ((corner & Side.Bottom) === Side.Bottom) {
    result.y = Math.min(point.y, bounds.y);
    result.height = Math.abs(point.y - bounds.y);
  }

  return result;
}

export function randomBorderColor(): string {
  const borderColors = [
    'border-red-500',
    'border-blue-500',
    'border-green-500',
    'border-purple-500',
    'border-yellow-500',
    'border-pink-500',
    'border-cyan-500'
  ];
  return borderColors[Math.floor(Math.random() * borderColors.length)];
}

export function calculateFontSize(width: number, height: number): number {
  const maxFontSize = 96;
  const scaleFactor = 0.5;
  const fontSizeBasedOnHeight = height * scaleFactor;
  const fontSizeBasedOnWidth = width * scaleFactor;
  return Math.min(fontSizeBasedOnHeight, fontSizeBasedOnWidth, maxFontSize);
}
