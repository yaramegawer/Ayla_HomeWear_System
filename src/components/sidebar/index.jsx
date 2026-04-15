/* eslint-disable */

import { HiX } from "react-icons/hi";
import Links from "./components/Links";

import routes from "routes.js";

const Sidebar = () => {
  // Read user role from local storage strictly for UI rendering
  let isCashier = false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'cashier') isCashier = true;
  } catch (e) {}

  const filteredRoutes = routes.filter(r => {
    if (isCashier && r.path === 'finance') return false;
    return true;
  });

  return (
    <div
      className="duration-175 linear flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white !z-50"
    >

      <div className={`mx-[40px] mt-[50px] flex items-center`}>
        <div className="mt-1 ml-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
          Ayla HomeWear 
        </div>
      </div>
      <div className="mt-[58px] mb-7 h-px bg-gray-300 dark:bg-white/30" />
      {/* Nav item */}

      <ul className="mb-auto pt-1">
        <Links routes={filteredRoutes} />
      </ul>
      {/* Nav item end */}
    </div>
  );
};

export default Sidebar;
