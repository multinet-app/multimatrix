export interface Dimensions {
  height: number;
  width: number;
}

export interface Link {
  _key: string;
  id: string;
  source: string;
  target: string;
  [propName: string]: any;
}

export interface Network {
  nodes: Node[];
  links: Link[];
}

export interface Node {
  _key: string;
  id: string;
  [propName: string]: any;
}
