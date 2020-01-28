/* The Controller controls the model and tell the model how to manipulate the data */
import * as d3 from 'd3';

export class Controller {
  public columnSelectedNodes: {} = {};
  public highlightedNodes: {} = {};
  public attributeProportion: number;
  public sortKey: string;
  public nodeAttributes: any;

  private view: any;
  private model: any;
  private clickedCells: any;
  private hoverRow: any;
  private hoverCol: any;
  private datumID: any;
  private visDimensions: any;

  constructor(view: any, model: any, visDimensions: any) {
    this.visDimensions = visDimensions;
    this.hoverRow = {};
    this.hoverCol = {};
    this.datumID = 'id';
    this.clickedCells = new Set();
    this.attributeProportion = 1;

    this.view = view;
    this.model = model;

    this.view.controller = this;
    this.model.controller = this;

    d3.select('.topocontainer').style('width', '100%');
    d3.select('.topocontainer').style('height', (this.visDimensions.height).toString() + 'px');
    d3.select('.attrcontainer').style('width', '100%');
    d3.select('.attrcontainer').style('height', (this.visDimensions.height).toString() + 'px');

    this.model.reload();

    this.changeOrder('shortName', false);
  }

  public clear() {
    const action = {
      label: 'clear',
      action: () => {
        const currentState = this.model.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = 'clear';
        currentState.selections = {
          attrRow: {},
          rowLabel: {},
          colLabel: {},
          cellcol: {},
          cellrow: {},
          search: {},
          neighborSelect: {},
          previousMouseovers: [],
        };
        return currentState;
      },
      args: [],
    };
    this.model.provenance.applyAction(action);
  }

  /**
   * Passes the processed edge and node data to the view.
   * @return None
   */
  public loadData(nodes: any, edges: any, matrix: any) {
    this.view.loadData(nodes, edges, matrix);
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  public getOrder() {
    return this.model.getOrder();
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  public changeOrder(order: string, node: boolean = false) {
    this.sortKey = order;
    return this.model.changeOrder(order, node);
  }
}
