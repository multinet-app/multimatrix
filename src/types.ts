import { TableRow } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Node extends TableRow {
  type: string;
  neighbors: string[];
  degreeCount: number;
  children?: Node[];
  parentPosition?: number;
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
  rowCellType: string;
  colCellType: string;
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

export const internalFieldNames = ['_from', '_to', '_id', '_rev', '_key', 'neighbors', 'children'] as const;
export type InternalField = (typeof internalFieldNames)[number];
