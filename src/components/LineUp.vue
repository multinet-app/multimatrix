<script lang="ts">
import store from '@/store';
import {
  computed, defineComponent, onMounted, Ref, ref, SetupContext, watch, watchEffect,
} from '@vue/composition-api';
import LineUp, { DataBuilder, LocalDataProvider } from 'lineupjs';
import { select } from 'd3-selection';
import { isInternalField } from '@/lib/typeUtils';

export default defineComponent({
  name: 'LineUp',

  setup(props: unknown, context: SetupContext) {
    const network = computed(() => store.state.network);
    const selectedNodes = computed(() => store.state.selectedNodes);
    const hoveredNodes = computed(() => store.state.hoveredNodes);
    const cellSize = computed(() => store.state.cellSize);

    const lineup: Ref<LineUp | null> = ref(null);
    const builder: Ref<DataBuilder | null> = ref(null);

    const lineupWidth = computed(() => {
      const controlsElement = select<Element, Element>('.app-sidebar').node();
      const matrixElement = select<Element, Element>('#matrix').node();
      const intermediaryElement = select<Element, Element>('#intNodeDiv').node();

      if (controlsElement !== null && matrixElement !== null && matrixElement.parentElement !== null) {
        let availableSpace = context.root.$vuetify.breakpoint.width - controlsElement.clientWidth - matrixElement.parentElement.clientWidth - 12; // 12 from the svg container padding
        if (intermediaryElement !== null) {
          availableSpace -= intermediaryElement.clientWidth;
        }
        return availableSpace < 330 ? 330 : availableSpace;
      }

      return 330;
    });

    const lineupHeight = computed(() => {
      const matrixElement = select<Element, Element>('#matrix').node();

      if (matrixElement !== null && matrixElement.parentElement !== null) {
        return matrixElement.parentElement.clientHeight + 24;
      }

      return 10000;
    });

    const sortOrder = computed(() => store.state.sortOrder);
    const lineupOrder = computed(() => {
      if (lineup.value === null || [...lineup.value.data.getFirstRanking().getOrder()].length === 0) {
        return [...Array(network.value?.nodes.length).keys()];
      }
      return [...lineup.value.data.getFirstRanking().getOrder()];
    });

    // If store order has changed, update lineup
    watch(sortOrder, (newSortOrder) => {
      if (lineup.value !== null) {
        const sortedData = newSortOrder.map((i) => (network.value !== null ? network.value.nodes[i] : {}));
        (lineup.value.data as LocalDataProvider).setData(sortedData);
      }
    });

    // If lineup order has changed, update matrix
    watch(lineupOrder, (newLineupOrder) => {
      // If sort order has less length than number of nodes, we've filtered sort those nodes to the top
      if (network.value !== null && newLineupOrder.length < network.value.nodes.length) {
        return;
      }

      if (lineup.value !== null && network.value !== null && JSON.stringify(newLineupOrder) !== JSON.stringify([...Array(network.value.nodes.length).keys()])) {
        const newSortOrder = newLineupOrder.map((i) => sortOrder.value[i]);
        store.commit.setSortOrder(newSortOrder);
      }
    });

    // Helper functions
    function idsToIndices(ids: string[]) {
      const sortedData = sortOrder.value.map((i) => (network.value !== null ? network.value.nodes[i] : null));

      return ids.map((nodeID) => sortedData.findIndex((node) => (node === null ? false : node._id === nodeID)));
    }

    // Update selection/hover from matrix
    watchEffect(() => {
      // Convert the ids to indices
      const indices = [...new Set(idsToIndices([...selectedNodes.value.values(), ...hoveredNodes.value]))];

      if (lineup.value !== null) {
        lineup.value.setSelection(indices);
      }
    });

    function indicesToIDs(indices: number[]) {
      if (network.value !== null) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return indices.map((index) => network.value!.nodes[sortOrder.value[index]]._id);
      }
      return [];
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
        const columns = [...new Set(network.value.nodes.map((node) => Object.keys(node)).flat())].filter((column) => !isInternalField(column));

        builder.value = new DataBuilder(network.value.nodes);

        // Config adjustments
        builder.value.dynamicHeight(() => ({
          defaultHeight: cellSize.value - 2,
          padding: () => 2,
          height: () => cellSize.value - 2,
        }));

        // Make the vis
        lineup.value = builder.value
          .deriveColumns(columns)
          .deriveColors()
          .defaultRanking()
          .sidePanel(true, true) // enable: true, collapsed: true
          .build(lineupDiv);

        // Add an event watcher to update selected nodes
        lineup.value.on('selectionChanged', (dataIndices: number[]) => {
          // Transform data indices to multinet `_id`s
          const clickedIDs: string[] = indicesToIDs(dataIndices);

          // Find the symmetric difference between the ids here and those in the store
          function diffFunction<T>(arr1: Array<T>, arr2: Array<T>): Array<T> { return arr1.filter((x) => arr2.indexOf(x) === -1); }
          let differentIDs = diffFunction<string>(clickedIDs, [...selectedNodes.value.values()])
            .concat(diffFunction([...selectedNodes.value.values()], clickedIDs));

          // Filter out only the hovered nodes
          differentIDs = differentIDs.filter((ID) => hoveredNodes.value.indexOf(ID) === -1);

          // Click on the elements that are different to add/remove them from the store
          differentIDs.forEach((nodeID) => store.dispatch.clickElement(nodeID));
        });

        let lastHovered = '';

        // Add an event watcher to update highlighted nodes
        lineup.value.on('highlightChanged', (dataIndex: number) => {
          if (dataIndex === -1) {
            return;
          }

          // Transform data indices to multinet `_id`s
          const hoveredIDs: string[] = indicesToIDs([dataIndex]);

          // Remove previously hovered node and track what is now hovered
          store.commit.removeHoveredNode(lastHovered);

          // Hover the elements that are different to add/remove them from the store
          hoveredIDs.forEach((nodeID) => store.commit.pushHoveredNode(nodeID));

          [lastHovered] = hoveredIDs;
        });
      }
    }

    onMounted(() => {
      buildLineup();

      // Select the node that will be observed for mutations
      const targetNode = document.getElementById('lineup') as Node;

      // Options for the observer (which mutations to observe)
      const config = { attributes: false, childList: true, subtree: true };

      // Callback function to execute when mutations are observed
      function callback(mutationList: MutationRecord[]) {
        mutationList.forEach((mutation) => {
          if ((mutation.target as Element).attributes.getNamedItem('data-type-cat')?.value === 'composite') {
            // If we found a 'composite' column being added/removed, we need to check if there are any `lu-nested` and set boolean in store
            // console.log(document.getElementsByClassName('lu-nested')[0], mutation);
          }
        });
      }

      // Create an observer instance linked to the callback function
      const observer = new MutationObserver(callback);

      // Start observing the target node for configured mutations
      observer.observe(targetNode, config);
    });

    watch(network, () => {
      removeLineup();
      buildLineup();
    });

    watch(cellSize, () => {
      if (lineup.value !== null) {
        lineup.value.update();
      }
    });

    function removeHighlight() {
      store.commit.clearHoveredNodes();
    }

    return {
      lineupWidth,
      lineupHeight,
      removeHighlight,
    };
  },
});
</script>

<template>
  <div
    id="lineup"
    :style="`width: ${lineupWidth}px; height: ${lineupHeight}px`"
    @mouseleave="removeHighlight"
  />
</template>

<style>
#lineup {
  z-index: 1;
  padding-top: 34px;
}

.le-th {
  margin-bottom: 0 !important;
}

.le-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>
