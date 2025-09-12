import React from 'react';
import { Badge } from '../ui/badge.jsx';
import { Hotel, CheckCircle, X } from 'lucide-react';
import {
    formatCurrency,
    convertToUserCurrencyAmount,
    getUserPreferredCurrency,
} from '../../utils/currencyConverter.js';

export default function HotelTable({
    hotels,
    selectedHotels,
    onSelectionChange,
    onRemove,
}) {
    const handleHotelToggle = (hotel, checked) => {
        if (checked) onSelectionChange([...selectedHotels, hotel]);
        else onSelectionChange(selectedHotels.filter((h) => h.id !== hotel.id));
    };

    const isHotelSelected = (hotelId) =>
        selectedHotels.some((h) => h.id === hotelId);

    const handleSelectAll = (checked) => {
        if (checked) {
            // Select all non-booked hotels
            const selectableHotels = hotels.filter((hotel) => !hotel.isBooked);
            onSelectionChange(selectableHotels);
        } else {
            // Deselect all hotels
            onSelectionChange([]);
        }
    };

    const areAllHotelsSelected = () => {
        const selectableHotels = hotels.filter((hotel) => !hotel.isBooked);
        return (
            selectableHotels.length > 0 &&
            selectableHotels.every((hotel) => isHotelSelected(hotel.id))
        );
    };

    const areSomeHotelsSelected = () => {
        const selectableHotels = hotels.filter((hotel) => !hotel.isBooked);
        return (
            selectableHotels.some((hotel) => isHotelSelected(hotel.id)) &&
            !areAllHotelsSelected()
        );
    };

    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] sm:min-w-0">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={areAllHotelsSelected()}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate =
                                                areSomeHotelsSelected();
                                        }
                                    }}
                                    onChange={(e) =>
                                        handleSelectAll(e.target.checked)
                                    }
                                    className="h-4 w-4"
                                />
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Hotel
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Stay
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Duration
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-right p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-12" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {hotels.map((hotel) => (
                            <tr
                                key={hotel.id}
                                className={`hover:bg-slate-50 ${
                                    hotel.isBooked ? 'bg-green-50' : ''
                                }`}
                            >
                                <td className="p-2 sm:p-4">
                                    <input
                                        type="checkbox"
                                        checked={isHotelSelected(hotel.id)}
                                        onChange={(e) =>
                                            handleHotelToggle(
                                                hotel,
                                                e.target.checked
                                            )
                                        }
                                        disabled={hotel.isBooked}
                                        className={`h-4 w-4 ${
                                            hotel.isBooked ? 'opacity-50' : ''
                                        }`}
                                    />
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div className="flex items-center gap-2">
                                        <Hotel className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-800 text-xs sm:text-sm truncate">
                                                {hotel.name}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {hotel.location}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div className="text-xs sm:text-sm min-w-0">
                                        <p className="text-slate-800 whitespace-nowrap">
                                            {hotel.checkIn || 'Check-in TBD'}
                                        </p>
                                        <p className="text-slate-500 whitespace-nowrap">
                                            to{' '}
                                            {hotel.checkOut || 'Check-out TBD'}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div>
                                        <p className="text-slate-800 text-xs sm:text-sm font-medium">
                                            {hotel.nights
                                                ? `${hotel.nights} nights`
                                                : 'Duration TBD'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {hotel.pricePerNight &&
                                            hotel.pricePerNight !== 'Price TBD'
                                                ? (() => {
                                                      // Parse price string like "222.47 USD"
                                                      const priceMatch =
                                                          hotel.pricePerNight.match(
                                                              /^([\d,]+\.?\d*)\s+([A-Z]{3})$/
                                                          );
                                                      if (priceMatch) {
                                                          const amount =
                                                              parseFloat(
                                                                  priceMatch[1].replace(
                                                                      /,/g,
                                                                      ''
                                                                  )
                                                              );
                                                          const currency =
                                                              priceMatch[2];
                                                          return formatCurrency(
                                                              convertToUserCurrencyAmount(
                                                                  amount,
                                                                  currency
                                                              ),
                                                              getUserPreferredCurrency()
                                                          );
                                                      }
                                                      return hotel.pricePerNight; // Fallback to original string
                                                  })()
                                                : 'Rate TBD'}
                                            /night
                                        </p>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                        {hotel.price &&
                                        hotel.price !== 'Price TBD'
                                            ? (() => {
                                                  // Parse price string like "444.94 USD"
                                                  const priceMatch =
                                                      hotel.price.match(
                                                          /^([\d,]+\.?\d*)\s+([A-Z]{3})$/
                                                      );
                                                  if (priceMatch) {
                                                      const amount = parseFloat(
                                                          priceMatch[1].replace(
                                                              /,/g,
                                                              ''
                                                          )
                                                      );
                                                      const currency =
                                                          priceMatch[2];
                                                      return formatCurrency(
                                                          convertToUserCurrencyAmount(
                                                              amount,
                                                              currency
                                                          ),
                                                          getUserPreferredCurrency()
                                                      );
                                                  }
                                                  return hotel.price; // Fallback to original string
                                              })()
                                            : 'Price TBD'}
                                    </p>
                                </td>
                                <td className="p-2 sm:p-4">
                                    {hotel.isBooked ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1">
                                            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                            <span className="hidden sm:inline">
                                                Booked
                                            </span>
                                            <span className="sm:hidden">✓</span>
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-slate-600 text-xs px-2 py-1"
                                        >
                                            <span className="hidden sm:inline">
                                                Available
                                            </span>
                                            <span className="sm:hidden">
                                                Open
                                            </span>
                                        </Badge>
                                    )}
                                </td>
                                <td className="p-2 sm:p-4 text-right">
                                    {!hotel.isBooked && (
                                        <button
                                            onClick={() => onRemove(hotel.id)}
                                            className="p-2 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors touch-manipulation"
                                            title="Remove hotel"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
