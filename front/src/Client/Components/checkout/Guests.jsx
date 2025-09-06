import React from 'react';
import { motion } from 'framer-motion';
import { Hotel } from 'lucide-react';
import { Button } from '../../../Client/Components/ui/button';
import { Input } from '../../../Client/Components/ui/input';
import { Label } from '../../../Client/Components/ui/label';

export default function Guests({
    enhancedHotels,
    bookingData,
    handleGuestChange,
    addGuest,
    removeGuest,
}) {
    if (enhancedHotels.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
        >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Hotel className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                    Hotel Guests
                </h2>
            </div>

            <div className="space-y-4">
                {bookingData.guests && bookingData.guests.length > 0 ? (
                    bookingData.guests.map((guest, index) => (
                        <div
                            key={index}
                            className="border border-slate-200 rounded-lg p-4 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-slate-800">
                                    Guest {index + 1}
                                </h3>
                                {bookingData.guests.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeGuest(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* First Name */}
                                <div className="space-y-2">
                                    <Label htmlFor={`guest-${index}-firstName`}>
                                        First Name *
                                    </Label>
                                    <Input
                                        id={`guest-${index}-firstName`}
                                        type="text"
                                        value={guest.firstName || ''}
                                        onChange={(e) =>
                                            handleGuestChange(
                                                index,
                                                'firstName',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter first name"
                                        className="w-full"
                                        required
                                    />
                                </div>

                                {/* Last Name */}
                                <div className="space-y-2">
                                    <Label htmlFor={`guest-${index}-lastName`}>
                                        Last Name *
                                    </Label>
                                    <Input
                                        id={`guest-${index}-lastName`}
                                        type="text"
                                        value={guest.lastName || ''}
                                        onChange={(e) =>
                                            handleGuestChange(
                                                index,
                                                'lastName',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter last name"
                                        className="w-full"
                                        required
                                    />
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <Label htmlFor={`guest-${index}-gender`}>
                                        Gender *
                                    </Label>
                                    <select
                                        id={`guest-${index}-gender`}
                                        value={guest.gender || ''}
                                        onChange={(e) =>
                                            handleGuestChange(
                                                index,
                                                'gender',
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select gender</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor={`guest-${index}-phone`}>
                                        Phone Number *
                                    </Label>
                                    <Input
                                        id={`guest-${index}-phone`}
                                        type="tel"
                                        value={guest.phone || ''}
                                        onChange={(e) =>
                                            handleGuestChange(
                                                index,
                                                'phone',
                                                e.target.value
                                            )
                                        }
                                        placeholder="+1234567890"
                                        className="w-full"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor={`guest-${index}-email`}>
                                        Email Address *
                                    </Label>
                                    <Input
                                        id={`guest-${index}-email`}
                                        type="email"
                                        value={guest.email || ''}
                                        onChange={(e) =>
                                            handleGuestChange(
                                                index,
                                                'email',
                                                e.target.value
                                            )
                                        }
                                        placeholder="guest@example.com"
                                        className="w-full"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <p>Click "Add Guest" to add hotel guest information</p>
                    </div>
                )}

                {/* Add Guest Button */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={addGuest}
                    className="w-full border-dashed border-2 border-slate-300 hover:border-teal-400 hover:bg-teal-50 text-slate-600 hover:text-teal-600"
                >
                    + Add Guest
                </Button>
            </div>

            {/* Auto-fill Helper Text */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                    <strong>💡 Tip:</strong> Guest information will be
                    auto-filled from your account details and passport
                    information when available.
                </p>
            </div>
        </motion.div>
    );
}
