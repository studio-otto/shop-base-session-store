import Vue from 'vue';
import ApiClient from '@/services/ApiClient';

// initial state
const state = {
  collections: {},
  allProducts: {},
  isLoading: false,
  loadedCollections: []
};

const getters = {
  apiClient(state, getters, rootState) {
    return new ApiClient({
      shopifyDomain: rootState.domain,
      shopifyToken: rootState.token,
    })
  }
}

// actions
const actions = {
  async getCollection({state, dispatch}, handle) {
    if(!state.collections[handle] || !state.collections[handle].products) {
      await dispatch('getCollectionProducts', handle);
    }
  },

  async getCollectionProducts({dispatch, commit}, handle) {
    commit('setIsLoading', true);
    await dispatch('getCollectionProductPage', {handle, cursor: null, page: 1});
    commit('setIsLoading', false);
    commit('markCollectionAsFullyLoaded', handle)
  },

  async getCollectionProductPage({dispatch, commit, getters}, {handle, cursor, page}) {
    const collectionResponse = await getters.apiClient.fetchCollection(handle, cursor, cursor ? 20 : 6, page);

    if(collectionResponse) {
      commit('addCollectionProducts', {handle, collectionResponse});
      if(collectionResponse.products) commit('pushToAllProducts', collectionResponse.products);
      if(collectionResponse.nextPage) {
        await dispatch('getCollectionProductPage', {handle, cursor: collectionResponse.nextPage, page: page+1 });
      }
    } else {
      console.log(`Collection not found for handle: ${handle}`);
    }
  },

  async getProduct({state, dispatch, commit, getters}, handle) {
    // Check if its loaded in memory before making request
    let targetProduct = state.allProducts[handle];

    if (!targetProduct || (targetProduct && !targetProduct.meta) ) {
      commit('setIsLoading', true);
      targetProduct = await getters.apiClient.fetchProduct(handle);
      commit('pushToAllProducts', [targetProduct]);
      commit('setIsLoading', false);
    }
    
    if(targetProduct.metafields) {
      dispatch('getProductsByHandle', [...targetProduct.metafields.pdp_swatch_products.split(','), ...targetProduct.metafields.pdp_similar_products.split(',')])
    }
  },

  async getProductsByHandle({state, commit, getters}, handlesArray = []) {
    const unloadedProductHandles = handlesArray.filter(handle => !state.allProducts[handle]);
    const loadedProducts = await getters.apiClient.fetchProductsFromHandles(unloadedProductHandles);
    commit('pushToAllProducts', loadedProducts)
  }
};

// mutations
const mutations = {
  setIsLoading(state, isLoading) {
    state.isLoading = isLoading;
  },

  markCollectionAsFullyLoaded(state, handle) {
    state.loadedCollections = [...state.loadedCollections, handle]
  },

  addCollectionProducts(state, {handle, collectionResponse}) {
    const collection = state.collections[handle];
    const newCollection = collection ? collection : collectionResponse;
    if (collection && state.collections[handle].products && collectionResponse.products) {
      newCollection.products = [...collection.products, ...collectionResponse.products]
    }
    Vue.set(state.collections, handle, newCollection);
  },

  pushToAllProducts(state, products) {
    products.forEach((product) => {
      if (product !== 'Stale') {
        Vue.set(state.allProducts, product.handle, product)
      }
    })
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
