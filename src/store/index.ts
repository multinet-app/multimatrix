import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';

import api from '@/api';
import {
  GraphSpec, RowsSpec, TableRow, UserSpec,
} from 'multinet';
import {
  Link, LoadError, Network, Node, State,
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
    loadError: {
      message: '',
      href: '',
    },
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

    loadError(state) {
      return state.loadError;
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

    setLoadError(state, loadError: LoadError) {
      state.loadError = {
        message: loadError.message,
        href: loadError.href,
      };
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

      let networkTables: GraphSpec | undefined;

      // Get all table names
      try {
        networkTables = await api.graph(workspaceName, networkName);
      } catch (error) {
        if (error.status === 404) {
          if (workspaceName === undefined || networkName === undefined) {
            commit.setLoadError({
              message: 'Workspace and/or network were not defined in the url',
              href: 'https://multinet.app',
            });
          } else {
            commit.setLoadError({
              message: error.statusText,
              href: 'https://multinet.app',
            });
          }
        } else if (error.status === 401) {
          commit.setLoadError({
            message: 'You are not authorized to view this workspace',
            href: 'https://multinet.app',
          });
        } else {
          commit.setLoadError({
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          });
        }
      } finally {
        if (store.getters.loadError.message === '' && typeof networkTables === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&graph=${networkName}`,
          });
        }
      }

      if (networkTables === undefined) {
        return;
      }
      // Check node and table size
      const sizePromises = networkTables.nodeTables.map((table) => api.aql(workspaceName, `FOR doc IN ${table} COLLECT WITH COUNT INTO length RETURN length`));

      const resolvedSizePromises = await Promise.all(sizePromises);
      resolvedSizePromises.forEach((promise) => {
        if (promise[0] > 500) {
          commit.setLoadError({
            message: 'The network you are loading is too large',
            href: 'https://multinet.app',
          });
        }
      });

      if (store.state.loadError.message !== '') {
        return;
      }
      // Generate all node table promises
      const nodePromises: Promise<RowsSpec>[] = [];
      networkTables.nodeTables.forEach((table) => {
        nodePromises.push(api.table(workspaceName, table, { offset: 0, limit: 1000 }));
      });

      // Resolve all node table promises and extract the rows
      const resolvedNodePromises = await Promise.all(nodePromises);
      let nodes: TableRow[] = [];
      resolvedNodePromises.forEach((resolvedPromise) => {
        nodes.push(...resolvedPromise.rows);
      });

      // Generate and resolve edge table promise and extract rows
      const edgePromise = await api.table(workspaceName, networkTables.edgeTable, { offset: 0, limit: 1000 });
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
