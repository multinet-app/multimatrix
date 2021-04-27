<script lang="ts">
import store from '@/store';
import {
  computed, nextTick,
} from '@vue/composition-api';
import { asLineUp } from 'lineupjs';

export default {
  name: 'Alert',

  setup() {
    const network = computed(() => store.getters.network);

    // We have to use nextTick so that the component is rendered
    nextTick(() => {
      const lineupDiv = document.getElementById('lineup');

      if (network.value !== null && lineupDiv !== null) {
        asLineUp(lineupDiv, network.value.nodes);
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
</style>
