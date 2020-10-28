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
    if(!state.collections[handle] || state.collections[handle].partiallyLoaded) {
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
    const collectionResponse = await getters.apiClient.fetchCollection(handle, cursor, cursor ? 250 : 50, page);

    if(collectionResponse) {
      commit('pushToProducts', collectionResponse.products);
      commit('updateCollection', {handle, collectionResponse});
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
      commit('updateProductsLoadingState', {handle, loadingState: {isLoaded: false, isLoading: true}});
      targetProduct = await getters.apiClient.fetchProduct(handle);
      commit('pushToProducts', [targetProduct]);
      commit('setIsLoading', false);
    }
    
    if(targetProduct.metafields) {
      const swatchProducts = targetProduct.metafields.pdp_swatch_products ? targetProduct.metafields.pdp_swatch_products.split(',') : []
      const similarProducts = targetProduct.metafields.pdp_similar_products ? targetProduct.metafields.pdp_similar_products.split(',') : []
      dispatch('getProductsByHandle', [...swatchProducts, ...similarProducts]);
    }
  },

  async getProductsByHandle({state, commit, getters}, handlesArray = []) {
    const unloadedProductHandles = handlesArray.filter(handle => !state.allProducts[handle]);
    const loadedProducts = await getters.apiClient.fetchProductsFromHandles(unloadedProductHandles);
    commit('pushToProducts', loadedProducts);
  }
};

const uniqArray = (arr) => [...new Set(arr)];

// mutations
const mutations = {
  setIsLoading(state, isLoading) {
    state.isLoading = isLoading;
  },

  markCollectionAsFullyLoaded(state, handle) {
    state.loadedCollections = [...state.loadedCollections, handle];
  },

  updateCollection(state, {handle, collectionResponse}) {
    const collection = state.collections[handle];
    const newCollection = collection ? collection : collectionResponse;
    if (collection && state.collections[handle].products && collectionResponse.products) {
      newCollection.products = uniqArray([...collection.products, ...collectionResponse.products])
    }
    Vue.set(state.collections, handle, newCollection);
  },

  pushToProducts(state, products) {
    products.forEach((product) => {
      if (product === 'Stale') return
      const isOnlyHandle = typeof product === "string"
      const handle = isOnlyHandle ? product : product.handle
      const newProductAttributes = isOnlyHandle ? { handle } : product
      const productAttrs = {
        ...newProductAttributes,
        isLoading: false,
        isLoaded: !isOnlyHandle
      }
      const products = state.allProducts
      products[handle] = productAttrs
      Vue.set(state.allProducts, products);
    })
  },

  updateProductsLoadingState(state, {handle, loadingState}) { // loading state must include isLoading: boolean, isLoaded: boolean
    Vue.set(state.allProducts, handle, {...state.allProducts[handle], ...loadingState});
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
