export default class GraphSql {  
	construct() { }

	replaceAll(string, find, replace){
		return string.replace(
			new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
			replace
		);
	}

	productsFromHandlesQuery(handles) {
		return `{
			${handles.map((handle) => this.productByHandle(handle)).join("")}
		}`;
	}

  collectionQuery(collectionHandle, limit, cursor) {
		const collectionInfo = cursor ? '' : this.collectionFields();
    return `{ collectionByHandle(handle: "${collectionHandle}") {
					${collectionInfo}
          products(first:${limit}${cursor ? `, after: "${cursor}"` : ''}, sortKey: MANUAL) {						
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            edges {
              cursor
              node {
                ${this._productFragment()}
              }
            }
          }
        }
      }
    `;
  }

	collectionFields() {
    return `
      title
      description
      image {
				src
			}
    `;
  }

	searchProductsQuery(queryString, cursor) {
		return `
			{
				products(query: "${queryString}", first: 30 ${cursor ? `, after: "${cursor}"` : ""}) {
					pageInfo {
						hasNextPage,
						hasPreviousPage
					}
					edges {
						cursor
						node {
							${this._productFragment()}
						}
					}
				}
			}
		`;
	}

	queryProduct(handle) {
		return `{product: productByHandle(handle: "${handle}") {
			${this._productFragment()}
		}}`;
	}

	productByHandle(handle) {
		return `
			${this.uniqHandle(handle)}: productByHandle(handle: "${handle}") {
				${this._productFragment()}
			}
		`;
	}

	uniqHandle(handle) {
		return `${handle.replace(/-|[0-9]/g, "")}_${Math.random().toString().substring(7)}`
	}

	// Not a true graphql fragment because that wasn't working for me but can be used as one with string interpolation
	_productFragment() {
		return `
			availableForSale
			title
			handle
			tags
			description
			descriptionHtml
			productType
			id
	
			images(first: 10) {
				pageInfo {
					hasNextPage
					hasPreviousPage
				}
				edges {
					node {
						src
					}
				}
			}
	
			metafields(first: 50, namespace: "pdp_extras") {
				edges {
					node {
						key
						value
					}
				}
			}
	
			variants(first: 20) {
				pageInfo {
					hasNextPage
					hasPreviousPage
				}
				edges {
					node {
						id
						available
						compareAtPrice
						price
						title
						selectedOptions {
							value
						}
					}
				}
			}
		`;
	}
}