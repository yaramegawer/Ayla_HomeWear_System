import {
  MdShoppingCart,
  MdAddShoppingCart,
  MdInventory,
  MdAssignmentReturn,
  MdLocalOffer,
  MdAttachMoney,
  MdDashboard,
} from "react-icons/md";

/** Sidebar/navigation config — no page imports (keeps initial bundle small). */
const routeConfig = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdDashboard className="h-6 w-6" />,
  },
  {
    name: "Orders",
    layout: "/admin",
    path: "orders",
    icon: <MdShoppingCart className="h-6 w-6" />,
  },
  {
    name: "Create Order",
    layout: "/admin",
    path: "create-order",
    icon: <MdAddShoppingCart className="h-6 w-6" />,
  },
  {
    name: "Products",
    layout: "/admin",
    path: "products",
    icon: <MdInventory className="h-6 w-6" />,
  },
  {
    name: "Inventory",
    layout: "/admin",
    path: "inventory",
    icon: <MdInventory className="h-6 w-6" />,
  },
  {
    name: "Returns",
    layout: "/admin",
    path: "returns",
    icon: <MdAssignmentReturn className="h-6 w-6" />,
  },
  {
    name: "Discounts",
    layout: "/admin",
    path: "discounts",
    icon: <MdLocalOffer className="h-6 w-6" />,
  },
  {
    name: "Finance",
    layout: "/admin",
    path: "finance",
    icon: <MdAttachMoney className="h-6 w-6" />,
  },
];

export default routeConfig;
