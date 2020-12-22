export interface Dimensions {
  height: number;
  width: number;
}

export interface Link {
  _key: string;
  id: string;
  _from: string;
  _to: string;
  [propName: string]: unknown;
}

export interface Network {
  nodes: Node[];
  links: Link[];
}

export interface Node {
  _key: string;
  id: string;
  neighbors: string[];
  [propName: string]: unknown;
}

export interface Cell {
  x: number;
  y: number;
  z: number;
  rowID: string;
  colID: string;
  cellName: string;
  correspondingCell: string;
}

export interface State {
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
