<script lang="ts">
import {
  Ref, ref,
} from '@vue/composition-api';
import { Network } from '@/types';

export default {
  name: 'FilterNetwork',

  setup() {
    // Vars to store the selected choices in
    const workspace: Ref<string | null> = ref(null);
    const network: Ref<string | null> = ref(null);

    // const buttonHref: Ref<string> = ref(loadError.value.href);
    // Will be changed in Alert.vue
    const buttonText = 'Filter Network';
    const dialog = false;
    const radioOption = 'randomSubset';
    const filteredNetwork: Network | null = null;
    const subsetAmount = -1;
    const subsetList: number[] = [100, 200, 300, 400, 500];
    const subsetCategory: string | null = null;

    return {
      buttonText,
      dialog,
      filteredNetwork,
      network,
      radioOption,
      subsetAmount,
      subsetList,
      workspace,
      subsetCategory,
    };
  },
};
</script>
<template>
  <div id="dialog">
    <v-app id="filterNetworkDialog">
      <v-row justify="center">
        <v-dialog
          v-model="dialog"
          fullscreen
          hide-overlay
          transition="dialog-bottom-transition"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              dark
              v-bind="attrs"
              v-on="on"
            >
              Filter Network
            </v-btn>
          </template>
          <v-card>
            <v-toolbar
              dark
              color="primary"
            >
              <v-btn
                icon
                dark
                @click="dialog = false"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
              <v-toolbar-title>Filter Network</v-toolbar-title>
              <v-spacer />
              <v-toolbar-items>
                <!-- Save Network here -->
                <v-btn
                  dark
                  text
                  @click="dialog = false"
                >
                  Save
                </v-btn>
              </v-toolbar-items>
            </v-toolbar>
            <v-list>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>Action Needed</v-list-item-title>
                  <v-list-item-subtitle>
                    The network you are loading is too large and additional
                    parameters are required to visualize. Consider one of the
                    following:
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-radio-group v-model="radioOption">
              <v-divider />
              <v-card-text>
                <v-radio value="randomSubset">
                  <template v-slot:label>
                    <div>Choose a random subset of nodes</div>
                    <v-select
                      v-model="subsetAmount"
                      :items="subsetList"
                    />
                  </template>
                </v-radio>
              </v-card-text>
              <v-divider />
            </v-radio-group>
          </v-card>
        </v-dialog>
      </v-row>
    </v-app>
  </div>
</template>
