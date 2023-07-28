<template>
  <v-expansion-panel>
    <v-expansion-panel-header color="grey darken-3" @click="dialog = true">
      Connectivity Query
      <template #actions>
        <v-icon>
          mdi-cog
        </v-icon>
      </template>
    </v-expansion-panel-header>

    <v-dialog
      v-model="dialog"
      width="780px"
    >
      <v-card>
        <v-card-text class="pt-2 pb-1">
          <v-select
            v-model="selectedHops"
            label="Hops"
            :items="hopsSelection"
          />
        </v-card-text>

        <v-card
          v-for="(inputs, i) in queryInput"
          :key="`input${i}`"
          flat
          color="white"
          class="p-0"
        >
          <v-divider v-if="i % 2" />
          <!-- All of the query options -->
          <v-list dense>
            <v-list-item
              v-for="(val, j) in inputs.value"
              :key="`val-${i}-${j}`"
              class="pa-0"
            >
              <v-list-item class="pa-0">
                <v-list-item-content class="pa-0 pr-1">
                  <v-row no-gutters>
                    <v-col
                      cols="1"
                      class="pa-1"
                    >
                      <v-autocomplete
                        v-if="j > 0"
                        v-model="inputs.operator"
                        :items="operatorOptionItems"
                        clearable
                        dense
                      />
                      <div
                        v-else
                        class="text-center pt-3"
                      >
                        <v-icon size="18">
                          {{ i % 2 ? 'mdi-swap-vertical' : `mdi-numeric-${(i + 2) / 2}-circle` }}
                        </v-icon>
                      </div>
                    </v-col>

                    <v-col class="pa-1">
                      <v-autocomplete
                        v-model="val.label"
                        :items="i % 2 ? edgeVariableItems : nodeVariableItems"
                        clearable
                        dense
                      />
                    </v-col>
                    <v-col class="pa-1">
                      <v-autocomplete
                        v-model="val.operator"
                        :items="queryOptionItems"
                        clearable
                        dense
                      />
                    </v-col>
                    <v-col
                      class="pa-1"
                    >
                      <v-autocomplete
                        v-if="val.operator === '==' || val.operator === '!='"
                        v-model="val.input"
                        :items="i % 2 ? edgeAttributes[val.label] : nodeAttributes[val.label]"
                        clearable
                        dense
                      />
                      <v-text-field
                        v-else
                        v-model="val.input"
                        dense
                      />
                    </v-col>
                    <v-col
                      cols="1"
                      class="mt-3"
                    >
                      <!-- Add button -->
                      <v-btn
                        icon
                        x-small
                        color="primary"
                        @click="addField(i)"
                      >
                        <v-icon>
                          mdi-plus
                        </v-icon>
                      </v-btn>
                      <!-- Remove button -->
                      <v-btn
                        :disabled="j === 0"
                        icon
                        x-small
                        color="red"
                        @click="removeField(i, j)"
                      >
                        <v-icon>
                          mdi-minus
                        </v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-list-item-content>
              </v-list-item>
            </v-list-item>
          </v-list>

          <!-- Let user query for another edge -->
          <v-list-item v-if="i === 1">
            <v-row>
              <v-col>
                <v-list-item-title>
                  {{ showSecondEdge ? 'NO OTHER PATH WITH' : '' }}
                </v-list-item-title>
              </v-col>
              <v-btn
                class="mb-2"
                depressed
                @click="showSecondEdge = !showSecondEdge"
              >
                {{ showSecondEdge ? 'Remove second edge query' : 'Add second edge query' }}
                <v-icon right>
                  {{ showSecondEdge ? 'mdi-minus' : 'mdi-plus' }}
                </v-icon>
              </v-btn>
            </v-row>
          </v-list-item>
          <v-expand-transition>
            <div v-show="showSecondEdge && i === 1">
              <v-list dense>
                <v-list-item
                  v-for="(val, k) in edgeMutexes.value"
                  :key="`val-${i}-2-${k}`"
                  class="pa-0"
                >
                  <v-list-item class="pa-0">
                    <v-list-item-content class="pa-0 pr-1">
                      <v-row no-gutters>
                        <v-col
                          cols="1"
                          class="pa-1"
                        >
                          <v-autocomplete
                            v-if="k > 0"
                            v-model="edgeMutexes.operator"
                            :items="operatorOptionItems"
                            clearable
                            dense
                          />
                          <div
                            v-else
                            class="text-center pt-3"
                          >
                            <v-icon size="18">
                              mdi-swap-vertical
                            </v-icon>
                          </div>
                        </v-col>
                        <v-col class="pa-1">
                          <v-autocomplete
                            v-model="val.label"
                            :items="edgeVariableItems"
                            clearable
                            dense
                          />
                        </v-col>
                        <v-col class="pa-1">
                          <v-autocomplete
                            v-model="val.operator"
                            :items="queryOptionItems"
                            clearable
                            dense
                          />
                        </v-col>
                        <v-col class="pa-1">
                          <v-autocomplete
                            v-if="val.operator === '==' || val.operator === '!='"
                            v-model="val.input"
                            :items="edgeAttributes[val.label]"
                            clearable
                            dense
                          />
                          <v-text-field
                            v-else
                            v-model="val.input"
                            dense
                          />
                        </v-col>
                        <v-col
                          cols="12"
                          sm="1"
                          class="mt-3"
                        >
                          <!-- Add button -->
                          <v-btn
                            icon
                            x-small
                            color="primary"
                            @click="addField(i, true)"
                          >
                            <v-icon>
                              mdi-plus
                            </v-icon>
                          </v-btn>
                          <!-- Remove button -->
                          <v-btn
                            :disabled="k === 0"
                            icon
                            x-small
                            color="red"
                            @click="removeField(i, k, true)"
                          >
                            <v-icon>
                              mdi-minus
                            </v-icon>
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-list-item-content>
                  </v-list-item>
                </v-list-item>
              </v-list>
            </div>
          </v-expand-transition>
          <v-divider v-if="i % 2" />
        </v-card>

        <v-list-item>
          <v-switch
            v-model="sameStartEnd"
            label="Allow same start and end node in path"
          />
        </v-list-item>

        <v-list-item>
          <v-btn
            block
            class="mb-2"
            color="primary"
            depressed
            :loading="loading"
            @click="() => { submitQuery(); dialog = false }"
          >
            Submit Query
          </v-btn>
        </v-list-item>
      </v-card>
    </v-dialog>
  </v-expansion-panel>
