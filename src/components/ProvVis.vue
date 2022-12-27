<script setup lang="ts">
import { ProvVisCreator } from '@visdesignlab/trrack-vis';
import { onMounted } from 'vue';
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  showProvenanceVis,
  provenance,
} = storeToRefs(store);

onMounted(() => {
  const provDiv = document.getElementById('provDiv');
  if (provenance.value !== null && provDiv != null) {
    ProvVisCreator(
      provDiv,
      provenance.value,
      (newNode: string) => store.goToProvenanceNode(newNode),
      true,
      true,
      provenance.value.root.id,
    );
  }
});

function toggleProvVis() {
  showProvenanceVis.value = false;
}
</script>

<template>
  <v-navigation-drawer
    absolute
    permanent
    right
    :width="450"
  >
    <v-btn
      icon
      class="ma-2"
      @click="toggleProvVis"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn>

    <div id="provDiv" />
  </v-navigation-drawer>
</template>

<style scoped>
#provDiv:deep(.secondary) {
  /* Unset vuetify colors for secondary */
  background-color: unset !important;
  border-color: white !important;
}

#provDiv {
  position: fixed;
  z-index: 2;
}
</style>
