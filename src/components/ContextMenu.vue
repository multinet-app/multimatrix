<script setup lang="ts">
import store from '@/store';
import { computed } from 'vue';

function clearSelection() {
  store.dispatch.clearSelection();
}

const rightClickMenu = computed(() => store.state.rightClickMenu);
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
          @click="clearSelection"
        >
          <v-list-item-content>
            <v-list-item-title>Clear Selection</v-list-item-title>
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
