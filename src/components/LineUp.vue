<script lang="ts">
import store from '@/store';
import {
  computed, nextTick, Ref, ref, watchEffect,
} from '@vue/composition-api';
import LineUp, { DataBuilder } from 'lineupjs';

export default {
  name: 'Alert',

  setup() {
    const network = computed(() => store.getters.network);

    const lineup: Ref<LineUp | null> = ref(null);

    // We have to use nextTick so that the component is rendered
    nextTick(() => {
      const lineupDiv = document.getElementById('lineup');

      if (network.value !== null && lineupDiv !== null) {
        const columns = [...new Set(network.value.nodes.map((node) => Object.keys(node)).flat())];

        const builder = new DataBuilder(network.value.nodes);

        // Config adjustments
        builder.rowHeight(store.state.cellSize - 2, 2);

        // Make the vis
        lineup.value = builder.deriveColumns(columns).deriveColors().defaultRanking().build(lineupDiv);
      }
    });

    watchEffect(() => {
      console.log(lineup.value?.getSelection());
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