</template>

<script setup lang="ts">
import { useStore } from '@/store';
import {
  Node, Edge, Network, ArangoPath,
} from '@/types';
import {
  computed, onMounted, ref, watch,
} from 'vue';
import api from '@/api';
import { defineNeighbors, calculateNodeDegrees } from '@/lib/utils';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  selectedHops,
  nodeVariableItems,
  edgeVariableItems,
  nodeAttributes,
  edgeAttributes,
  directionalEdges,
  networkName,
  workspaceName,
  nodeTableNames,
  loadError,
  connectivityMatrixPaths,
  showIntNodeVis,
  networkOnLoad,
  degreeRange,
  aggregatedBy,
} = storeToRefs(store);

const showSecondEdge = ref(false);
const hopsSelection = [1, 2, 3];
const displayedHops = computed(() => 2 * selectedHops.value + 1);
const loading = ref(false);

const queryOptionItems = ['==', '=~', '!=', '<', '<=', '>', '>='];
const operatorOptionItems = ['AND', 'OR', 'NOT'];
const sameStartEnd = ref(false);

// Create the object for storing input data
const queryInput = ref<{ key: number; value: { label: string; operator: string; input: string }[]; operator: string }[]>([]);
const edgeMutexes = ref<{ value: { label: string; operator: string; input: string }[]; operator: string }>({ value: [], operator: '' });

function resetDefaultValues() {
  queryInput.value = [...Array(displayedHops.value).keys()].map((i: number) => {
    if (workspaceName.value === 'marclab') {
      if (i % 2) {
        return {
          key: i, value: [{ label: 'Type', operator: '=~', input: '' }], operator: '',
        };
      }
      return {
        key: i, value: [{ label: 'Label', operator: '=~', input: '' }], operator: '',
      };
    }
    return {
      key: i, value: [{ label: '', operator: '=~', input: '' }], operator: '',
    };
  });

  if (workspaceName.value === 'marclab') {
    edgeMutexes.value = {
      value: [{ label: 'Type', operator: '=~', input: '' }], operator: '',
    };
  } else {
    edgeMutexes.value = {
      value: [{ label: '', operator: '=~', input: '' }], operator: '',
    };
  }
}

