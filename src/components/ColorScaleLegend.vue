<template>
  <v-row class="pb-0 px-0">
    <v-col style="width: 75px; max-width: 75px;">
      {{ props.label }}
    </v-col>
    <v-col style="width: 150px; max-width: 150px;">
      <svg height="50" width="150">
        <rect
          v-for="item, index in items"
          :key="`rect_${index}`"
          :fill="item.input === 0 ? '#FFFFFF' : `${item.value}`"
          :x="(index * (rectWidth + rectPad)) + 1"
          y="10"
          height="15"
          :width="rectWidth"
          style="stroke-width: 1px; stroke: white;"
        />
        <text
          v-for="item, index in items"
          :key="`text_${index}`"
          :x="(index * (rectWidth + rectPad)) + (rectWidth / 2)"
          y="40"
          text-anchor="middle"
          fill="white"
        >
          {{ item.input }}
        </text>
      </svg>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ScaleLinear } from 'd3';
import { computed } from 'vue';

const props = defineProps<{ scale: ScaleLinear<string, number>; label: string }>();

const rectWidth = 25;
const rectPad = 5;

const items = computed(() => {
  const domain = props.scale.domain();
  let valuesInDomain = Array(domain[1] - domain[0] + 1).fill(0).map((x, i) => ({ input: i, value: props.scale(i) }));

  // If we have more than 5 values, let's only select the quartile values
  if (valuesInDomain.length > 5) {
    const idxToSelect = [
      0,
      Math.floor(valuesInDomain.length * 0.25),
      Math.floor(valuesInDomain.length * 0.5),
      Math.floor(valuesInDomain.length * 0.75),
      valuesInDomain.length - 1,
    ];

    valuesInDomain = valuesInDomain.filter((x, i) => idxToSelect.includes(i));
  }

  return valuesInDomain;
});
</script>

<style scoped>
svg {
  min-width: 150px;
}
</style>
