<template>
  <v-dialog
    v-model="dialog"
    class="ws-dialog"
    width="500"
  >
    <template #activator="{ on }">
      <v-btn
        class="mt-n1 ml-n1"
        icon
        small
        v-on="on"
      >
        <v-icon size="18">
          mdi-help-circle
        </v-icon>
      </v-btn>
    </template>

    <v-card>
      <v-card-title
        class="headline pb-0 pt-3"
        primary-title
      >
        About MultiMatrix
      </v-card-title>

      <v-card-text
        class="px-4 pt-4 pb-1"
      >
        The MultiMatrix application shows network data using an adjacency matrix diagram. Using MultiMatrix, users can visualize variables connections between nodes, and can aggregate nodes to show connections between groups.
      </v-card-text>

      <v-card-text class="px-4 pt-4 pb-1">
        Check out the MultiNet project <a href="https://multinet.app">here</a>, the source code <a href="https://github.com/multinet-app/multimatrix">here</a> or our documentation <a href="https://multinet-app.readthedocs.io/en/latest/index.html">here</a>.
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-3">
        <v-spacer />

        <v-btn
          color="grey darken-3"
          dark
          depressed
          @click="dialog = false"
        >
          OK
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
  setup() {
    const dialog = ref(false);

    return {
      dialog,
    };
  },
});

</script>
