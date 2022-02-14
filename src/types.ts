import { TableRow, UserSpec, ColumnTypes } from 'multinet';
import { Provenance } from '@visdesignlab/trrack';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Node extends TableRow {
  type: string;
  neighbors: string[];
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

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  networkOnLoad: Network | null;
  slicedNetwork: SlicedNetwork[];
  columnTypes: ColumnTypes | null;
  network: Network | null;
  loadError: LoadError;
  userInfo: UserSpec | null;
  cellSize: number;
  selectedNodes: Set<string>;
  selectedCell: Cell | null;
  hoveredNodes: string[];
  sortOrder: number[];
  directionalEdges: boolean;
  selectNeighbors: boolean;
  showGridLines: boolean;
  aggregated: boolean;
  maxConnections: {
    unAggr: number;
    parent: number;
  };
  nodeTableNames: string[];
  edgeTableName: string | null;
  provenance: Provenance<State, ProvenanceEventTypes, unknown> | null;
  showProvenanceVis: boolean;
  nodeAttributes: ArangoAttributes;
  edgeAttributes: ArangoAttributes;
  showIntNodeVis: boolean;
  connectivityMatrixPaths: {nodes: Node[]; paths: ArangoPath[]};
  selectedConnectivityPaths: ArangoPath[];
  showPathTable: boolean;
  maxIntConnections: number;
  intAggregatedBy: string | undefined;
  labelVariable: string | undefined;
  rightClickMenu: {
    show: boolean;
    top: number;
    left: number;
  };
  isDate: boolean;
  controlsWidth: number;
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
