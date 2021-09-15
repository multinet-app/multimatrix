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
                  v-for="(path, i) in (pathLength + 2)"
                  :key="i"
                  class="py-0"
                  :cols="`${Math.ceil(12 % (pathLength - 1))}`"
                >
                  <v-autocomplete
                    v-model="selectedHeader[i]"
                    :items="i % 2 ? headerEdgeSelections : headerNodeSelections"
                    :label="i % 2 ? `Edge ${(i+1)/2}: Attribute` : `Node ${(i+2)/2}: Attribute`"
                    dense
                    small-chips
                    multiple
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

export default defineComponent({
  name: 'PathTable',

  setup() {
    const search = ref('');
    const pathLength = computed(() => {
      // Removes extra edge in even paths
      if (store.state.selectedConnectivityPaths[0].vertices.length % 2 === 0) {
        return store.state.selectedConnectivityPaths[0].vertices.length - 1;
      }
      return store.state.selectedConnectivityPaths[0].vertices.length;
    });

    const headerNodeSelections = computed(() => store.getters.nodeVariableItems);
    const headerEdgeSelections = computed(() => store.getters.edgeVariableItems);
    const selectedHeader: Ref<string[][]> = ref([]);

    Array(pathLength.value + 2).fill(1).forEach(() => {
      selectedHeader.value.push(['_key']);
    });

    const headers = computed(() => {
      const toReturn: { [key: string]: string }[] = [];
      let index = 0;

      selectedHeader.value.forEach((_, i) => {
        if (i % 2) {
          selectedHeader.value[i].forEach((header: string) => {
            toReturn.push({
              value: `${index}`, text: `Edge ${(i + 1) / 2}: ${header}`, type: 'edge', attribute: `${header}`, position: `${(i + 1) / 2 - 1}`,
            });
            index += 1;
          });
        } else {
          selectedHeader.value[i].forEach((header: string) => {
            toReturn.push({
              value: `${index}`, text: `Node ${(i + 2) / 2}: ${header}`, type: 'node', attribute: `${header}`, position: `${(i + 2) / 2 - 1}`,
            });
            index += 1;
          });
        }
      });
      // // Removes extra edge in even paths
      // if (pathLength.value % 2 === 0) {
      //   toReturn.pop();
      // }
      return toReturn;
    });

    const tableData = computed(() => {
      const toReturn: { [key: string]: string }[] = [];
      store.state.selectedConnectivityPaths.forEach((path) => {
        const tablePath: { [key: string]: string } = {};
        headers.value.forEach((header) => {
          // eslint-disable-next-line no-unused-expressions
          header.type === 'edge' ? tablePath[`${header.value}`] = `${path.edges[+header.position][header.attribute]}`
            : tablePath[`${header.value}`] = `${path.vertices[+header.position][header.attribute]
            }`;
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
      const replacer = (key: unknown, value: unknown) => (value === null ? '' : value);

      const csvDataArray = tableData.value.map((row) => colHeader.map((_, i) => JSON.stringify(row[i], replacer)));

      // Add column headers
      csvDataArray.unshift(colHeader);

      const csvData = csvDataArray.join('\r\n');
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
      pathLength,
      iconMouseDown,
      closeCard,
      exportPaths,
    };
  },
});
</script>
