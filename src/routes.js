import React from "react";
import routeConfig from "./routeConfig";

const MainDashboard = React.lazy(() => import("views/admin/default"));
const OrdersManagement = React.lazy(() => import("views/admin/orders"));
const CreateOrder = React.lazy(() => import("views/admin/create-order"));
const ProductsManagement = React.lazy(() => import("views/admin/products"));
const InventoryManagement = React.lazy(() => import("views/admin/inventory"));
const ReturnsManagement = React.lazy(() => import("views/admin/returns"));
const DiscountsManagement = React.lazy(() => import("views/admin/discounts"));
const FinanceAnalytics = React.lazy(() => import("views/admin/finance"));

const componentsByPath = {
  default: MainDashboard,
  orders: OrdersManagement,
  "create-order": CreateOrder,
  products: ProductsManagement,
  inventory: InventoryManagement,
  returns: ReturnsManagement,
  discounts: DiscountsManagement,
  finance: FinanceAnalytics,
};

const routes = routeConfig.map((route) => ({
  ...route,
  component: componentsByPath[route.path],
}));

export default routes;
