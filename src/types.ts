export interface Dimensions {
  height: number;
  width: number;
}

export interface Link {
  _key: string;
  id: string;
  _from: string;
  _to: string;
  [propName: string]: any;
}

export interface Network {
  nodes: Node[];
  links: Link[];
}

export interface Node {
  _key: string;
  id: string;
  neighbors: string[];
  [propName: string]: any;
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
    attrRow: { [key: string]: any };
    rowLabel: { [key: string]: any };
    colLabel: { [key: string]: any };
    neighborSelect: { [key: string]: any };
    cellCol: { [key: string]: any };
    cellRow: { [key: string]: any };
    search: { [key: string]: any };
  };
}

export interface AttrVis {
  _key: string;
  id: string;
  [propName: string]: any;
  series: [number, number, { [key: string]: any }, string][]
  values: { [key: string]: any };
}
