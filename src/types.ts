import { TableRow } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Link extends TableRow {
  [propName: string]: any;
}

export interface Network {
  nodes: Node[];
  edges: Link[];
}

export interface Node extends TableRow {
  neighbors: string[];
  [propName: string]: any;
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

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  network: Network | null;
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
    attrRow: { [key: string]: any };
    rowLabel: { [key: string]: any };
    colLabel: { [key: string]: any };
    neighborSelect: { [key: string]: any };
    cellCol: { [key: string]: any };
    cellRow: { [key: string]: any };
    search: { [key: string]: any };
  };
}
