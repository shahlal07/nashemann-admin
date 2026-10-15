# Project Overview

## Mission
Build a reliable multi-vendor marketplace where customers discover products and place orders, vendors manage stores/products and fulfil orders, and platform administrators oversee marketplace operations and financial controls.

## Four active codebases
- **nashemann-web:** customer-facing marketplace and shopping journey.
- **vendor-storefronts:** vendor storefront presentation, catalog display, routing, and checkout handoff.
- **vendor-admins:** vendor onboarding, store management, products/inventory, and order operations.
- **nashemann-admin:** platform administration and the shared project brain.

These are intended responsibilities, not a verified inventory of current features. Inspect code and tests before claiming a feature is implemented.

## Shared outcomes
1. Customers can discover accurate products and complete an order journey.
2. Vendors can onboard and manage stores, products, inventory, and orders.
3. Tenant boundaries prevent vendors accessing another vendor's private data.
4. Platform administrators can safely manage settings and investigate privileged actions.
5. Fees, subscriptions, settlements, and reports are consistent and auditable.
6. Deployments are tested, observable, and reversible.

## Roles
- **Product & Technology:** technical architecture, customer marketplace and storefronts.
- **Marketplace & Operations:** vendor onboarding, store/product/order operations, fulfilment and support requirements.
- **Finance, Strategy & Governance:** financial controls, reconciliation, admin governance, reporting and decision records.

All owners may inspect all four repos. Responsibilities establish accountability, not access restrictions.