import { group, range } from 'd3-array';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { defineStore } from 'pinia';
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

export const useStore = defineStore('store', {
  state: (): State => ({
    workspaceName: '',
    networkName: '',
    network: { nodes: [], edges: [] },
    loadError: {
      message: '',
      href: '',
    },
    userInfo: null,
    cellSize: 15,
    selectedNodes: [],
    selectedCell: null,
    hoveredNodes: [],
    sortOrder: [],
    directionalEdges: false,
    selectNeighbors: true,
    showGridLines: true,
    aggregated: false,
    aggregatedBy: null,
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
  }),

  getters: {
    cellColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxConnections.unAggr])
        .range(['#feebe2', '#690000']); // TODO: colors here are arbitrary, change later
    },

    parentColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxConnections.parent])
        .range(['#dcedfa', '#0066cc']);
    },

    intTableColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxIntConnections])
        .range(['white', 'blue']);
    },

    nodeVariableItems(): string[] {
      // Get the name of all columns from the columnTypes
      let nodeColumnNames: string[] = this.nodeTableNames.map((nodeTableName: string) => (this.columnTypes !== null ? Object.keys(this.columnTypes[nodeTableName]) : [])).flat();

      // Make the column names unique, no duplicates
      nodeColumnNames = [...new Set(nodeColumnNames)];

      // Filter the internal fields from the column names
      nodeColumnNames = nodeColumnNames.filter((varName) => !isInternalField(varName));

      return nodeColumnNames;
    },

    edgeVariableItems(): string[] {
      if (this.edgeTableName !== undefined && this.columnTypes !== null) {
        return Object.keys(this.columnTypes[this.edgeTableName]).filter((varName) => !isInternalField(varName));
      }
      return [];
    },

    nodeTableNames(): string[] {
      return this.networkTables.filter((table) => !table.edge).map((table) => table.name);
    },

    edgeTableName(): string | undefined {
      const edgeTable = this.networkTables.find((table) => table.edge);

      return edgeTable !== undefined ? edgeTable.name : undefined;
    },
  },

  actions: {
    async fetchNetwork(workspaceNameLocal: string, networkNameLocal: string) {
      this.workspaceName = workspaceNameLocal;
      this.networkName = networkNameLocal;

      let network: NetworkSpec | undefined;

      // Get all table names
      try {
        network = await api.network(this.workspaceName, this.networkName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.status === 404) {
          if (this.workspaceName === undefined || this.networkName === undefined) {
            this.loadError = {
              message: 'Workspace and/or network were not defined in the url',
              href: 'https://multinet.app',
            };
          } else {
            this.loadError = {
              message: error.statusText,
              href: 'https://multinet.app',
            };
          }
        } else if (error.status === 401) {
          this.loadError = {
            message: 'You are not authorized to view this workspace',
            href: 'https://multinet.app',
          };
        } else {
          this.loadError = {
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          };
        }
      } finally {
        if (this.loadError.message === '' && typeof network === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          this.loadError = {
            message: 'There was a network issue when getting data',
            href: `./?workspace=${this.workspaceName}&network=${this.networkName}`,
          };
        }
      }

      if (network === undefined) {
        return;
      }

      // Check network size
      if (network.node_count > 300) {
        this.loadError = {
          message: 'The network you are loading is too large',
          href: 'https://multinet.app',
        };
      }

      const networkTables = await api.networkTables(this.workspaceName, this.networkName);
      this.networkTables = networkTables;
      const metadataPromises: Promise<ColumnTypes>[] = [];
      networkTables.forEach((table) => {
        metadataPromises.push(api.columnTypes(this.workspaceName, table.name));
      });

      // Resolve network metadata promises
      const resolvedMetadataPromises = await Promise.all(metadataPromises);

      // Combine all network metadata
      let columnTypes: { [tableName: string]: ColumnTypes } = {};
      resolvedMetadataPromises.forEach((types, i) => {
        columnTypes = { ...columnTypes, [networkTables[i].name]: types };
      });

      this.columnTypes = columnTypes;

      if (this.loadError.message !== '') {
        return;
      }

      // Generate all node table promises
      const nodeRows = await api.nodes(this.workspaceName, this.networkName, { offset: 0, limit: 300 });

      // Generate and resolve edge table promise and extract rows
      const edges = await api.edges(this.workspaceName, this.networkName, { offset: 0, limit: 1000 });

      const nodes = defineNeighbors(nodeRows.results, edges.results as Edge[]);

      // Build the network object and set it as the network in the store
      const networkElements = {
        nodes: nodes as Node[],
        edges: edges.results as Edge[],
      };
      this.setAttributeValues(networkElements);
      this.networkOnLoad = networkElements;
      this.updateNetwork(networkElements);
      const degreeObject = setNodeDegreeDict(this.networkPreFilter, this.networkOnLoad, this.queriedNetwork, this.directionalEdges);
      this.maxDegree = degreeObject.maxDegree;
      this.nodeDegreeDict = degreeObject.nodeDegreeDict;
    },

    setDegreeNetwork(degreeRange: number[]) {
      // Determine correct network to use
      let baseNetwork: Network = { nodes: [], edges: [] };
      if (this.networkPreFilter !== null || this.networkOnLoad !== null) {
        baseNetwork = this.connectivityMatrixPaths.paths.length > 0 ? structuredClone(this.networkPreFilter as Network) : structuredClone(this.networkOnLoad as Network);
      }
      // Restore network if min and max are restored
      if (this.networkOnLoad !== null && degreeRange[0] === 0 && degreeRange[1] === this.maxDegree) {
        this.filteredNetwork = false;
        this.updateNetwork(baseNetwork);
      } else
      // Create new network to reflect degree filtering
      if (this.networkOnLoad !== null) {
        const nodeSet: Set<string> = new Set([]);

        // Remove edges that don't match degree criteria + store other edges in filtered edges
        const filteredEdges: Edge[] = [];
        baseNetwork.edges = baseNetwork.edges.filter((edge: Edge) => {
          // Create set of nodes that match criteria
          if (this.nodeDegreeDict[edge._from] >= degreeRange[0] && this.nodeDegreeDict[edge._from] <= degreeRange[1] && this.nodeDegreeDict[edge._to] >= degreeRange[0] && this.nodeDegreeDict[edge._to] <= degreeRange[1]) {
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
        this.filteredNetwork = true;
        this.updateNetwork(baseNetwork);
      }
    },

    updateNetwork(network: Network) {
      this.network = network;
      this.sortOrder = range(0, this.network.nodes.length);
      this.slicedNetwork = [];
      defineNeighbors(this.network.nodes, this.network.edges);
    },

    async fetchUserInfo() {
      const info = await api.userInfo();
      this.userInfo = info;
    },

    async logout() {
      // Perform the server logout.
      oauthClient.logout();
      this.userInfo = null;
    },

    createProvenance() {
      //   const storeState = this.$state;

      //   const stateForProv = JSON.parse(JSON.stringify(this.$state));
      //   stateForProv.selectedNodes = new Set<string>();

      //   this.provenance = initProvenance<State, ProvenanceEventTypes, unknown>(
      //     stateForProv,
      //     { loadFromUrl: false },
      //   );

      //   // Add a global observer to watch the state and update the tracked elements in the store
      //   // enables undo/redo + navigating around provenance graph
      //   storeState.provenance.addGlobalObserver(
      //     () => {
      //       const provenanceState = this.provenance.state;

      //       const { selectedNodes, selectedCell } = provenanceState;

      //       // Update selectedCell
      //       storeState.selectedCell = selectedCell;
      //       storeState.selectedNodes = selectedNodes;

      //       // Iterate through vars with primitive data types
      //       [
      //         'selectNeighbors',
      //         'showGridLines',
      //         'directionalEdges',
      //         'enableAggregation',
      //       ].forEach((primitiveVariable) => {
      //         if (storeState[primitiveVariable] !== provenanceState[primitiveVariable]) {
      //           storeState[primitiveVariable] = provenanceState[primitiveVariable];
      //         }
      //       });
      //     },
      //   );

      //   this.provenance.done();

      //   // Add keydown listener for undo/redo
      //   document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, storeState));
    },

    goToProvenanceNode(node: string) {
      if (this.provenance !== null) {
        this.provenance.goToNode(node);
      }
    },

    setSelectedConnectivityPaths(payload: number[]) {
      this.selectedConnectivityPaths = payload.map((path: number) => this.connectivityMatrixPaths.paths[path]);
    },

    aggregateNetwork(varName: string | null) {
      this.aggregatedBy = varName;

      // Reset network if aggregated
      if (this.aggregated && varName === null) {
        const unAggregatedNetwork = this.networkOnLoad !== null ? structuredClone(this.networkOnLoad) : { nodes: [], edges: [] };
        this.aggregated = false;
        this.networkPreFilter = unAggregatedNetwork;
        this.updateNetwork(unAggregatedNetwork);
      }

      // Aggregate the network if the varName is not none
      if (varName !== null) {
        // Calculate edges
        const newEdges: Edge[] = [];
        this.network.edges.forEach((edge) => {
          const fromNode = this.network && this.network.nodes.find((node) => node._id === edge._from);
          const toNode = this.network && this.network.nodes.find((node) => node._id === edge._to);

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
        const aggregatedEdges = [...this.network.edges, ...newEdges];

        // Calculate nodes
        const aggregatedNodes: Node[] = Array.from(
          group(this.network.nodes, (d) => d[varName]),
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
        this.aggregated = true;
        this.networkPreFilter = { nodes: aggregatedNodes, edges: aggregatedEdges };
        this.updateNetwork({ nodes: aggregatedNodes, edges: aggregatedEdges });
      }
    },

    expandAggregatedNode(nodeID: string) {
      // Add children nodes into list at the correct index
      const indexOfParent = this.network && this.network.nodes.findIndex((node) => node._id === nodeID);
      let parentChildren = this.network.nodes[indexOfParent].children;
      if (parentChildren === undefined) {
        return;
      }

      parentChildren = parentChildren.map((child: Node) => {
        child.parentPosition = indexOfParent;
        return child;
      }) || [];
      const expandedNodes = [...this.network.nodes];
      expandedNodes.splice(indexOfParent + 1, 0, ...parentChildren);

      this.updateNetwork({ nodes: expandedNodes, edges: this.network.edges });
      const degreeObject = setNodeDegreeDict(this.networkPreFilter, this.networkOnLoad, this.queriedNetwork, this.directionalEdges);
      this.maxDegree = degreeObject.maxDegree;
      this.nodeDegreeDict = degreeObject.nodeDegreeDict;
    },

    retractAggregatedNode(nodeID: string) {
      // Remove children nodes
      const parentNode = this.network.nodes.find((node) => node._id === nodeID);
      const parentChildren = parentNode && parentNode.children;
      const retractedNodes = this.network.nodes.filter((node) => parentChildren && parentChildren.indexOf(node) === -1);

      this.updateNetwork({ nodes: retractedNodes, edges: this.network.edges });
      const degreeObject = setNodeDegreeDict(this.networkPreFilter, this.networkOnLoad, this.queriedNetwork, this.directionalEdges);
      this.maxDegree = degreeObject.maxDegree;
      this.nodeDegreeDict = degreeObject.nodeDegreeDict;
    },

    clickElement(elementID: string) {
      if (!this.selectedNodes.includes(elementID)) {
        this.selectedNodes.push(elementID);
      } else {
        this.selectedNodes = this.selectedNodes.filter((nodeID) => nodeID !== elementID);
      }
    },

    clearSelection() {
      this.selectedNodes = [];
      if (this.selectedCell !== null) {
        this.selectedCell = null;
      }
    },

    setAttributeValues(network: Network) {
      const allNodeKeys: Set<string> = new Set();
      network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allNodeKeys.add(key)));
      const nodeKeys = [...allNodeKeys];
      this.nodeAttributes = nodeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
      nodeKeys.forEach((key: string) => {
        this.nodeAttributes[key] = [...new Set(network.nodes.map((n: Node) => `${n[key]}`).sort())];
      });

      const allEdgeKeys: Set<string> = new Set();
      network.edges.forEach((edge: Edge) => Object.keys(edge).forEach((key) => allEdgeKeys.add(key)));
      const edgeKeys = [...allEdgeKeys];
      this.edgeAttributes = edgeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
      edgeKeys.forEach((key: string) => {
        this.edgeAttributes[key] = [...new Set(network.edges.map((e: Edge) => `${e[key]}`).sort())];
      });
    },
  },
});
