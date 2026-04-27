import React, { useState } from 'react';
import formatCurrency from '../../../utils/formatCurrency';

const CustomOrderItem = ({ item, index, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleCustomPrice = () => {
    onUpdate(index, { useCustomPrice: !item.useCustomPrice });
  };

  const handlePriceChange = (value) => {
    const finalPrice = item.useCustomPrice 
      ? value * (1 - (item.customDiscount || 0) / 100)
      : value;
    onUpdate(index, { customPrice: value, calculatedFinalPrice: finalPrice });
  };

  const handleDiscountChange = (value) => {
    const finalPrice = (item.customPrice || item.originalPrice) * (1 - value / 100);
    onUpdate(index, { customDiscount: value, calculatedFinalPrice: finalPrice });
  };

  const handleQuantityChange = (value) => {
    onUpdate(index, { quantity: Math.max(1, parseInt(value) || 1) });
  };

  const handleColorChange = (value) => {
    onUpdate(index, { color: value });
  };

  const handleSizeChange = (value) => {
    onUpdate(index, { size: value });
  };

  const calculateFinalPrice = () => {
    if (item.useCustomPrice) {
      return (item.customPrice || 0) * (1 - (item.customDiscount || 0) / 100);
    }
    return item.calculatedFinalPrice;
  };

  const getStockForColor = (color) => {
    const colorStock = item.colorStock?.find(cs => cs.color === color);
    return colorStock?.stock || 0;
  };

  const getStockColor = (stock) => {
    if (stock > 20) return 'bg-green-100 text-green-800';
    if (stock > 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold">{item.name}</h4>
          <p className="text-sm text-gray-500">{item.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 text-sm"
          >
            {isExpanded ? '−' : '+'} Pricing
          </button>
          <button
            onClick={() => onRemove(index)}
            className="text-red-500"
          >
            ×
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Custom Price"
            value={item.customPrice || ''}
            onChange={(e) => {
              handlePriceChange(parseFloat(e.target.value) || 0);
              if (!item.useCustomPrice) {
                handleToggleCustomPrice();
              }
            }}
            className="w-full px-2 py-1 border"
          />
        </div>
      )}
    </div>
  );
};

export default CustomOrderItem;
