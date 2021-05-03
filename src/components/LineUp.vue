<script lang="ts">
import store from '@/store';
import {
  computed, nextTick, Ref, ref, watchEffect,
} from '@vue/composition-api';
import LineUp, { DataBuilder } from 'lineupjs';

export default {
  name: 'LineUp',

  setup() {
    const network = computed(() => store.state.network);
    const selectedNodes = computed(() => store.state.selectedNodes);

    const lineup: Ref<LineUp | null> = ref(null);
    const builder: Ref<DataBuilder | null> = ref(null);

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

    // We have to use nextTick so that the component is rendered
    nextTick(() => {
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
          const differentIDs = diffFunction<string>(clickedIDs, selectedNodes.value)
            .concat(diffFunction(selectedNodes.value, clickedIDs));

          // Click on the elements that are different to add/remove them from the store
          differentIDs.forEach((nodeID) => store.commit.clickElement(nodeID));
        });
      }
    });

    // Update selection from matrix
    watchEffect(() => {
      // Convert the ids to indices
      const indices = idsToIndices(selectedNodes.value);

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

        console.log(lineupOrder, lineup.value.data.getFirstRanking());

        if (JSON.stringify(currentLineupSortOrder) !== JSON.stringify(lineupOrder)) {
          // If lineup order has changed, update the store
          store.commit.setSortOrder(lineupOrder);
          currentLineupSortOrder = lineupOrder;
        } else if (JSON.stringify(currentLineupSortOrder) !== JSON.stringify(storeOrder)) {
          // If store order has changed, update lineup
        }
      }
    });

    return {};
  },
};
</script>

<template>
  <div id="lineup" />
</template>

<style>
#lineup {
  z-index: 10;
  height: 1000px;
}

.le-th {
  margin-bottom: 0 !important;
}

.le-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>
