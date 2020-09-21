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
    const checkout = id && id !== "undefined"
            ? await getters.client.checkout.fetch(id)
            : await dispatch('createCheckout');

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
    dispatch('autoOpenDrawer');
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
  async updateLineItem({dispatch}, {lineItemId, quantity}) {
    dispatch('updateLineItems', [{id: lineItemId, quantity}])
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
    commit('toggleDrawer', true);
    await dispatch("resolveAfter3Seconds");
    commit('toggleDrawer', false);
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

  toggleDrawer(state, drawerIsOpen) {
    state.drawerIsOpen = drawerIsOpen;
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