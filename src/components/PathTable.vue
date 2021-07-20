<template>
  <div :style="divStyle">
    <v-card>
      <v-row>
        <v-col class="pl-6">
          <v-icon @mousedown="iconMouseDown">
            mdi-drag-variant
          </v-icon>
        </v-col>
        <v-spacer />
        <v-col class="text-right pr-6">
          <v-icon @click="closeCard">
            mdi-close
          </v-icon>
        </v-col>
      </v-row>
      <v-card-title class="pt-0 mt-0">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
        />
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="tableData"
        :search="search"
      />
    </v-card>
  </div>
</template>

<script lang="ts">
import { computed, ref } from '@vue/composition-api';
import store from '@/store';

export default {
  name: 'PathTable',

  setup() {
    const search = ref('');
    const pathLength = computed(() => store.state.selectedConnectivityPaths[0].vertices.length);
    const headers = computed(() => {
      const toReturn: any[] = [];
      [...Array(pathLength.value).keys()].forEach((i) => {
        if (i < pathLength.value - 1) {
          toReturn.push({ text: `Node ${i + 1}`, value: `Node${i + 1}` });
          toReturn.push({ text: `Edge ${i + 1}`, value: `Edge${i + 1}` });
        } else {
          toReturn.push({ text: `Node ${i + 1}`, value: `Node${i + 1}` });
        }
      });
      return toReturn;
    });
    const tableData = computed(() => {
      const toReturn: any[] = [];
      store.state.selectedConnectivityPaths.forEach((path) => {
        const tablePath: { [key: string]: string } = {};
        [...Array(pathLength.value).keys()].forEach((i) => {
          if (i < pathLength.value - 1) {
            tablePath[`Node${i + 1}`] = path.vertices[i]._key;
            tablePath[`Edge${i + 1}`] = path.edges[i]._key;
          } else {
            tablePath[`Node${i + 1}`] = path.vertices[i]._key;
          }
        });
        toReturn.push(tablePath);
      });
      return toReturn;
    });

    const top = ref(0);
    const left = ref(0);
    const divStyle = computed(() => `position: absolute; top: ${top.value}px; left: ${left.value}px; z-index: 1;`);
    function iconDrag(event: MouseEvent) {
      // 24 to account for icon size and padding
      top.value = event.clientY - 24;
      left.value = event.clientX - 256 - 24;
    }
    function iconMouseUp() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
    function iconMouseDown(event: MouseEvent) {
      // 24 to account for icon size and padding
      top.value = event.clientY - 24;
      left.value = event.clientX - 256 - 24;
      document.onmousemove = iconDrag;
      document.onmouseup = iconMouseUp;
    }

    function closeCard() {
      store.commit.setShowPathTable(false);
    }

    return {
      search,
      headers,
      tableData,
      divStyle,
      iconMouseDown,
      closeCard,
    };
  },
};
</script>
