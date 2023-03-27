import { TableRow } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Node extends TableRow {
  neighbors: string[];
  degreeCount: number;
  children?: Node[];
  parentPosition?: number;
  _type?: string;
  [propName: string]: unknown;
}

export interface Edge extends TableRow {
  _from: string;
  _to: string;
  [propName: string]: unknown;
}

export interface Network {
  nodes: Node[];
  edges: Edge[];
}

export interface Cell {
  x: number;
  y: number;
  z: number;
  rowCellType?: string;
  colCellType?: string;
  rowID: string;
  colID: string;
  cellName: string;
  correspondingCell: string;
}

export interface ConnectivityCell {
  x: number;
  y: number;
  z: number;
  startingNode: string;
  endingNode: string;
  cellName: string;
  nodePosition: number;
  paths: number[];
  label: string;
  keys: string[];
}

export interface LoadError {
  message: string;
  href: string;
}

export interface ArangoAttributes {
  [key: string]: unknown[];
}

export interface ArangoPath {
  vertices: Node[];
  edges: Edge[];
}

export interface SlicedNetwork {
  network: Network;
  slice: number;
  time: number[] | Date[];
  category: string;
}

export interface SlicingConfig {
  startEdgeVar: string;
  endEdgeVar: string;
  edgeSliceNumber: number;
  inputRange: (Date | number | string)[];
  isTime: boolean;
  isNumeric: boolean;
  isValidRange: boolean;
}

export interface ProvState {
  selectNeighbors: boolean;
  directionalEdges: boolean;
  cellSize: number;
  selectedNodes: string[];
  selectedCell: Cell | null;
  aggregatedBy: string | null;
  labelVariable: string | undefined;
  expandedNodeIDs: string[];
  degreeRange: [number, number];
  sliceIndex: number;
  slicingConfig: SlicingConfig;
}

export type ProvenanceEventTypes =
  'Set Select Neighbors' |
  'Set Show Grid Lines' |
  'Set Directional Edges' |
  'Select Cell' |
  'De-Select Cell' |
  'Select Node(s)' |
  'De-select Node(s)' |
  'Clear Selection' |
  'Set Label Variable';

export const internalFieldNames = ['_from', '_to', '_id', '_rev', '_key', 'neighbors', 'children', '_type'] as const;
export type InternalField = (typeof internalFieldNames)[number];
