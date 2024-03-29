# Session Store
Shopify session store for Shopify Vue sites - Query methods and centralized store for products and cart

## Deploying to NPM
```
// Bump the version depending on change typy
$ npm version patch
$ npm version minor
$ npm version major

// Build
$ yarn build

// Push to NPM
$ npm publish --access public
```

## Install
Install package
```bash
yarn add @studio-otto/session-store
```

## Use

Probably going to tweak this, ran into some unexpected architecture with nuxt and it trying to register store already. If I update it will be soon and fairly minor, currently it just doesnt treat the store state arrays like registered vue arrays so you need to set that up in the app. [See collection page example implementation to see what I mean](https://github.com/studio-otto/shop-base-session-store/wiki/Example-collection-page-implementation). It is only really with products array and collections array on products module I think. If you dont state it as obervable, it will only update products on initial product page load, and the final. 

Inside app / vue shop

### Nuxt installation
in /store/index.js

```javascript
import { Modules } from 'session-store'

// These are default config overrides - totally optional
export const state = () => {
  return {
    domain: 'someshopname.myshopify.com',
    token: 'c0a00f9ce66bb85d8ba6759bfc9d37db'
  }
}

export const modules = Modules

```

thats it!

### Non-Nuxt installation
in app.js or w/e you are installing/mounting vue

```javascript
import { CreateStore } from 'session-store'

new Vue({
  el: '#someid',
  store: CreateStore(domain, token),
})
```

*[See wiki for examples and methods](https://github.com/studio-otto/shop-base-session-store/wiki/Methods)*

## License
MIT
