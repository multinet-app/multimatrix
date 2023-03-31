<script setup lang="ts">
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { rightClickMenu, sortBy } = storeToRefs(store);
</script>

<template>
  <div
    id="right-click-menu"
  >
    <v-menu
      v-model="rightClickMenu.show"
      :position-x="rightClickMenu.left"
      :position-y="rightClickMenu.top"
    >
      <v-list>
        <v-list-item
          dense
          @click="store.clearSelection()"
        >
          <v-list-item-content>
            <v-list-item-title>Clear Selection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          v-if="rightClickMenu.nodeID !== undefined"
          dense
          @click="sortBy = rightClickMenu.nodeID"
        >
          <v-list-item-content>
            <v-list-item-title>Sort Neighbors</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style>
#right-click-menu {
  position: absolute;
}
</style>
