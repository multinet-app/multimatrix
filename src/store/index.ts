import {
  group, range, scaleLinear,
} from 'd3';
import { defineStore, storeToRefs } from 'pinia';
import api from '@/api';
import oauthClient from '@/oauth';
import {
  ColumnTypes, NetworkSpec, Table, UserSpec,
} from 'multinet';
import {
  ArangoAttributes, ArangoPath, Edge, LoadError, Network, Node, SlicedNetwork,
} from '@/types';
import { calculateNodeDegrees, defineNeighbors } from '@/lib/utils';
import { isInternalField } from '@/lib/typeUtils';
import { computed, ref } from 'vue';
import { useProvenanceStore } from './provenance';

export const useStore = defineStore('store', () => {
  // Provenance
  const provStore = useProvenanceStore();
  const { provenance } = provStore;
  const {
    selectNeighbors,
    cellSize,
    selectedNodes,
    selectedCell,
    aggregatedBy,
    labelVariable,
    expandedNodeIDs,
    degreeRange,
    sliceIndex,
  } = storeToRefs(provStore);

  const workspaceName = ref('');
  const networkName = ref('');
  const loadError = ref<LoadError>({
    message: '',
    href: '',
  });
  const userInfo = ref<UserSpec | null>(null);
  const hoveredNodes = ref<string[]>([]);
  const directionalEdges = ref(false);
  const showGridLines = ref(true);
  const maxConnections = ref({
    unAggr: 0,
    parent: 0,
  });
  const showProvenanceVis = ref(false);
  const nodeAttributes = ref<ArangoAttributes>({});
  const edgeAttributes = ref<ArangoAttributes>({});
  const showIntNodeVis = ref(false);
  const connectivityMatrixPaths = ref<{nodes: Node[]; paths: ArangoPath[]}>({ nodes: [], paths: [] });
  const selectedConnectivityPaths = ref<ArangoPath[]>([]);
  const showPathTable = ref(false);
  const maxIntConnections = ref(0);
  const sortOrder = ref<number[]>([]);
  const intAggregatedBy = ref(undefined);
  const networkTables = ref<Table[]>([]);
  const columnTypes = ref<{ [tableName: string]: ColumnTypes } | null>(null);
  const rightClickMenu = ref({
    show: false,
    top: 0,
    left: 0,
  });
  const slicedNetwork = ref<SlicedNetwork[]>([]);
  const isDate = ref(false);
  const controlsWidth = ref(256);
  const selectedHops = ref(1);
  const nodeDegreeDict = ref<{ [key: string]: number }>({});
  const maxDegree = ref(0);
  const networkPreFilter = ref<Network>({ nodes: [], edges: [] });
  const lineupIsNested = ref(false);

  const networkOnLoad = ref<Network>({ nodes: [], edges: [] });
  const aggregated = computed(() => aggregatedBy.value !== null);
  const degreeRangeOnLoad = computed<[number, number]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, maxDegreeLocal] = calculateNodeDegrees(networkOnLoad.value, directionalEdges.value);
    return [0, maxDegreeLocal];
  });
  const degreeFiltered = computed(() => !(degreeRange.value[0] === degreeRangeOnLoad.value[0] && degreeRange.value[1] === degreeRangeOnLoad.value[1]));

  const network = computed(() => {
    const networkAfterOperations = structuredClone(networkOnLoad.value);

    if (networkAfterOperations.nodes.length === 0) {
      return networkAfterOperations;
    }

    if (slicedNetwork.value.length > 0) {
      return slicedNetwork.value[sliceIndex.value].network;
    }

    // If we're aggregating, compute the aggregated network
    if (aggregated.value) {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      // Calculate all aggregated edge permutations
      const newEdges: Edge[] = [];
      networkAfterOperations.edges.forEach((edge) => {
        const fromNode = networkAfterOperations.nodes.find((node) => node._id === edge._from);
        const toNode = networkAfterOperations.nodes.find((node) => node._id === edge._to);

        // Add all super node to child node permutations
        if (fromNode !== undefined) {
          const newEdge = structuredClone(edge);
          const fromNodeValue = fromNode[aggregatedBy.value!];
          newEdge.originalFrom = newEdge.originalFrom === undefined ? newEdge._from : newEdge.originalFrom;
          newEdge._from = `aggregated/${fromNodeValue}`;
          newEdges.push(newEdge);
        }

        if (toNode !== undefined) {
          const newEdge = structuredClone(edge);
          const toNodeValue = toNode[aggregatedBy.value!];
          newEdge.originalTo = newEdge.originalTo === undefined ? newEdge._to : newEdge.originalTo;
          newEdge._to = `aggregated/${toNodeValue}`;
          newEdges.push(newEdge);
        }

        if (fromNode !== undefined && toNode !== undefined) {
          const newEdge = structuredClone(edge);
          const fromNodeValue = fromNode[aggregatedBy.value!];
          const toNodeValue = toNode[aggregatedBy.value!];
          newEdge.originalFrom = newEdge.originalFrom === undefined ? newEdge._from : newEdge.originalFrom;
          newEdge.originalTo = newEdge.originalTo === undefined ? newEdge._to : newEdge.originalTo;
          newEdge._from = `aggregated/${fromNodeValue}`;
          newEdge._to = `aggregated/${toNodeValue}`;
          newEdges.push(newEdge);
        }
      });
      networkAfterOperations.edges = [...networkAfterOperations.edges, ...newEdges];

      // Calculate aggregated nodes
      networkAfterOperations.nodes = Array.from(
        group(networkAfterOperations.nodes, (d) => d[aggregatedBy.value!]),
        ([key, value]) => ({
          _id: `aggregated/${key}`,
          _key: `${key}`,
          _rev: '', // _rev property is needed to conform to Node interface
          children: value.map((node) => structuredClone(node)),
          _type: 'supernode',
          neighbors: [] as string[],
          degreeCount: 0,
          [aggregatedBy.value!]: key,
        }),
      );
      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      // If we have expanded nodes, add their children in the right spot
      expandedNodeIDs.value.forEach((nodeID) => {
        const indexOfParent = networkAfterOperations.nodes.findIndex((node) => node._id === nodeID);
        let parentChildren = networkAfterOperations.nodes[indexOfParent].children;
        if (parentChildren === undefined) {
          return;
        }

        parentChildren = parentChildren.map((child: Node) => {
          child.parentPosition = indexOfParent;
          return child;
        });
        networkAfterOperations.nodes.splice(indexOfParent + 1, 0, ...parentChildren);
      });
    }

    // Recalculate node degrees and max degree based on the computed network
    [nodeDegreeDict.value, maxDegree.value] = calculateNodeDegrees(networkAfterOperations, directionalEdges.value);

    // If we're filtering by degree, filter nodes out
    if (degreeFiltered.value) {
      // Create new network to reflect degree filtering
      const nodeSet = new Set<string>();

      // Remove edges that don't match degree criteria + store other edges in filtered edges
      const filteredEdges: Edge[] = [];
      networkAfterOperations.edges = networkAfterOperations.edges.filter((edge: Edge) => {
      // Create set of nodes that match criteria
        if (nodeDegreeDict.value[edge._from] >= degreeRange.value[0] && nodeDegreeDict.value[edge._from] <= degreeRange.value[1] && nodeDegreeDict.value[edge._to] >= degreeRange.value[0] && nodeDegreeDict.value[edge._to] <= degreeRange.value[1]) {
          nodeSet.add(edge._from);
          nodeSet.add(edge._to);
          return true;
        }
        filteredEdges.push(edge);
        return false;
      });
      const allNodes = networkAfterOperations.nodes.map((node: Node) => node._id);
      // List of nodes in filtered out set
      const filteredSet = new Set(allNodes.filter((id: string) => !Array.from(nodeSet).includes(id)));

      // Construct filtered supernode
      const filteredNode: Node = {
        _type: 'supernode',
        neighbors: [],
        degreeCount: 0,
        _key: 'filtered',
        _id: 'filtered',
        _rev: '',
        children: [],
        Label: 'filtered',
      };
      // Add the filtered children to filtered supernode
      filteredNode.children = networkAfterOperations.nodes.filter((node: Node) => filteredSet.has(node._id));

      // Remove nodes that don't meet filter criteria
      networkAfterOperations.nodes = networkAfterOperations.nodes.filter((node: Node) => nodeSet.has(node._id));
      // Add filtered supernode
      networkAfterOperations.nodes.push(filteredNode);
      // Add edges to filtered nodes
      filteredEdges.forEach((edge: Edge) => {
        edge.originalFrom = edge._from;
        edge.originalTo = edge._to;
        edge._from = nodeSet.has(edge._from) ? edge._from : 'filtered';
        edge._to = nodeSet.has(edge._to) ? edge._to : 'filtered';
        networkAfterOperations.edges.push(edge);
      });
    }

    // Reset sort order now that network has changed
    sortOrder.value = range(0, networkAfterOperations.nodes.length);

    // Recalculate neighbors
    defineNeighbors(networkAfterOperations.nodes, networkAfterOperations.edges);
    return networkAfterOperations;
  });

  const cellColorScale = computed(() => (scaleLinear<string, number>()
    .domain([0, maxConnections.value.unAggr])
    .range(['#feebe2', '#690000']) // TODO: colors here are arbitrary, change later
  ));

  const parentColorScale = computed(() => (scaleLinear<string, number>()
    .domain([0, maxConnections.value.parent])
    .range(['#dcedfa', '#0066cc'])
  ));

  const intTableColorScale = computed(() => (scaleLinear<string, number>()
    .domain([0, maxIntConnections.value])
    .range(['white', 'blue'])
  ));

  const nodeTableNames = computed(() => networkTables.value.filter((table) => !table.edge).map((table) => table.name));

  const edgeTableName = computed(() => {
    const edgeTable = networkTables.value.find((table) => table.edge);

    return edgeTable !== undefined ? edgeTable.name : undefined;
  });

  const nodeVariableItems = computed(() => {
    // Get the name of all columns from the columnTypes
    let nodeColumnNames: string[] = nodeTableNames.value.map((nodeTableName: string) => (columnTypes.value !== null ? Object.keys(columnTypes.value[nodeTableName]) : [])).flat();

    // Make the column names unique, no duplicates
    nodeColumnNames = [...new Set(nodeColumnNames)];

    // Filter the internal fields from the column names
    nodeColumnNames = nodeColumnNames.filter((varName) => !isInternalField(varName));

    return nodeColumnNames;
  });

  const edgeVariableItems = computed(() => {
    if (edgeTableName.value !== undefined && columnTypes.value !== null) {
      return Object.keys(columnTypes.value[edgeTableName.value]).filter((varName) => !isInternalField(varName));
    }
    return [];
  });

  function setAttributeValues(networkLocal: Network) {
    const allNodeKeys: Set<string> = new Set();
    networkLocal.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allNodeKeys.add(key)));
    const nodeKeys = [...allNodeKeys];
    nodeAttributes.value = nodeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
    nodeKeys.forEach((key: string) => {
      nodeAttributes.value[key] = [...new Set(networkLocal.nodes.map((n: Node) => `${n[key]}`).sort())];
    });

    const allEdgeKeys: Set<string> = new Set();
    networkLocal.edges.forEach((edge: Edge) => Object.keys(edge).forEach((key) => allEdgeKeys.add(key)));
    const edgeKeys = [...allEdgeKeys];
    edgeAttributes.value = edgeKeys.reduce((ac, a) => ({ ...ac, [a]: [] }), {});
    edgeKeys.forEach((key: string) => {
      edgeAttributes.value[key] = [...new Set(networkLocal.edges.map((e: Edge) => `${e[key]}`).sort())];
    });
  }

  async function fetchNetwork(workspaceNameLocal: string, networkNameLocal: string) {
    workspaceName.value = workspaceNameLocal;
    networkName.value = networkNameLocal;

    let networkLocal: NetworkSpec | undefined;

    // Get all table names
    try {
      networkLocal = await api.network(workspaceName.value, networkName.value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.status === 404) {
        if (workspaceName.value === undefined || networkName.value === undefined) {
          loadError.value = {
            message: 'Workspace and/or network were not defined in the url',
            href: 'https://multinet.app',
          };
        } else {
          loadError.value = {
            message: error.statusText,
            href: 'https://multinet.app',
          };
        }
      } else if (error.status === 401) {
        loadError.value = {
          message: 'You are not authorized to view this workspace',
          href: 'https://multinet.app',
        };
      } else {
        loadError.value = {
          message: 'An unexpected error ocurred',
          href: 'https://multinet.app',
        };
      }
    } finally {
      if (loadError.value.message === '' && typeof networkLocal === 'undefined') {
        // Catches CORS errors, issues when DB/API are down, etc.
        loadError.value = {
          message: 'There was a network issue when getting data',
          href: `./?workspace=${workspaceName.value}&network=${networkName.value}`,
        };
      }
    }

    if (networkLocal === undefined) {
      return;
    }

    // Check network size
    if (networkLocal.node_count > 300) {
      loadError.value = {
        message: 'The network you are loading is too large',
        href: 'https://multinet.app',
      };
    }

    networkTables.value = await api.networkTables(workspaceName.value, networkName.value);
    const metadataPromises: Promise<ColumnTypes>[] = [];
    networkTables.value.forEach((table) => {
      metadataPromises.push(api.columnTypes(workspaceName.value, table.name));
    });

    // Resolve network metadata promises
    const resolvedMetadataPromises = await Promise.all(metadataPromises);

    // Combine all network metadata
    let columnTypesLocal: { [tableName: string]: ColumnTypes } = {};
    resolvedMetadataPromises.forEach((types, i) => {
      columnTypesLocal = { ...columnTypesLocal, [networkTables.value[i].name]: types };
    });

    columnTypes.value = columnTypesLocal;

    if (loadError.value.message !== '') {
      return;
    }

    // Generate all node table promises
    const nodeRows = await api.nodes(workspaceName.value, networkName.value, { offset: 0, limit: 300 });

    // Generate and resolve edge table promise and extract rows
    const edges = await api.edges(workspaceName.value, networkName.value, { offset: 0, limit: 1000 });

    const nodes = defineNeighbors(nodeRows.results, edges.results as Edge[]);

    // Build the network object and set it as the network in the store
    const networkElements = {
      nodes: nodes as Node[],
      edges: edges.results as Edge[],
    };
    setAttributeValues(networkElements);
    degreeRange.value = [0, calculateNodeDegrees(networkElements, directionalEdges.value)[1]];
    networkOnLoad.value = networkElements;
  }

  function setDegreeNetwork(degreeRangeLocal: [number, number]) {
    degreeRange.value = degreeRangeLocal;
  }

  async function fetchUserInfo() {
    const info = await api.userInfo();
    userInfo.value = info;
  }

  async function logout() {
    // Perform the server logout.
    oauthClient.logout();
    userInfo.value = null;
  }

  function setSelectedConnectivityPaths(payload: number[]) {
    selectedConnectivityPaths.value = payload.map((path: number) => connectivityMatrixPaths.value.paths[path]);
  }

  function aggregateNetwork(varName: string | null) {
    aggregatedBy.value = varName;

    // Reset network if aggregated
    if (varName === null) {
      expandedNodeIDs.value = [];
    }
  }

  function expandAggregatedNode(nodeID: string) {
    expandedNodeIDs.value.push(nodeID);
  }

  function retractAggregatedNode(nodeID: string) {
    expandedNodeIDs.value = expandedNodeIDs.value.filter((expandedID) => expandedID !== nodeID);
  }

  function clickElement(elementID: string) {
    if (!selectedNodes.value.includes(elementID)) {
      selectedNodes.value.push(elementID);
    } else {
      selectedNodes.value = selectedNodes.value.filter((nodeID) => nodeID !== elementID);
    }
  }

  function clearSelection() {
    selectedNodes.value = [];
    if (selectedCell.value !== null) {
      selectedCell.value = null;
    }
  }

  return {
    workspaceName,
    networkName,
    network,
    loadError,
    userInfo,
    cellSize,
    selectedNodes,
    selectedCell,
    hoveredNodes,
    sortOrder,
    directionalEdges,
    selectNeighbors,
    showGridLines,
    aggregated,
    aggregatedBy,
    maxConnections,
    showProvenanceVis,
    nodeAttributes,
    edgeAttributes,
    showIntNodeVis,
    connectivityMatrixPaths,
    selectedConnectivityPaths,
    showPathTable,
    maxIntConnections,
    intAggregatedBy,
    networkTables,
    columnTypes,
    labelVariable,
    rightClickMenu,
    networkOnLoad,
    slicedNetwork,
    isDate,
    controlsWidth,
    selectedHops,
    nodeDegreeDict,
    maxDegree,
    networkPreFilter,
    lineupIsNested,
    cellColorScale,
    parentColorScale,
    intTableColorScale,
    nodeVariableItems,
    edgeVariableItems,
    nodeTableNames,
    edgeTableName,
    fetchNetwork,
    setDegreeNetwork,
    fetchUserInfo,
    logout,
    setSelectedConnectivityPaths,
    aggregateNetwork,
    expandAggregatedNode,
    retractAggregatedNode,
    clickElement,
    clearSelection,
    setAttributeValues,
    provenance,
    degreeFiltered,
    degreeRange,
    sliceIndex,
  };
});
