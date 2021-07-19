<template>
  <div>
    <v-card>
      <v-card-title>
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

    return {
      search,
      headers,
      tableData,
    };
  },
};
</script>
