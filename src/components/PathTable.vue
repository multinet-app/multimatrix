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
      <v-card-title
        class="pt-0 mt-0"
      >
        <v-row>
          <v-col
            cols="4"
          >
            Path Table
          </v-col>
          <v-col
            cols="8"
          >
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="tableData"
        :search="search"
      >
        <template
          v-slot:top
        >
          <v-list dense>
            <v-list-item dense>
              <v-row>
                <v-col
                  v-for="(header, i) in headers"
                  :key="i"
                  class="py-0"
                  :cols="`${Math.ceil(12 % (headers.length - 1))}`"
                >
                  <v-select
                    v-model="selectedHeader[i]"
                    :items="i % 2 ? headerEdgeSelections : headerNodeSelections"
                    :label="`${headers[i].text} Attribute`"
                    dense
                  />
                </v-col>
              </v-row>
            </v-list-item>
          </v-list>
        </template>
      </v-data-table>
      <v-row>
        <v-col
          cols="8"
        />
        <v-col
          cols="4"
        >
          <v-btn
            block
            class="ml-0 mt-4"
            color="primary"
            depressed
            @click="exportPaths"
          >
            Export Paths
          </v-btn>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script lang="ts">
import {
  computed, ref, Ref, defineComponent,
} from '@vue/composition-api';
import store from '@/store';
import { isInternalField } from '@/lib/typeUtils';

export default defineComponent({
  name: 'PathTable',

  setup() {
    const search = ref('');
    const pathLength = computed(() => store.state.selectedConnectivityPaths[0].vertices.length);

    const headerNodeSelections = computed(() => store.getters.nodeVariableItems);
    const headerEdgeSelections = computed(() => store.getters.edgeVariableItems);
    const selectedHeader: Ref<string[]> = ref([]);

    Array(pathLength.value + 2).fill(1).forEach(() => {
      selectedHeader.value.push('_key');
    });

    const headers = computed(() => {
      const toReturn: any[] = [];
      let index = 0;
      [...Array(pathLength.value).keys()].forEach((i) => {
        if (i < pathLength.value - 1) {
          toReturn.push({ text: `Node ${i + 1}`, value: `${index}` });
          index += 1;
          toReturn.push({ text: `Edge ${i + 1}`, value: `${index}` });
          index += 1;
        } else {
          toReturn.push({ text: `Node ${i + 1}`, value: `${index}` });
        }
      });
      return toReturn;
    });
    const tableData = computed(() => {
      const toReturn: any[] = [];
      store.state.selectedConnectivityPaths.forEach((path) => {
        const tablePath: { [key: string]: any } = {};
        let index = 0;
        [...Array(pathLength.value).keys()].forEach((i) => {
          if (i < pathLength.value - 1) {
            tablePath[`${index}`] = path.vertices[i][selectedHeader.value[index]];
            index += 1;
            tablePath[`${index}`] = path.edges[i][selectedHeader.value[index]];
            index += 1;
          } else {
            tablePath[`${index}`] = path.vertices[i][selectedHeader.value[index]];
          }
        });
        toReturn.push(tablePath);
      });
      return toReturn;
    });

    const top = ref(0);
    const left = ref(store.state.network !== null ? store.state.cellSize * store.state.network.nodes.length + 200 : 0);
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

    function exportPaths() {
      if (tableData.value === null) {
        return;
      }
      const colHeader: string[] = headers.value.map((header) => header.text);

      const a = document.createElement('a');
      // In case there is an empty value
      const replacer = (key, value) => (value === null ? '' : value);

      let csvData = tableData.value.map((row) => colHeader.map((_, i) => JSON.stringify(row[i], replacer)));

      // Add column header selections
      csvData.unshift(selectedHeader.value.join(','));
      // Add column headers
      csvData.unshift(colHeader.join(','));

      csvData = csvData.join('\r\n');
      a.href = URL.createObjectURL(
        new Blob([csvData], {
          type: 'text/csv',
        }),
      );
      a.download = `${store.state.networkName}-paths.csv`;
      a.click();
    }

    return {
      search,
      headers,
      headerNodeSelections,
      headerEdgeSelections,
      selectedHeader,
      tableData,
      divStyle,
      iconMouseDown,
      closeCard,
      exportPaths,
    };
  },
});
</script>
