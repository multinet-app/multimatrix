import { TableRow, UserSpec } from 'multinet';
import { Provenance } from '@visdesignlab/trrack';

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
  selectedCells: Cell[];
  hoveredNodes: string[];
  sortOrder: number[];
  directionalEdges: boolean;
  selectNeighbors: boolean;
  showGridLines: boolean;
  enableGraffinity: boolean;
  aggregated: boolean;
  showChildLegend: boolean;
  maxConnections: {
    unAggr: number;
    parent: number;
    child: number;
  };
  nodeTableNames: string[];
  edgeTableName: string | null;
  provenance: Provenance<State, ProvenanceEventTypes, unknown> | null;
  showProvenanceVis: boolean;
}

export type ProvenanceEventTypes =
  'Set Select Neighbors';

export interface AttrVis {
  _key: string;
  id: string;
  [propName: string]: any;
  series: [number, number, { [key: string]: any }, string][];
  values: { [key: string]: any };
}
