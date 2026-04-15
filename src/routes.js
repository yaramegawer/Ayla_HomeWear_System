import React from "react";

// Admin Imports
import MainDashboard from "views/admin/default";
import OrdersManagement from "views/admin/orders";
import CreateOrder from "views/admin/create-order";
import ProductsManagement from "views/admin/products";
import InventoryManagement from "views/admin/inventory";
import ReturnsManagement from "views/admin/returns";
import DiscountsManagement from "views/admin/discounts";
import FinanceAnalytics from "views/admin/finance";

// Icon Imports
import {
  MdShoppingCart,
  MdAddShoppingCart,
  MdInventory,
  MdAssignmentReturn,
  MdLocalOffer,
  MdAttachMoney,
  MdDashboard,
} from "react-icons/md";

const routes = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdDashboard className="h-6 w-6" />,
    component: MainDashboard,
  },
  {
    name: "Orders",
    layout: "/admin",
    path: "orders",
    icon: <MdShoppingCart className="h-6 w-6" />,
    component: OrdersManagement,
  },
  {
    name: "Create Order",
    layout: "/admin",
    path: "create-order",
    icon: <MdAddShoppingCart className="h-6 w-6" />,
    component: CreateOrder,
  },
  {
    name: "Products",
    layout: "/admin",
    path: "products",
    icon: <MdInventory className="h-6 w-6" />,
    component: ProductsManagement,
  },
  {
    name: "Inventory",
    layout: "/admin",
    path: "inventory",
    icon: <MdInventory className="h-6 w-6" />,
    component: InventoryManagement,
  },
  {
    name: "Returns",
    layout: "/admin",
    path: "returns",
    icon: <MdAssignmentReturn className="h-6 w-6" />,
    component: ReturnsManagement,
  },
  {
    name: "Discounts",
    layout: "/admin",
    path: "discounts",
    icon: <MdLocalOffer className="h-6 w-6" />,
    component: DiscountsManagement,
  },
  {
    name: "Finance",
    layout: "/admin",
    path: "finance",
    icon: <MdAttachMoney className="h-6 w-6" />,
    component: FinanceAnalytics,
  },
];
export default routes;
