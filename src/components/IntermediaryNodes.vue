<script lang="ts">
import {
  computed, onMounted, SetupContext, watch,
} from '@vue/composition-api';
import { select } from 'd3-selection';
import store from '@/store';

export default {
  name: 'IntermediaryNodes',

  setup(props: unknown, context: SetupContext) {
    const network = computed(() => store.state.network);
    // const selectedNodes = computed(() => store.state.selectedNodes);
    // const hoveredNodes = computed(() => store.state.hoveredNodes);

    const intNodeWidth = computed(() => {
      const controlsElement = select<Element, Element>('.app-sidebar').node();
      const matrixElement = select<Element, Element>('#matrix').node();

      if (controlsElement !== null && matrixElement !== null) {
        const availableSpace = context.root.$vuetify.breakpoint.width - controlsElement.clientWidth - matrixElement.clientWidth - 12; // 12 from the svg container padding
        return availableSpace < 330 ? 330 : availableSpace;
      }

      return 330;
    });

    function removeIntView() {
      const intNodeDiv = document.getElementById('intNodeDiv');
      const matrix = [];

      if (intNodeDiv !== null) {
        intNodeDiv.innerHTML = '';
      }

      // lineup.value = null;
      // builder.value = null;
    }

    function buildIntView() {
      const intNodeDiv = document.getElementById('intNodeDiv');

      if (network.value !== null && intNodeDiv !== null) {
        // Create matrix from the paths
        console.log('Hello!');
      }
    }

    onMounted(() => {
      buildIntView();
    });

    watch(network, () => {
      removeIntView();
      buildIntView();
    });

    return {
      intNodeWidth,
    };
  },
};
</script>

<template>
  <div
    id="intNodeDiv"
    :style="`width: ${intNodeWidth}px;`"
  />
</template>
