import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';

import { range } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { initProvenance, Provenance } from '@visdesignlab/trrack';

import api from '@/api';
import {
  GraphSpec, RowsSpec, TableRow, UserSpec,
} from 'multinet';
import {
  Cell,
  Edge, LoadError, Network, Node, ProvenanceEventTypes, State,
} from '@/types';
import { defineNeighbors } from '@/lib/utils';
import { undoRedoKeyHandler, updateProvenanceState } from '@/lib/provenanceUtils';

Vue.use(Vuex);

const {
  store,
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
} = createDirectStore({
  state: {
    workspaceName: null,
    networkName: null,
    network: null,
    loadError: {
      message: '',
      href: '',
    },
    userInfo: null,
    cellSize: 15,
    selectedNodes: [],
    selectedCells: [],
    hoveredNodes: [],
    sortOrder: [],
    directionalEdges: false,
    selectNeighbors: true,
    showGridLines: true,
    enableAggregation: false,
    aggregated: false,
    showChildLegend: false,
    visualizedNodeAttributes: [],
    visualizedEdgeAttributes: [],
    maxConnections: {
      unAggr: 0,
      parent: 0,
      child: 0,
    },
    nodeTableNames: [],
    edgeTableName: null,
    provenance: null,
    showProvenanceVis: false,
  } as State,

  getters: {
    cellColorScale(state): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, state.maxConnections.unAggr])
        .range(['#feebe2', '#690000']); // TODO: colors here are arbitrary, change later
    },

    parentColorScale(state): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, state.maxConnections.parent])
        .range(['#dcedfa', '#0066cc']);
    },

    childColorScale(state): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, state.maxConnections.child])
        .range(['#f79d97', '#c0362c']);
    },
  },

  mutations: {
    setWorkspaceName(state, workspaceName: string) {
      state.workspaceName = workspaceName;
    },

    setNetworkName(state, networkName: string) {
      state.networkName = networkName;
    },

    setNetwork(state, network: Network) {
      // eslint-disable-next-line no-param-reassign
      network.nodes = network.nodes.sort((node1, node2) => {
        const key1 = parseInt(node1._key, 10);
        const key2 = parseInt(node2._key, 10);

        if (key1 && key2) {
          return key1 - key2;
        }

        return node1._key.localeCompare(node2._key);
      });
      state.network = network;
    },

    setLoadError(state, loadError: LoadError) {
      state.loadError = {
        message: loadError.message,
        href: loadError.href,
      };
    },

    setUserInfo(state, userInfo: UserSpec | null) {
      state.userInfo = userInfo;
    },

    clickElement(state, elementID: string) {
      if (state.selectedNodes.indexOf(elementID) === -1) {
        state.selectedNodes.push(elementID);

        if (state.provenance !== null) {
          updateProvenanceState(state, 'Select Node');
        }
      } else {
        state.selectedNodes = state.selectedNodes.filter((arrayElementID) => arrayElementID !== elementID);

        if (state.provenance !== null) {
          updateProvenanceState(state, 'De-Select Node');
        }
      }
    },

    clickCell(state, cell: Cell) {
      // Add/remove cell from selectedCells. If adding make sure nodes are selected
      if (state.selectedCells.findIndex((arrayElement) => arrayElement.cellName === cell.cellName) === -1) {
        state.selectedCells.push(cell);

        if (state.provenance !== null) {
          updateProvenanceState(state, 'Select Cell');
        }
      } else {
        state.selectedCells = state.selectedCells.filter((arrayElement) => arrayElement.cellName !== cell.cellName);

        if (state.provenance !== null) {
          updateProvenanceState(state, 'De-Select Cell');
        }
      }
    },

    setSortOrder(state, sortOrder: number[]) {
      state.sortOrder = sortOrder;
    },

    pushHoveredNode(state, nodeID: string) {
      if (state.hoveredNodes.indexOf(nodeID) === -1) {
        state.hoveredNodes.push(nodeID);
      }
    },

    removeHoveredNode(state, nodeID: string) {
      state.hoveredNodes = state.hoveredNodes.filter((hoveredNode) => hoveredNode !== nodeID);
    },

    clearHoveredNodes(state) {
      state.hoveredNodes = [];
    },

    setNodeTableNames(state, nodeTableNames: string[]) {
      state.nodeTableNames = nodeTableNames;
    },

    setEdgeTableName(state, edgeTableName: string | null) {
      state.edgeTableName = edgeTableName;
    },

    setDirectionalEdges(state, directionalEdges: boolean) {
      state.directionalEdges = directionalEdges;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Directional Edges');
      }
    },

    setSelectNeighbors(state, selectNeighbors: boolean) {
      state.selectNeighbors = selectNeighbors;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Select Neighbors');
      }
    },

    setShowGridlines(state, showGridLines: boolean) {
      state.showGridLines = showGridLines;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Show Grid Lines');
      }
    },

    setEnableAggregation(state, enableAggregation: boolean) {
      state.enableAggregation = enableAggregation;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Enable Aggregation');
      }
    },

    setAggregated(state, aggregated: boolean) {
      state.aggregated = aggregated;
    },

    setShowChildLegend(state, showChildLegend: boolean) {
      state.showChildLegend = showChildLegend;
    },

    setMaxConnections(state, maxConnections: {
      unAggr: number;
      parent: number;
      child: number;
    }) {
      state.maxConnections = maxConnections;
    },

    setProvenance(state, provenance: Provenance<State, ProvenanceEventTypes, unknown>) {
      state.provenance = provenance;
    },

    goToProvenanceNode(state, node: string) {
      if (state.provenance !== null) {
        state.provenance.goToNode(node);
      }
    },

    toggleShowProvenanceVis(state) {
      state.showProvenanceVis = !state.showProvenanceVis;
    },
  },
  actions: {
    async fetchNetwork(context, { workspaceName, networkName }) {
      const { commit, dispatch } = rootActionContext(context);
      commit.setWorkspaceName(workspaceName);
      commit.setNetworkName(networkName);

      let networkTables: GraphSpec | undefined;

      // Get all table names
      try {
        networkTables = await api.graph(workspaceName, networkName);
      } catch (error) {
        if (error.status === 404) {
          if (workspaceName === undefined || networkName === undefined) {
            commit.setLoadError({
              message: 'Workspace and/or network were not defined in the url',
              href: 'https://multinet.app',
            });
          } else {
            commit.setLoadError({
              message: error.statusText,
              href: 'https://multinet.app',
            });
          }
        } else if (error.status === 401) {
          commit.setLoadError({
            message: 'You are not authorized to view this workspace',
            href: 'https://multinet.app',
          });
        } else {
          commit.setLoadError({
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          });
        }
      } finally {
        if (store.state.loadError.message === '' && typeof networkTables === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&graph=${networkName}`,
          });
        }
      }

      if (networkTables === undefined) {
        return;
      }

      // Check node and table size
      const sizePromises = networkTables.nodeTables.map((table) => api.aql(workspaceName, `FOR doc IN ${table} COLLECT WITH COUNT INTO length RETURN length`));
      const resolvedSizePromises = await Promise.all(sizePromises);
      resolvedSizePromises.forEach((promise) => {
        if (promise[0] > 500) {
          commit.setLoadError({
            message: 'The network you are loading is too large',
            href: 'https://multinet.app',
          });
        }
      });
      commit.setNodeTableNames(networkTables.nodeTables);
      commit.setEdgeTableName(networkTables.edgeTable);
      if (store.state.loadError.message !== '') {
        return;
      }

      // Generate all node table promises
      const nodePromises: Promise<RowsSpec>[] = [];
      networkTables.nodeTables.forEach((table) => {
        nodePromises.push(api.table(workspaceName, table, { offset: 0, limit: 1000 }));
      });

      // Resolve all node table promises and extract the rows
      const resolvedNodePromises = await Promise.all(nodePromises);
      let nodes: TableRow[] = [];
      resolvedNodePromises.forEach((resolvedPromise) => {
        nodes.push(...resolvedPromise.rows);
      });

      // Generate and resolve edge table promise and extract rows
      const edgePromise = await api.table(workspaceName, networkTables.edgeTable, { offset: 0, limit: 1000 });
      const edges = edgePromise.rows as Edge[];

      // Add neighbor definition to nodes
      nodes = defineNeighbors(nodes, edges);

      // Build the network object and set it as the network in the store
      const network = {
        nodes: nodes as Node[],
        edges: edges as Edge[],
      };
      dispatch.updateNetwork({ network });
    },

    updateNetwork(context, payload: { network: Network }) {
      const { commit } = rootActionContext(context);
      commit.setNetwork(payload.network);
      commit.setSortOrder(range(0, payload.network.nodes.length));
    },

    async fetchUserInfo(context) {
      const { commit } = rootActionContext(context);

      const info = await api.userInfo();
      commit.setUserInfo(info);
    },

    async logout(context) {
      const { commit } = rootActionContext(context);

      // Perform the server logout.
      await api.logout();
      commit.setUserInfo(null);
    },

    createProvenance(context) {
      const { commit } = rootActionContext(context);

      const storeState = context.state;

      const stateForProv = JSON.parse(JSON.stringify(context.state));
      stateForProv.selectedNodes = new Set<string>();

      commit.setProvenance(initProvenance<State, ProvenanceEventTypes, unknown>(
        stateForProv,
        { loadFromUrl: false },
      ));

      // Add a global observer to watch the state and update the tracked elements in the store
      // enables undo/redo + navigating around provenance graph
      storeState.provenance.addGlobalObserver(
        () => {
          const provenanceState = context.state.provenance.state;

          const { selectedNodes, selectedCells } = provenanceState;

          // Helper function
          const setsAreEqual = (a: Set<unknown>, b: Set<unknown>) => a.size === b.size && [...a].every((value) => b.has(value));

          // If the sets are not equal (happens when provenance is updated through provenance vis),
          // update the store's selectedNodes to match the provenance state
          if (!setsAreEqual(new Set(selectedNodes), new Set(storeState.selectedNodes))) {
            storeState.selectedNodes = selectedNodes instanceof Array ? selectedNodes : [];
          } else if (!setsAreEqual(new Set(selectedCells), new Set(storeState.selectedCells))) {
            storeState.selectedCells = selectedCells instanceof Array ? selectedCells : [];
          }

          // Iterate through vars with primitive data types
          [
            'selectNeighbors',
            'showGridLines',
            'directionalEdges',
            'enableAggregation',
          ].forEach((primitiveVariable) => {
            if (storeState[primitiveVariable] !== provenanceState[primitiveVariable]) {
              storeState[primitiveVariable] = provenanceState[primitiveVariable];
            }
          });
        },
      );

      storeState.provenance.done();

      // Add keydown listener for undo/redo
      document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, storeState));
    },
  },
});

export default store;
export {
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
};

// The following lines enable types in the injected store '$store'.
export type ApplicationStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: ApplicationStore;
  }
}
