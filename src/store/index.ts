import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';

import { group, range } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { initProvenance, Provenance } from '@visdesignlab/trrack';

import api from '@/api';
import oauthClient from '@/oauth';
import {
  ColumnTypes, NetworkSpec, Table, UserSpec,
} from 'multinet';
import {
  ArangoAttributes,
  ArangoPath,
  Edge, LoadError, Network, Node, ProvenanceEventTypes, State, SlicedNetwork,
} from '@/types';
import { defineNeighbors, setNodeDegreeDict } from '@/lib/utils';
import { undoRedoKeyHandler, updateProvenanceState } from '@/lib/provenanceUtils';
import { isInternalField } from '@/lib/typeUtils';

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
    selectedNodes: new Set(),
    selectedCell: null,
    hoveredNodes: [],
    sortOrder: [],
    directionalEdges: false,
    selectNeighbors: true,
    showGridLines: true,
    aggregated: false,
    aggregatedBy: undefined,
    visualizedNodeAttributes: [],
    visualizedEdgeAttributes: [],
    maxConnections: {
      unAggr: 0,
      parent: 0,
    },
    provenance: null,
    showProvenanceVis: false,
    nodeAttributes: {},
    edgeAttributes: {},
    showIntNodeVis: false,
    connectivityMatrixPaths: { nodes: [], paths: [] },
    selectedConnectivityPaths: [],
    showPathTable: false,
    maxIntConnections: 0,
    intAggregatedBy: undefined,
    networkTables: [],
    columnTypes: null,
    labelVariable: undefined,
    rightClickMenu: {
      show: false,
      top: 0,
      left: 0,
    },
    networkOnLoad: null,
    slicedNetwork: [],
    isDate: false,
    controlsWidth: 256,
    selectedHops: 1,
    nodeDegreeDict: {},
    maxDegree: 0,
    networkPreFilter: null,
    queriedNetwork: false,
    filteredNetwork: false,
    lineupIsNested: false,
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

    intTableColorScale(state): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, state.maxIntConnections])
        .range(['white', 'blue']);
    },

    nodeVariableItems(state, getters): string[] {
      // Get the name of all columns from the columnTypes
      let nodeColumnNames: string[] = getters.nodeTableNames.map((nodeTableName: string) => (state.columnTypes !== null ? Object.keys(state.columnTypes[nodeTableName]) : [])).flat();

      // Make the column names unique, no duplicates
      nodeColumnNames = [...new Set(nodeColumnNames)];

      // Filter the internal fields from the column names
      nodeColumnNames = nodeColumnNames.filter((varName) => !isInternalField(varName));

      return nodeColumnNames;
    },

    edgeVariableItems(state, getters): string[] {
      if (getters.edgeTableName !== undefined && state.columnTypes !== null) {
        return Object.keys(state.columnTypes[getters.edgeTableName]).filter((varName) => !isInternalField(varName));
      }
      return [];
    },

    nodeTableNames(state) {
      return state.networkTables.filter((table) => !table.edge).map((table) => table.name);
    },

    edgeTableName(state) {
      const edgeTables = state.networkTables.filter((table) => table.edge);

      return edgeTables.length > 0 ? edgeTables[0].name : undefined;
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
      if (!state.aggregated && !state.filteredNetwork) {
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

    addSelectedNode(state, nodesToAdd: string[]) {
      // If no nodes, do nothing
      if (nodesToAdd.length === 0) {
        return;
      }

      state.selectedNodes = new Set([...state.selectedNodes, ...nodesToAdd]);

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Select Node(s)');
      }
    },

    removeSelectedNode(state, nodeID: string) {
      state.selectedNodes.delete(nodeID);
      state.selectedNodes = new Set(state.selectedNodes);

      if (state.provenance !== null) {
        updateProvenanceState(state, 'De-select Node(s)');
      }
    },

    clickCell(state, cellName: string) {
      if (state.selectedCell !== null && state.selectedCell === cellName) {
        state.selectedCell = null;
        updateProvenanceState(state, 'De-Select Cell');
      } else {
        state.selectedCell = cellName;
        updateProvenanceState(state, 'Select Cell');
      }
    },

    setSortOrder(state, sortOrder: number[]) {
      state.sortOrder = sortOrder;
    },

    pushHoveredNode(state, nodeID: string) {
      if (state.hoveredNodes.indexOf(nodeID) === -1) {
        state.hoveredNodes = [...state.hoveredNodes, nodeID];
      }
    },

    removeHoveredNode(state, nodeID: string) {
      state.hoveredNodes = state.hoveredNodes.filter((hoveredNode) => hoveredNode !== nodeID);
    },

    clearHoveredNodes(state) {
      state.hoveredNodes = [];
    },

    setDirectionalEdges(state, directionalEdges: boolean) {
      state.directionalEdges = directionalEdges;
      const degreeObject = setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.connectivityMatrixPaths.paths.length > 0, store.state.directionalEdges);
      state.maxDegree = degreeObject.maxDegree;
      state.nodeDegreeDict = degreeObject.nodeDegreeDict;
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

    setAggregated(state, aggregated: boolean) {
      state.aggregated = aggregated;
      const degreeObject = setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.connectivityMatrixPaths.paths.length > 0, store.state.directionalEdges);
      state.maxDegree = degreeObject.maxDegree;
      state.nodeDegreeDict = degreeObject.nodeDegreeDict;
    },

    setAggregatedBy(state, varName: string | undefined) {
      state.aggregatedBy = varName;
    },

    setQueriedNetworkState(state, queried: boolean) {
      state.queriedNetwork = queried;
    },

    setMaxConnections(state, maxConnections: {
      unAggr: number;
      parent: number;
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

    toggleShowIntNodeVis(state, showIntNodeVis: boolean) {
      state.showIntNodeVis = showIntNodeVis;
    },

    setConnectivityMatrixPaths(state, payload: { nodes: Node[]; paths: ArangoPath[]}) {
      state.connectivityMatrixPaths = payload;
    },

    setSelectedConnectivityPaths(state, payload: number[]) {
      state.selectedConnectivityPaths = payload.map((path: number) => state.connectivityMatrixPaths.paths[path]);
    },

    setSelectedHops(state, selectedHops: number) {
      state.selectedHops = selectedHops;
    },

    setShowPathTable(state, showPathTable: boolean) {
      state.showPathTable = showPathTable;
    },

    setCellSize(state, cellSize: number) {
      state.cellSize = cellSize;
    },

    setMaxIntConnections(state, maxIntConnections) {
      state.maxIntConnections = maxIntConnections;
    },

    setIntAggregatedBy(state, intAggregatedBy: string | undefined) {
      state.intAggregatedBy = intAggregatedBy;
    },

    setNetworkTables(state, networkTables: Table[]) {
      state.networkTables = networkTables;
    },

    setColumnTypes(state, columnTypes: { [tableName: string]: ColumnTypes }) {
      state.columnTypes = columnTypes;
    },

    setLabelVariable(state, labelVariable: string | undefined) {
      state.labelVariable = labelVariable;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Label Variable');
      }
    },

    updateRightClickMenu(state, payload: { show: boolean; top: number; left: number }) {
      state.rightClickMenu = payload;
    },

    setIsDate(state, isDate: boolean) {
      state.isDate = isDate;
    },

    setSlicedNetwork(state, slicedNetwork: SlicedNetwork[]) {
      state.slicedNetwork = slicedNetwork;
    },

    setNetworkOnLoad(state, network: Network) {
      state.networkOnLoad = structuredClone(network);
    },

    setSelected(state, selectedNodes: Set<string>) {
      state.selectedNodes = selectedNodes;

      if (state.provenance !== null) {
        if (selectedNodes.size === 0) {
          updateProvenanceState(state, 'Clear Selection');
        }
      }
    },

    setNetworkPreFilter(state, networkPostQuery: Network) {
      state.networkPreFilter = networkPostQuery;
    },

    setFilteredNetwork(state, filteredNetwork: boolean) {
      state.filteredNetwork = filteredNetwork;
    },

    setDegreeEntries(state, degreeObject: { maxDegree: number; nodeDegreeDict: {[key: string]: number}}) {
      state.maxDegree = degreeObject.maxDegree;
      state.nodeDegreeDict = degreeObject.nodeDegreeDict;
    },

    setDegreeNetwork(state, degreeRange: number[]) {
      // Determine correct network to use
      let baseNetwork: Network = { nodes: [], edges: [] };
      if (state.networkPreFilter !== null || state.networkOnLoad !== null) {
        baseNetwork = state.connectivityMatrixPaths.paths.length > 0 ? structuredClone(state.networkPreFilter as Network) : structuredClone(state.networkOnLoad as Network);
      }
      // Restore network if min and max are restored
      if (state.networkOnLoad !== null && degreeRange[0] === 0 && degreeRange[1] === state.maxDegree) {
        store.commit.setFilteredNetwork(false);
        store.dispatch.updateNetwork({ network: baseNetwork });
      } else
      // Create new network to reflect degree filtering
      if (state.networkOnLoad !== null) {
        const nodeSet: Set<string> = new Set([]);

        // Remove edges that don't match degree criteria + store other edges in filtered edges
        const filteredEdges: Edge[] = [];
        baseNetwork.edges = baseNetwork.edges.filter((edge: Edge) => {
          // Create set of nodes that match criteria
          if (state.nodeDegreeDict[edge._from] >= degreeRange[0] && state.nodeDegreeDict[edge._from] <= degreeRange[1] && state.nodeDegreeDict[edge._to] >= degreeRange[0] && state.nodeDegreeDict[edge._to] <= degreeRange[1]) {
            nodeSet.add(edge._from);
            nodeSet.add(edge._to);
            return true;
          }
          filteredEdges.push(edge);
          return false;
        });
        const allNodes = baseNetwork.nodes.map((node: Node) => node._id);
        // List of nodes in filtered out set
        const filteredSet = new Set(allNodes.filter((id: string) => !Array.from(nodeSet).includes(id)));

        // Construct filtered supernode
        const filteredNode: Node = {
          type: 'supernode',
          neighbors: [],
          degreeCount: 0,
          _key: 'filtered',
          _id: 'filtered',
          _rev: '',
          children: [],
          Label: 'filtered',
        };
        // Add the filtered children to filtered supernode
        filteredNode.children = baseNetwork.nodes.filter((node: Node) => filteredSet.has(node._id));

        // Remove nodes that don't meet filter criteria
        baseNetwork.nodes = baseNetwork.nodes.filter((node: Node) => nodeSet.has(node._id));
        // Add filtered supernode
        baseNetwork.nodes.push(filteredNode);
        // Add edges to filtered nodes
        filteredEdges.forEach((edge: Edge) => {
          edge.originalFrom = edge._from;
          edge.originalTo = edge._to;
          edge._from = nodeSet.has(edge._from) ? edge._from : 'filtered';
          edge._to = nodeSet.has(edge._to) ? edge._to : 'filtered';
          if (baseNetwork !== null) {
            baseNetwork.edges.push(edge);
          }
        });
        store.commit.setFilteredNetwork(true);
        store.dispatch.updateNetwork({ network: baseNetwork });
      }
    },

    setLineUpIsNested(state, lineupIsNested) {
      state.lineupIsNested = lineupIsNested;
    },
  },

  actions: {
    async fetchNetwork(context, { workspaceName, networkName }) {
      const { commit, dispatch } = rootActionContext(context);
      commit.setWorkspaceName(workspaceName);
      commit.setNetworkName(networkName);

      let network: NetworkSpec | undefined;

      // Get all table names
      try {
        network = await api.network(workspaceName, networkName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
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
        if (store.state.loadError.message === '' && typeof network === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&network=${networkName}`,
          });
        }
      }

      if (network === undefined) {
        return;
      }

      // Check network size
      if (network.node_count > 300) {
        commit.setLoadError({
          message: 'The network you are loading is too large',
          href: 'https://multinet.app',
        });
      }

      const networkTables = await api.networkTables(workspaceName, networkName);
      commit.setNetworkTables(networkTables);
      const metadataPromises: Promise<ColumnTypes>[] = [];
      networkTables.forEach((table) => {
        metadataPromises.push(api.columnTypes(workspaceName, table.name));
      });

      // Resolve network metadata promises
      const resolvedMetadataPromises = await Promise.all(metadataPromises);

      // Combine all network metadata
      let columnTypes: { [tableName: string]: ColumnTypes } = {};
      resolvedMetadataPromises.forEach((types, i) => {
        columnTypes = { ...columnTypes, [networkTables[i].name]: types };
      });

      commit.setColumnTypes(columnTypes);

      if (store.state.loadError.message !== '') {
        return;
      }

      // Generate all node table promises
      const nodeRows = await api.nodes(workspaceName, networkName, { offset: 0, limit: 300 });

      // Generate and resolve edge table promise and extract rows
      const edges = await api.edges(workspaceName, networkName, { offset: 0, limit: 1000 });

      const nodes = defineNeighbors(nodeRows.results, edges.results as Edge[]);

      // Build the network object and set it as the network in the store
      const networkElements = {
        nodes: nodes as Node[],
        edges: edges.results as Edge[],
      };
      commit.setAttributeValues(networkElements);
      commit.setNetworkOnLoad(networkElements);
      dispatch.updateNetwork({ network: networkElements });
      commit.setDegreeEntries(setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.queriedNetwork, store.state.directionalEdges));
    },

    updateNetwork(context, payload: { network: Network }) {
      const { commit } = rootActionContext(context);
      commit.setNetwork(payload.network);
      commit.setSortOrder(range(0, payload.network.nodes.length));
      commit.setSlicedNetwork([]);
      defineNeighbors(payload.network.nodes, payload.network.edges);
    },

    async fetchUserInfo(context) {
      const { commit } = rootActionContext(context);

      const info = await api.userInfo();
      commit.setUserInfo(info);
    },

    async logout(context) {
      const { commit } = rootActionContext(context);

      // Perform the server logout.
      oauthClient.logout();
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

          const { selectedNodes, selectedCell } = provenanceState;

          // Update selectedCell
          storeState.selectedCell = selectedCell;
          storeState.selectedNodes = selectedNodes;

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

    aggregateNetwork(context, varName: string | undefined) {
      const { state, commit, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        store.commit.setAggregatedBy(varName);

        // Reset network if aggregated
        if (state.aggregated && varName === undefined) {
          const unAggregatedNetwork = state.networkOnLoad !== null ? structuredClone(state.networkOnLoad) : { nodes: [], edges: [] };
          store.commit.setAggregated(false);
          store.commit.setNetworkPreFilter(unAggregatedNetwork);
          dispatch.updateNetwork({ network: unAggregatedNetwork });
        }

        // Aggregate the network if the varName is not none
        if (varName !== undefined) {
          // Calculate edges
          const newEdges: Edge[] = [];
          state.network.edges.forEach((edge) => {
            const fromNode = state.network && state.network.nodes.find((node) => node._id === edge._from);
            const toNode = state.network && state.network.nodes.find((node) => node._id === edge._to);

            // Add all super node to child node permutations
            if (fromNode !== undefined && fromNode !== null) {
              const newEdge = structuredClone(edge);
              const fromNodeValue = fromNode[varName];
              newEdge.originalFrom = newEdge.originalFrom === undefined ? newEdge._from : newEdge.originalFrom;
              newEdge._from = `aggregated/${fromNodeValue}`;
              newEdges.push(newEdge);
            }

            if (toNode !== undefined && toNode !== null) {
              const newEdge = structuredClone(edge);
              const toNodeValue = toNode[varName];
              newEdge.originalTo = newEdge.originalTo === undefined ? newEdge._to : newEdge.originalTo;
              newEdge._to = `aggregated/${toNodeValue}`;
              newEdges.push(newEdge);
            }

            if (fromNode !== undefined && fromNode !== null && toNode !== undefined && toNode !== null) {
              const newEdge = structuredClone(edge);
              const fromNodeValue = fromNode[varName];
              const toNodeValue = toNode[varName];
              newEdge.originalFrom = newEdge.originalFrom === undefined ? newEdge._from : newEdge.originalFrom;
              newEdge.originalTo = newEdge.originalTo === undefined ? newEdge._to : newEdge.originalTo;
              newEdge._from = `aggregated/${fromNodeValue}`;
              newEdge._to = `aggregated/${toNodeValue}`;
              newEdges.push(newEdge);
            }
          });
          const aggregatedEdges = [...state.network.edges, ...newEdges];

          // Calculate nodes
          const aggregatedNodes: Node[] = Array.from(
            group(state.network.nodes, (d) => d[varName]),
            ([key, value]) => ({
              _id: `aggregated/${key}`,
              _key: `${key}`,
              _rev: '', // _rev property is needed to conform to Node interface
              children: value.map((node) => structuredClone(node)),
              type: 'supernode',
              neighbors: [] as string[],
              degreeCount: 0,
              [varName]: key,
            }),
          );

          // Set network and aggregated
          commit.setAggregated(true);
          store.commit.setNetworkPreFilter({ nodes: aggregatedNodes, edges: aggregatedEdges });
          dispatch.updateNetwork({ network: { nodes: aggregatedNodes, edges: aggregatedEdges } });
        }
      }
    },

    expandAggregatedNode(context, nodeID: string) {
      const { state, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        // Add children nodes into list at the correct index
        const indexOfParent = state.network && state.network.nodes.findIndex((node) => node._id === nodeID);
        let parentChildren = state.network.nodes[indexOfParent].children;
        if (parentChildren === undefined) {
          return;
        }

        parentChildren = parentChildren.map((child: Node) => {
          child.parentPosition = indexOfParent;
          return child;
        }) || [];
        const expandedNodes = [...state.network.nodes];
        expandedNodes.splice(indexOfParent + 1, 0, ...parentChildren);

        dispatch.updateNetwork({ network: { nodes: expandedNodes, edges: state.network.edges } });
        store.commit.setDegreeEntries(setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.queriedNetwork, store.state.directionalEdges));
      }
    },

    retractAggregatedNode(context, nodeID: string) {
      const { state, dispatch } = rootActionContext(context);

      if (state.network !== null) {
        // Remove children nodes
        const parentNode = state.network.nodes.find((node) => node._id === nodeID);
        const parentChildren = parentNode && parentNode.children;
        const retractedNodes = state.network.nodes.filter((node) => parentChildren && parentChildren.indexOf(node) === -1);

        dispatch.updateNetwork({ network: { nodes: retractedNodes, edges: state.network.edges } });
        store.commit.setDegreeEntries(setNodeDegreeDict(store.state.networkPreFilter, store.state.networkOnLoad, store.state.queriedNetwork, store.state.directionalEdges));
      }
    },

    clickElement(context, elementID: string) {
      const { state, commit } = rootActionContext(context);
      if (!state.selectedNodes.has(elementID)) {
        commit.addSelectedNode([elementID]);
      } else {
        commit.removeSelectedNode(elementID);
      }
    },

    clearSelection(context) {
      const { state, commit } = rootActionContext(context);

      commit.setSelected(new Set());
      if (state.selectedCell !== null) {
        commit.clickCell(state.selectedCell);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Store<S> {
    direct: ApplicationStore;
  }
}
