export enum LayerType {
  Rectangle = 'rectangle',
  Ellipse = 'ellipse',
  Path = 'path',
  Text = 'text',
  Note = 'note',
  Triangle = 'triangle',
  Hexagon = 'hexagon',
  Line = 'line'
}

export enum CanvasMode {
  None = 'none',
  Pressing = 'pressing',
  SelectionNet = 'selectionNet',
  Translating = 'translating',
  Inserting = 'inserting',
  Resizing = 'resizing',
  Pencil = 'pencil'
}

export enum Side {
  Top = 1,
  Bottom = 2,
  Left = 4,
  Right = 8
}

export type Color = {
  r: number;
  g: number;
  b: number;
};

export type Point = {
  x: number;
  y: number;
};

export type XYWH = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RectangleLayer = {
  type: LayerType.Rectangle;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
};

export type EllipseLayer = {
  type: LayerType.Ellipse;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
};

export type PathLayer = {
  type: LayerType.Path;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
  points: number[][];
  strokeSize?: number;
};

export type TextLayer = {
  type: LayerType.Text;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
  value?: string;
};

export type NoteLayer = {
  type: LayerType.Note;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
  value?: string;
};

export type TriangleLayer = {
  type: LayerType.Triangle;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
};

export type HexagonLayer = {
  type: LayerType.Hexagon;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
};

export type LineLayer = {
  type: LayerType.Line;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Color;
  x2: number;
  y2: number;
};

export type Layer =
  | RectangleLayer
  | EllipseLayer
  | PathLayer
  | TextLayer
  | NoteLayer
  | TriangleLayer
  | HexagonLayer
  | LineLayer;

export type WhiteboardState = {
  layers: Record<string, Layer>;
  layerIds: string[];
};

export type WhiteboardCursor = {
  userId: number;
  userName: string;
  x: number;
  y: number;
};
