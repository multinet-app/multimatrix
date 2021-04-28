import { TableRow, UserSpec } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Link extends TableRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any;
}

export interface Network {
  nodes: Node[];
  edges: Link[];
}

export interface Node extends TableRow {
  type: string;
  neighbors: string[];
  [propName: string]: unknown;
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

export interface LoadError {
  message: string;
  href: string;
}

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  network: Network | null;
  loadError: LoadError;
  userInfo: UserSpec | null;
  cellSize: number;
  selectedNodes: string[];
}

export interface ProvenanceState {
  workerID: number;
  nodes: string;
  search: string;
  startTime: number;
  endTime: string;
  time: number;
  event: string;
  count: number;
  clicked: never[];
  sortKey: string;
  selections: {
    attrRow: { [key: string]: unknown[] };
    rowLabel: { [key: string]: unknown[] };
    colLabel: { [key: string]: unknown[] };
    neighborSelect: { [key: string]: unknown[] };
    cellCol: { [key: string]: unknown[] };
    cellRow: { [key: string]: unknown[] };
    search: { [key: string]: unknown[] };
  };
}

export interface AttrVis {
  _key: string;
  id: string;
  [propName: string]: any;
  series: [number, number, { [key: string]: any }, string][];
  values: { [key: string]: any };
}
