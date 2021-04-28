<script lang="ts">
import store from '@/store';
import {
  computed, nextTick, Ref, ref, watchEffect,
} from '@vue/composition-api';
import LineUp, { DataBuilder } from 'lineupjs';

export default {
  name: 'LineUp',

  setup() {
    const network = computed(() => store.getters.network);
    const selectedElements = computed(() => store.getters.selectedElements);

    const lineup: Ref<LineUp | null> = ref(null);
    const builder: Ref<DataBuilder | null> = ref(null);

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
          const clickedIDs: string[] = dataindices.map((index: number) => {
            if (builder.value !== null) {
              return builder.value.buildData().data[index]._id.toString();
            }
            return undefined;
          });

          // Find the symmetric difference between the ids here and those in the store
          function diffFunction<T>(arr1: Array<T>, arr2: Array<T>): Array<T> { return arr1.filter((x) => arr2.indexOf(x) === -1); }
          const differentIDs = diffFunction<string>(clickedIDs, [...selectedElements.value])
            .concat(diffFunction([...selectedElements.value], clickedIDs));

          // Click on the elements that are different to add/remove them from the store
          differentIDs.forEach((nodeID) => store.commit.clickElement(nodeID));
        });
      }
    });

    watchEffect(() => {
      // Convert the ids to indices
      const indices = selectedElements.value
        .map((elementID) => (builder.value !== null
          ? builder.value.buildData().data.findIndex((dataElement) => dataElement._id === elementID)
          : -1))
        .filter((index) => index !== -1);

      if (lineup.value !== null) {
        lineup.value.setSelection(indices);
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
