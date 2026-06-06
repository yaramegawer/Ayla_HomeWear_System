/* eslint-disable */

import { HiX } from "react-icons/hi";
import Links from "./components/Links";

import routes from "routes.js";

const Sidebar = ({ open, onClose }) => {
  // Read user role from local storage strictly for UI rendering
  let isCashier = false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'cashier') isCashier = true;
  } catch (e) {}

  const filteredRoutes = routes.filter(r => {
    if (isCashier && r.path === 'finance') return false;
    if (r.path === 'returns') return false;
    if (r.path === 'discounts') return false;
    return true;
  });

  return (
    <div
      className={`sm:none duration-175 linear fixed !z-50 flex min-h-full w-[300px] flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 ${
        open ? "translate-x-0" : "-translate-x-96 xl:translate-x-0"
      }`}
    >
      <span
        className="absolute top-4 right-4 block cursor-pointer xl:hidden"
        onClick={onClose}
      >
        <HiX />
      </span>

      <div className={`mx-[30px] mt-6 flex items-center`}>
        <div className="mt-1 ml-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
          Ayla HomeWear 
        </div>
      </div>
      <div className="mt-6 mb-6 h-px bg-gray-300 dark:bg-white/30" />
      {/* Nav item */}

      <ul className="mb-auto pt-1">
        <Links routes={filteredRoutes} onClose={onClose} />
      </ul>
      {/* Nav item end */}
    </div>
  );
};

export default Sidebar;