watch([displayedHops], () => resetDefaultValues());

onMounted(() => resetDefaultValues());

function addField(index: number, edgeMutex = false) {
  if (edgeMutex) {
    edgeMutexes.value.value.push({ input: '', label: '', operator: '=~' });
  } else {
    queryInput.value[index].value.push({ input: '', label: '', operator: '=~' });
  }
}

function removeField(index: number, field: number, edgeMutex = false) {
  if (edgeMutex) {
    edgeMutexes.value.value.splice(field, 1);
  } else {
    queryInput.value[index].value.splice(field, 1);
  }
}

function isTextComparison(operator: string) {
  return ['==', '!=', '=~'].includes(operator);
}

function submitQuery() {
  loading.value = true;
  directionalEdges.value = true;
  const pathQueryTextComponents: string[] = [];

  // Loop through nodes and edges
  queryInput.value.forEach((input) => {
    // Add the starting string of each line of the query
    let currentString = '';
    const thisRoundIsNode = input.key % 2 === 0;
    const nodeOrEdgeNum = Math.floor(input.key / 2);

    if (input.key === 0) {
      currentString += `LET start_nodes = (FOR n0 in [\`${nodeTableNames.value}\`][**] FILTER 1==1 `;
    } else if (!thisRoundIsNode) {
      currentString += `FOR n${nodeOrEdgeNum + 1}, e${nodeOrEdgeNum + 1} IN 1..1 ANY n${nodeOrEdgeNum} GRAPH \`${networkName.value}\` FILTER 1==1 `;

      // If we have any node with nX where X is greater than 2, make sure we're not making 2 hop cycles
      const lastNode = nodeOrEdgeNum + 1 === selectedHops.value;
      if (nodeOrEdgeNum + 1 > 1 && (selectedHops.value !== 2 || !lastNode || !sameStartEnd.value)) {
        currentString += `AND n${nodeOrEdgeNum + 1} != n${nodeOrEdgeNum - 1} `;
      }

      // If we have any node with nX where X is greater than 3, make sure we're not making 3 hop cycles
      if (nodeOrEdgeNum + 1 > 2 && (selectedHops.value !== 3 || !lastNode || !sameStartEnd.value)) {
        currentString += `AND n${nodeOrEdgeNum + 1} != n${nodeOrEdgeNum - 2} `;
      }
    }

    // Loop through each query piece
    input.value.forEach((queryPiece, index) => {
      // Add the right operator (AND for edge then node else, whatever op is defined)
      const operator = input.operator === 'NOT' ? 'AND NOT (' : input.operator;

      if (index === 0) {
        currentString += 'AND ( ';
      } else {
        currentString += `${operator} `;
      }

      // If no filter, do nothing
      if (queryPiece.label === '') {
        currentString += '1==1 ';
      } else {
        let property = thisRoundIsNode ? `n${nodeOrEdgeNum}.\`${queryPiece.label}\`` : `e${nodeOrEdgeNum + 1}.\`${queryPiece.label}\``;
        property = isTextComparison(queryPiece.operator) ? `UPPER(${property})` : `TO_NUMBER(${property})`;
        const value = isTextComparison(queryPiece.operator) ? `UPPER('${queryPiece.input}')` : `TO_NUMBER(${queryPiece.input})`;
        currentString += `${property} ${queryPiece.operator} ${value} `;
      }

      if (index !== 0 && input.operator === 'NOT') {
        currentString += ')';
      }
    });
    currentString += ') ';

    // Add to the filter for edge mutex
    if (input.key === 1 && showSecondEdge.value) {
      currentString += 'AND (NOT POSITION(excluded_pairs, [n0, n1]))';
    }

    // Append any last required string
    if (input.key === 0) {
      // Add mutual exclusion query line
      if (showSecondEdge.value) {
        currentString += `RETURN n0) \nLET excluded_pairs = UNIQUE(FOR n0 in start_nodes FOR n1, e1, p1 IN 1..1 ANY n0 GRAPH \`${networkName.value}\` FILTER (`;

        // Add mutual exclusion filters
        const { operator } = edgeMutexes.value;
        edgeMutexes.value.value.forEach((queryPiece, index) => {
          if (index !== 0) {
            currentString += `${operator} `;
          }
          const property = isTextComparison(queryPiece.operator) ? `UPPER(e1.${queryPiece.label})` : `TO_NUMBER(e1.${queryPiece.label})`;

          const value = isTextComparison(queryPiece.operator) ? `UPPER('${queryPiece.input}')` : `TO_NUMBER(${queryPiece.input})`;

          currentString += `${property} ${queryPiece.operator} ${value} `;
        });

        // Add filter ending parenthesis
        currentString += ') ';

        currentString += 'RETURN p1.vertices) \nFOR n0 in start_nodes';
      } else {
        currentString += 'RETURN n0) \nFOR n0 in start_nodes';
      }
    }

    pathQueryTextComponents.push(currentString);
  });

  // Add return statement
  const itemsToReturn = Array(selectedHops.value).fill(0).map((_, index) => `e${index + 1}, n${index + 1}`).join(', ');
  pathQueryTextComponents.push(`RETURN [n0, ${itemsToReturn}]`);

  // Join each line of the query together
  const aqlQuery = pathQueryTextComponents.join('\n');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let newAQLNetwork: Promise<any[]> | undefined;
  try {
    newAQLNetwork = api.aql(workspaceName.value || '', { query: aqlQuery, bind_vars: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Add error message for user
    if (error.status === 400) {
      loadError.value = {
        message: error.statusText,
        href: 'https://multinet.app',
      };
    }
  }
  if (newAQLNetwork !== undefined) {
    newAQLNetwork.then((promise) => {
      if (promise.length !== 0) {
        // some data manipulation to show only start + end nodes
        const newNetwork: Network = { nodes: [], edges: [] };
        const endsNodesSet = new Set();
        const middleNodesSet = new Set();
        const middleNodesList: Node[] = [];
        const reconstructedPaths: ArangoPath[] = [];

        promise.forEach((path: (Node | Edge)[], val: number) => {
          const newPath: Edge = {
            _from: '', _to: '', _key: '', _id: '', _rev: '',
          };
          const reconstructedPath: ArangoPath = {
            vertices: [],
            edges: [],
          };

          path.forEach((nodeOrEdge, index) => {
            // Edges
            if (index % 2 !== 0) {
              reconstructedPath.edges.push(nodeOrEdge as Edge);
            }

            if (index % 2 === 0) {
              reconstructedPath.vertices.push(nodeOrEdge as Node);

              if (index === 0) {
                newPath._from = nodeOrEdge._id;
                if (!endsNodesSet.has(nodeOrEdge._id)) { newNetwork.nodes.push(nodeOrEdge as Node); }
                endsNodesSet.add(nodeOrEdge._id);
              } else if (index < path.length - 1) {
                if (!middleNodesSet.has(nodeOrEdge._id)) { middleNodesList.push(nodeOrEdge as Node); }
                middleNodesSet.add(nodeOrEdge._id);
              } else {
                newPath._to = nodeOrEdge._id;
                if (!endsNodesSet.has(nodeOrEdge._id)) { newNetwork.nodes.push(nodeOrEdge as Node); }
                endsNodesSet.add(nodeOrEdge._id);
              }
            }
          });

          // generate _key and _id
          newPath._key = val.toString();
          newPath._id = val.toString();
          newNetwork.edges.push(newPath);
          newNetwork.nodes = defineNeighbors(newNetwork.nodes, newNetwork.edges as Edge[]);

          reconstructedPaths.push(reconstructedPath);
        });

        // Update state for use in intermediate node vis TODO
        connectivityMatrixPaths.value = { nodes: middleNodesList, paths: reconstructedPaths };

        // Update state for showing intermediate node vis
        showIntNodeVis.value = selectedHops.value > 1;

        // Update state with new network
        aggregatedBy.value = null;
        networkOnLoad.value = newNetwork;
      } else {
        // Update state with empty network
        networkOnLoad.value = { nodes: [], edges: [] };
      }

      degreeRange.value = [0, calculateNodeDegrees(networkOnLoad.value, directionalEdges.value)[1]];
      loading.value = false;
    });
  }
}

const dialog = ref(false);
</script>
