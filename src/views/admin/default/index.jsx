import React from 'react';
import { 
  MdShoppingCart, 
  MdInventory, 
  MdAttachMoney, 
  MdReceiptLong,
  MdInfoOutline
} from 'react-icons/md';

const Dashboard = () => {
  const GuideCard = ({ title, description, icon, color }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-purple-100 p-6 flex items-start space-x-4 hover:shadow-md transition-shadow group cursor-pointer`}>
      <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-xl font-bold group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 text-left">Welcome to the Command Center</h1>
          <p className="text-purple-100 max-w-2xl text-left">
            This dashboard serves as your primary control system for managing online and store operations. 
            All modules are directly integrated with your live database to ensure real-time accuracy.
          </p>
        </div>
        {/* Decorative circle */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-2xl"></div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <MdInfoOutline className="text-purple-600" /> 
          Quick Start Guide
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GuideCard 
            title="Order Management" 
            description="View, filter, and modify all incoming orders. You can update payment statuses, insert private order notes, or confirm deposits. Supports 1000+ tickets instantly."
            icon={<MdShoppingCart className="text-purple-600" />}
            color="bg-purple-500"
          />

          <GuideCard 
            title="Returns & Exchanges" 
            description="Process item differences directly. Calculate financial gaps when a customer swaps items, and log Return Reasons dynamically into the unified registry."
            icon={<MdReceiptLong className="text-indigo-500" />}
            color="bg-indigo-500"
          />

          <GuideCard 
            title="Inventory Operations" 
            description="Add new catalog items, inject discount campaigns, and adjust localized pricing properties in real-time. Automatically syncs with Analytics."
            icon={<MdInventory className="text-blue-500" />}
            color="bg-blue-500"
          />

          <GuideCard 
            title="Finance Analytics" 
            description="Evaluate dynamic margin growth and costs. You can pinpoint historical date ranges to calculate granular Profit/Net Revenue reports and easily export them to CSV."
            icon={<MdAttachMoney className="text-emerald-500" />}
            color="bg-emerald-500"
          />
        </div>
      </div>

      {/* Notice Section */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 relative">
        <div className="flex border-b border-purple-200 pb-3 mb-3">
          <span className="text-purple-800 font-bold uppercase text-sm tracking-wider">System Architecture Note</span>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed text-left">
          Your dashboard leverages a unified cloud layer. Data changes processed within the <strong>Orders</strong> or <strong>Inventory</strong> modules will instantly cascade to compute your <strong>Financial Analytics</strong> without requiring a manual refresh.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
