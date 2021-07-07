import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';

import { group, range } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { initProvenance, Provenance } from '@visdesignlab/trrack';

import api from '@/api';
import {
  GraphSpec, RowsSpec, TableRow, UserSpec,
} from 'multinet';
import {
  ArangoAttributes,
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
    nodeAttributes: {},
    edgeAttributes: {},
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

    nodeVariableItems(state): string[] {
      return state.network ? Object.keys(state.nodeAttributes) : [];
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
      if (!state.aggregated) {
        // eslint-disable-next-line no-param-reassign
        network.nodes = network.nodes.sort((node1, node2) => {
          const key1 = parseInt(node1._key, 10);
          const key2 = parseInt(node2._key, 10);

          if (key1 && key2) {
            return key1 - key2;
          }

          return node1._key.localeCompare(node2._key);
        });
      }
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

    setAttributeValues(state, network: Network) {
      const allNodeKeys: Set<string> = new Set();
      network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allNodeKeys.add(key)));
      const nodeKeys = [...allNodeKeys];
      state.nodeAttributes = nodeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
      nodeKeys.forEach((key: string) => {
        state.nodeAttributes[key] = [...new Set(network.nodes.map((n: Node) => `${n[key]}`).sort())];
      });

      const allEdgeKeys: Set<string> = new Set();
      network.edges.forEach((edge: Edge) => Object.keys(edge).forEach((key) => allEdgeKeys.add(key)));
      const edgeKeys = [...allEdgeKeys];
      state.edgeAttributes = edgeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
      edgeKeys.forEach((key: string) => {
        state.edgeAttributes[key] = [...new Set(network.edges.map((e: Edge) => `${e[key]}`).sort())];
      });
    },

    setLargeNetworkAttributeValues(state: State, payload: { nodeAttributes: ArangoAttributes; edgeAttributes: ArangoAttributes }) {
      state.nodeAttributes = payload.nodeAttributes;
      state.edgeAttributes = payload.edgeAttributes;
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
      commit.setAttributeValues(network);
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

    aggregateNetwork(context, varName: string) {
      const { state, commit, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        // Calculate edges
        const aggregatedEdges = state.network.edges.map((edge) => {
          const fromNode = state.network && state.network.nodes.find((node) => node._id === edge._from);
          const toNode = state.network && state.network.nodes.find((node) => node._id === edge._to);

          if (fromNode === undefined || toNode === undefined || fromNode === null || toNode === null) {
            return edge;
          }

          const fromNodeValue = fromNode[varName];
          const toNodeValue = toNode[varName];

          /* eslint-disable no-param-reassign */
          /* eslint-disable no-underscore-dangle */
          edge.originalFrom = edge.originalFrom === undefined && edge._from;
          edge.originalTo = edge.originalTo === undefined && edge._to;
          edge._from = `aggregated/${fromNodeValue}`;
          edge._to = `aggregated/${toNodeValue}`;
          /* eslint-enable no-param-reassign */
          /* eslint-enable no-underscore-dangle */

          return edge;
        });

        // Calculate nodes
        const aggregatedNodes = Array.from(
          group(state.network.nodes, (d) => d[varName]),
          ([key, value]) => ({
            _id: `aggregated/${key}`,
            _key: `${key}`,
            children: value.map((node) => JSON.parse(JSON.stringify(node))),
            type: 'supernode',
            neighbors: [] as string[],
          }),
        );

        // Calculate neighbors
        aggregatedEdges.forEach((edge) => {
          const fromNode = aggregatedNodes.find((node) => node._id === edge._from);
          const toNode = aggregatedNodes.find((node) => node._id === edge._to);

          if (fromNode === undefined || toNode === undefined) {
            return;
          }

          if (edge._to !== fromNode._id && fromNode.neighbors.indexOf(edge._to) === -1) {
            fromNode.neighbors.push(edge._to);
          }
          if (edge._from !== toNode._id && toNode.neighbors.indexOf(edge._from) === -1) {
            toNode.neighbors.push(edge._from);
          }
        });

        // Set network and aggregated
        commit.setAggregated(true);
        dispatch.updateNetwork({ network: { nodes: aggregatedNodes, edges: aggregatedEdges } });
      }
    },

    expandAggregatedNode(context, nodeID: string) {
      const { state, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        // Add children nodes into list at the correct index
        const indexOfParent = state.network && state.network.nodes.findIndex((node) => node._id === nodeID);
        const parentChildren = state.network.nodes[indexOfParent].children || [];
        const expandedNodes = [...state.network.nodes];
        expandedNodes.splice(indexOfParent + 1, 0, ...parentChildren);

        // Add children edges
        const expandedEdges = state.network.edges
          .map((edge) => {
            const newEdge = { ...edge };
            let modified = false;

            if (newEdge._from === nodeID) {
              newEdge._from = `${newEdge.originalFrom}`;
              modified = true;
            }

            if (edge._to === nodeID) {
              newEdge._to = `${newEdge.originalTo}`;
              modified = true;
            }

            return modified ? newEdge : null;
          })
          .filter((edge): edge is Edge => edge !== null);

        dispatch.updateNetwork({ network: { nodes: expandedNodes, edges: [...expandedEdges, ...state.network.edges] } });
      }
    },

    retractAggregatedNode(context, nodeID: string) {
      const { state, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        // Remove children nodes
        const parentNode = state.network.nodes.find((node) => node._id === nodeID);
        const parentChildren = parentNode && parentNode.children;
        const retractedNodes = state.network.nodes.filter((node) => parentChildren && parentChildren.indexOf(node) === -1);

        // Remove children edges
        const retractedEdges = state.network.edges
          .map((edge) => {
            const parentChildrenIDs = parentChildren && parentChildren.map((node) => node._id);

            if (parentChildrenIDs && (parentChildrenIDs.indexOf(edge._from) !== -1 || parentChildrenIDs.indexOf(edge._to) !== -1)) {
              return null;
            }

            return edge;
          })
          .filter((edge): edge is Edge => edge !== null);

        dispatch.updateNetwork({ network: { nodes: retractedNodes, edges: retractedEdges } });
      }
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
