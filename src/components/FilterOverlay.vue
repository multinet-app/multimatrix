<template>
  <div id="dialog">
    <v-app id="filterOverlayDialog">
      <v-row
        align="center"
        justify="center"
      >
        <v-overlay
          :absolute="absolute"
          :value="overlay"
        >
          <v-card>
            <v-list>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>Action Needed</v-list-item-title>
                  The network you are loading is too large and additional
                  parameters are required to visualize. Consider one of the
                  following:
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-card>
              <v-radio-group v-model="radioOption">
                <v-divider />
                <v-card-text>
                  <v-radio value="randomSubset">
                    <template v-slot:label>
                      <div>Choose a random subset of nodes</div>
                      <v-slider
                        v-model="subsetAmount"
                        :max="max"
                        :min="min"
                        step="10"
                        ticks="true"
                        thumb-label
                      >
                        <template v-slot:append>
                          <v-text-field
                            v-model="subsetAmount"
                            class="mt-0 pt-0"
                            hide-details
                            single-line
                            type="number"
                            style="width: 60px"
                          />
                        </template>
                      </v-slider>
                    </template>
                  </v-radio>
                </v-card-text>
                <v-divider />
              </v-radio-group>
            </v-card>

            <v-btn
              class="white--text"
              color="teal"
              @click="overlay = false"
            >
              Filter Network
            </v-btn>
          </v-card>
        </v-overlay>
      </v-row>
    </v-app>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  data() {
    return {
      overlay: true,
      zIndex: 0,
      min: 10,
      max: 300,
    };
  },
});

</script>
