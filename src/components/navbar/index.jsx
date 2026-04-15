import React from "react";
import { FiAlignJustify } from "react-icons/fi";
import { Link } from "react-router-dom";
import { RiMoonFill, RiSunFill } from "react-icons/ri";

const Navbar = (props) => {
  const { onOpenSidenav, brandText, user, onLogout } = props;
  const [darkmode, setDarkmode] = React.useState(false);

  return (
    <nav className="sticky top-4 z-40 flex flex-row flex-wrap items-center justify-between rounded-xl bg-white/10 p-2 backdrop-blur-xl dark:bg-[#0b14374d]">
      <div className="ml-[6px]">
        <div className="h-6 w-[224px] pt-1">
          <span className="text-sm font-normal capitalize text-navy-700 dark:text-white">
            {brandText || 'Dashboard'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="flex cursor-pointer text-xl text-gray-600 dark:text-white xl:hidden"
          onClick={onOpenSidenav}
        >
          <FiAlignJustify className="h-5 w-5" />
        </span>
        
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-white">
              Welcome, {user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-purple-600 hover:text-purple-800 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        )}
        
        <div
          className="cursor-pointer text-gray-600"
          onClick={() => {
            if (darkmode) {
              document.body.classList.remove("dark");
              setDarkmode(false);
            } else {
              document.body.classList.add("dark");
              setDarkmode(true);
            }
          }}
        >
          {darkmode ? (
            <RiSunFill className="h-4 w-4 text-gray-600 dark:text-white" />
          ) : (
            <RiMoonFill className="h-4 w-4 text-gray-600 dark:text-white" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
