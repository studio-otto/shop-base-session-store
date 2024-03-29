import Vue from 'vue';
import ShopifyBuyClient from 'shopify-buy';

const state = {
  cartIsBusy: true,
  checkout: null,
  itemCount: 0,
  drawerIsOpen: false
}

// getters
const getters = {
  client(state, getters, rootState) {
    return ShopifyBuyClient.buildClient({
      domain: rootState.domain,
      storefrontAccessToken: rootState.token,
    })
  }
}

// actions
const actions = {
  // ----------------
  // CHECKOUT CREATION/RETRIEVAL METHODS
  // ----------------
  async getCheckout({commit, dispatch, getters}, checkoutId = null) {
    commit("setCartIsBusy", true);
    const id = checkoutId ? checkoutId : localStorage.getItem('currentCheckout');
    const checkoutCheck = id && id !== "undefined"
            ? await getters.client.checkout.fetch(id)
            : await dispatch('createCheckout');
    // Sometimes we have an old checkout id but it has staled, if that is the case create a new one
    const checkout = checkoutCheck == null || checkoutCheck.completedAt !== null ? await dispatch('createCheckout') : checkoutCheck;
    commit('setCheckout', checkout);
    commit("setCartIsBusy", false);
  },

  async createCheckout({commit, getters}) {
    const checkout = await getters.client.checkout.create();
    commit('setCheckout', checkout);
    return checkout;
  },
  
  // --------------------------
  // CHECKOUT LINE ITEM METHODS
  // --------------------------

  // addLineItemToCheckout: Add a new Line Item to the checkout
  async addLineItemToCheckout({commit, dispatch, state, getters}, {lineItem, quantity = 1, noteObj = null, checkoutObj = null}) {
    commit('setCartIsBusy', true);

    if (!state.checkout) {
      await dispatch('createCheckout')
    }

    const lineItemNote = noteObj ? noteObj : {key: '', value: ''}
    const checkoutNote = checkoutObj ? checkoutObj : {customAttributes: [{key: '', value: ''}]}

    const encodedVariantId = lineItem.id && lineItem.id.length > 15 ? lineItem.id : btoa(`gid://shopify/ProductVariant/${lineItem.id}`);
    await getters.client.checkout.updateAttributes(state.checkout.id, checkoutNote)
    const newCheckout = await getters.client.checkout.addLineItems(state.checkout.id, {
      variantId: encodedVariantId,
      quantity,
      customAttributes: [lineItemNote]
    });

    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
    // dispatch('autoOpenDrawer');
  },

  // UpdateLineItems: modifies line items (array) in the checkout
  // params: lineItmes = [{id: "graphqlId", quantity: 2}, etc]
  async updateLineItems({commit, state, getters}, lineItems) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.updateLineItems(state.checkout.id, lineItems);
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  // updateAttributes: modifies attributes on the checkout object
  // params: lineItmes = [{id: "graphqlId", quantity: 2}, etc]
  async updateAttributes({commit, state, getters}, checkoutNote) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.updateAttributes(state.checkout.id, checkoutNote);
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  // UpdateLineItem: modify the quantity of (one line item) line item in checkout
  // line item = {id: , quantity}
  async updateLineItem({dispatch}, lineItem) {
    dispatch('updateLineItems', [lineItem])
  },

  // removeLineItem: Remove a lineitem via id
  async removeLineItem({state, commit, getters}, lineItemId) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.removeLineItems(state.checkout.id, [lineItemId])
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  async autoOpenDrawer({commit, dispatch, state}) {
    if (state.drawerIsOpen) return;
    commit('setDrawerState', true);
    await dispatch("resolveAfter3Seconds");
    commit('setDrawerState', false);
  },

  async resolveAfter3Seconds() {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        resolve('resolved');
      }, 3000);
    });
  }

}

// mutations
const mutations = {
  setCheckout(state, checkout) {
    localStorage.setItem('currentCheckout', checkout.id);
    Vue.set(state, 'checkout', checkout);
    state.itemCount = checkout && checkout.lineItems
      ? checkout.lineItems.reduce((count, lineItem) => {
        return lineItem.quantity + count;
      }, 0)
      : 0;
  },

  toggleDrawer(state) {
    state.drawerIsOpen = !state.drawerIsOpen;
  },

  setDrawerState(state, drawerState) {
    state.drawerIsOpen = drawerState;
  },

  setCartIsBusy(state, cartIsBusy) {
    state.cartIsBusy = cartIsBusy;
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}