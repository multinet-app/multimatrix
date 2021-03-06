<script lang="ts">
import store from '@/store';
import {
  computed, defineComponent, onMounted, Ref, ref, SetupContext, watch, watchEffect,
} from '@vue/composition-api';
import LineUp, { DataBuilder } from 'lineupjs';
import { select } from 'd3-selection';

export default defineComponent({
  name: 'LineUp',

  setup(props: unknown, context: SetupContext) {
    const network = computed(() => store.state.network);
    const selectedNodes = computed(() => store.state.selectedNodes);
    const hoveredNodes = computed(() => store.state.hoveredNodes);

    const lineup: Ref<LineUp | null> = ref(null);
    const builder: Ref<DataBuilder | null> = ref(null);

    const lineupWidth = computed(() => {
      const controlsElement = select<Element, Element>('.app-sidebar').node();
      const matrixElement = select<Element, Element>('#matrix').node();
      const intermediaryElement = select<Element, Element>('#intNodeDiv').node();

      if (controlsElement !== null && matrixElement !== null) {
        let availableSpace = context.root.$vuetify.breakpoint.width - controlsElement.clientWidth - matrixElement.clientWidth - 12; // 12 from the svg container padding
        if (intermediaryElement !== null) {
          availableSpace -= intermediaryElement.clientWidth;
        }
        return availableSpace < 330 ? 330 : availableSpace;
      }

      return 330;
    });

    // Helper functions
    function idsToIndices(ids: string[]) {
      return ids
        .map((elementID) => (builder.value !== null
          ? builder.value.buildData().data.findIndex((dataElement) => dataElement._id === elementID)
          : -1))
        .filter((index) => index !== -1);
    }

    function indicesToIDs(indicies: number[]) {
      return indicies.map((index: number) => {
        if (builder.value !== null) {
          return builder.value.buildData().data[index]._id.toString();
        }
        return undefined;
      });
    }

    function removeLineup() {
      const lineupDiv = document.getElementById('lineup');

      if (lineupDiv !== null) {
        lineupDiv.innerHTML = '';
      }

      lineup.value = null;
      builder.value = null;
    }

    function buildLineup() {
      const lineupDiv = document.getElementById('lineup');

      if (network.value !== null && lineupDiv !== null) {
        const columns = [...new Set(network.value.nodes.map((node) => Object.keys(node)).flat())];

        builder.value = new DataBuilder(network.value.nodes);

        // Config adjustments
        builder.value.rowHeight(store.state.cellSize - 2, 2);

        // Make the vis
        lineup.value = builder.value.deriveColumns(columns).deriveColors().defaultRanking().build(lineupDiv);

        // Add an event watcher to update selected nodes
        lineup.value.on('selectionChanged', (dataindices: number[]) => {
          // Transform data indices to multinet `_id`s
          const clickedIDs: string[] = indicesToIDs(dataindices);

          // Find the symmetric difference between the ids here and those in the store
          function diffFunction<T>(arr1: Array<T>, arr2: Array<T>): Array<T> { return arr1.filter((x) => arr2.indexOf(x) === -1); }
          let differentIDs = diffFunction<string>(clickedIDs, selectedNodes.value)
            .concat(diffFunction(selectedNodes.value, clickedIDs));

          // Filter out only the hovered nodes
          differentIDs = differentIDs.filter((ID) => hoveredNodes.value.indexOf(ID) === -1);

          // Click on the elements that are different to add/remove them from the store
          differentIDs.forEach((nodeID) => store.commit.clickElement(nodeID));
        });

        let lastHovered = '';

        // Add an event watcher to update highlighted nodes
        lineup.value.on('highlightChanged', (dataindex: number) => {
          if (dataindex === -1) {
            return;
          }

          // Transform data indices to multinet `_id`s
          const hoveredIDs: string[] = indicesToIDs([dataindex]);

          // Hover the elements that are different to add/remove them from the store
          hoveredIDs.forEach((nodeID) => store.commit.pushHoveredNode(nodeID));

          // Remove previously hovered node and track what is now hovered
          store.commit.removeHoveredNode(lastHovered);
          [lastHovered] = hoveredIDs;
        });
      }
    }

    onMounted(() => {
      buildLineup();
    });

    // Update selection/hover from matrix
    watchEffect(() => {
      // Convert the ids to indices
      const indices = [...new Set(idsToIndices([...selectedNodes.value, ...hoveredNodes.value]))];

      if (lineup.value !== null) {
        lineup.value.setSelection(indices);
      }
    });

    let currentLineupSortOrder: number[] = [];

    // Update sort order in matrix
    watchEffect(() => {
      if (lineup.value !== null) {
        const lineupOrder = [...lineup.value.data.getFirstRanking().getOrder()];
        const storeOrder = store.state.sortOrder;

        if (JSON.stringify(currentLineupSortOrder) !== JSON.stringify(lineupOrder)) {
          // If lineup order has changed, update the store
          store.commit.setSortOrder(lineupOrder);
          currentLineupSortOrder = lineupOrder;
        } else if (JSON.stringify(currentLineupSortOrder) !== JSON.stringify(storeOrder)) {
          // If store order has changed, update lineup
          // lineup.value.data.getFirstRanking().order = storeOrder;
          currentLineupSortOrder = storeOrder;
        }
      }
    });

    watch(network, () => {
      removeLineup();
      buildLineup();
    });

    function removeHighlight() {
      store.commit.clearHoveredNodes();
    }

    return {
      lineupWidth,
      removeHighlight,
    };
  },
});
</script>

<template>
  <div
    id="lineup"
    :style="`width: ${lineupWidth}px;`"
    @mouseleave="removeHighlight"
  />
</template>

<style>
#lineup {
  z-index: 1;
  height: 10000px; /* big enough to show all rows */
}

.le-td {
  overflow-x: unset !important;
}

.le-th {
  margin-bottom: 0 !important;
}

.le-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>
