import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';

import api from '@/api';
import { RowsSpec, TableRow, UserSpec } from 'multinet';
import {
  Link, Network, Node, State,
} from '@/types';
import { defineNeighbors } from '@/lib/utils';

Vue.use(Vuex);

const {
  store,
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
} = createDirectStore({
  state: {
    workspaceName: null,
    networkName: null,
    network: null,
    userInfo: null,
  } as State,

  getters: {
    workspaceName(state: State) {
      return state.workspaceName;
    },

    networkName(state: State) {
      return state.networkName;
    },

    network(state: State) {
      return state.network;
    },
  },
  mutations: {
    setWorkspaceName(state, workspaceName: string) {
      state.workspaceName = workspaceName;
    },

    setNetworkName(state, networkName: string) {
      state.networkName = networkName;
    },

    setNetwork(state, network: Network) {
      state.network = network;
    },

    setUserInfo(state, userInfo: UserSpec | null) {
      state.userInfo = userInfo;
    },
  },
  actions: {
    async fetchNetwork(context, { workspaceName, networkName }) {
      const { commit } = rootActionContext(context);
      commit.setWorkspaceName(workspaceName);
      commit.setNetworkName(networkName);

      // Get all table names
      const networkTables = await api.graph(workspaceName, networkName);

      if (networkTables === undefined) {
        return;
      }

      // Generate all node table promises
      const nodePromises: Promise<RowsSpec>[] = [];
      networkTables.nodeTables.forEach((table) => {
        nodePromises.push(
          api.table(workspaceName, table, { offset: 0, limit: 1000 }),
        );
      });

      // Resolve all node table promises and extract the rows
      const resolvedNodePromises = await Promise.all(nodePromises);
      let nodes: TableRow[] = [];
      resolvedNodePromises.forEach((resolvedPromise) => {
        nodes.push(...resolvedPromise.rows);
      });

      // Generate and resolve edge table promise and extract rows
      const edgePromise = await api.table(
        workspaceName,
        networkTables.edgeTable,
        { offset: 0, limit: 1000 },
      );
      const edges = edgePromise.rows;

      // Add neighbor definition to nodes
      nodes = defineNeighbors(nodes, edges);

      // Build the network object and set it as the network in the store
      const network = {
        nodes: nodes as Node[],
        edges: edges as Link[],
      };
      commit.setNetwork(network);
    },

    async fetchUserInfo(context) {
      const { commit } = rootActionContext(context);

      const info = await api.userInfo();
      commit.setUserInfo(info);
    },

    async logout(context) {
      const { commit } = rootActionContext(context);

      // Perform the server logout.
      await api.logout();
      commit.setUserInfo(null);
    },
  },
});

export default store;
export {
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
};

// The following lines enable types in the injected store '$store'.
export type ApplicationStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: ApplicationStore;
  }
}
