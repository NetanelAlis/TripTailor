import React from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '../../../Client/Components/ui/input';
import { Label } from '../../../Client/Components/ui/label';
import CountrySelector from '../../../Client/Components/ui/country-selector.jsx';

export default function ContactInformation({
    bookingData,
    handleInputChange,
    requiredSharedFields = {},
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
        >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                    Contact Information
                </h2>
            </div>

            {/* Email and Phone in a side-by-side layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Email Address - Always shown */}
                <div className="space-y-2">
                    <Label
                        htmlFor="email"
                        className="flex items-center gap-2 text-sm"
                    >
                        <Mail className="w-4 h-4 text-slate-500" />
                        Email Address
                        {requiredSharedFields.emailAddressRequired ? ' *' : ''}
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={bookingData.contactEmail}
                        onChange={(e) =>
                            handleInputChange('contactEmail', e.target.value)
                        }
                        placeholder="your@email.com"
                        className="text-base"
                    />
                </div>

                {/* Phone Number - Always shown */}
                <div className="space-y-2">
                    <Label
                        htmlFor="phone"
                        className="flex items-center gap-2 text-sm"
                    >
                        <Phone className="w-4 h-4 text-slate-500" />
                        Phone Number
                        {requiredSharedFields.mobilePhoneNumberRequired
                            ? ' *'
                            : ''}
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        value={bookingData.contactPhone}
                        onChange={(e) =>
                            handleInputChange('contactPhone', e.target.value)
                        }
                        placeholder="+1 (555) 123-4567"
                        className="text-base"
                    />
                </div>
            </div>

            {/* Address Information */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <h3 className="font-medium text-slate-700">
                        Address Information
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="street" className="text-sm">
                            Street Address
                        </Label>
                        <Input
                            id="street"
                            type="text"
                            value={bookingData.contactStreet || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactStreet',
                                    e.target.value
                                )
                            }
                            placeholder="123 Main Street"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm">
                            City
                        </Label>
                        <Input
                            id="city"
                            type="text"
                            value={bookingData.contactCity || ''}
                            onChange={(e) =>
                                handleInputChange('contactCity', e.target.value)
                            }
                            placeholder="New York"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm">
                            State/Province
                        </Label>
                        <Input
                            id="state"
                            type="text"
                            value={bookingData.contactState || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactState',
                                    e.target.value
                                )
                            }
                            placeholder="NY"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm">
                            Postal Code
                        </Label>
                        <Input
                            id="postalCode"
                            type="text"
                            value={bookingData.contactPostalCode || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactPostalCode',
                                    e.target.value
                                )
                            }
                            placeholder="10001"
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="country" className="text-sm">
                            Country
                        </Label>
                        <CountrySelector
                            value={bookingData.contactCountry || ''}
                            onChange={(value) =>
                                handleInputChange('contactCountry', value)
                            }
                            placeholder="Select country"
                        />
                    </div>
                </div>
            </div>

            {/* Additional contact fields from booking requirements - stacked vertically */}
            <div className="space-y-4">
                {requiredSharedFields.homePhoneRequired && (
                    <div className="space-y-2">
                        <Label className="text-sm">Home Phone Number *</Label>
                        <Input
                            type="tel"
                            value={bookingData.contactHomePhone || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactHomePhone',
                                    e.target.value
                                )
                            }
                            placeholder="+1 (555) 123-4567"
                            className="text-base"
                        />
                    </div>
                )}

                {requiredSharedFields.workPhoneRequired && (
                    <div className="space-y-2">
                        <Label className="text-sm">Work Phone Number *</Label>
                        <Input
                            type="tel"
                            value={bookingData.contactWorkPhone || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactWorkPhone',
                                    e.target.value
                                )
                            }
                            placeholder="+1 (555) 123-4567"
                            className="text-base"
                        />
                    </div>
                )}

                {requiredSharedFields.alternateEmailRequired && (
                    <div className="space-y-2">
                        <Label className="text-sm">
                            Alternate Email Address *
                        </Label>
                        <Input
                            type="email"
                            value={bookingData.contactAlternateEmail || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'contactAlternateEmail',
                                    e.target.value
                                )
                            }
                            placeholder="alternate@email.com"
                            className="text-base"
                        />
                    </div>
                )}

                {requiredSharedFields.emergencyContactRequired && (
                    <div className="space-y-2">
                        <Label className="text-sm">
                            Emergency Contact Name *
                        </Label>
                        <Input
                            type="text"
                            value={bookingData.emergencyContactName || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'emergencyContactName',
                                    e.target.value
                                )
                            }
                            placeholder="Emergency contact name"
                            className="text-base"
                        />
                    </div>
                )}

                {requiredSharedFields.emergencyContactPhoneRequired && (
                    <div className="space-y-2">
                        <Label className="text-sm">
                            Emergency Contact Phone *
                        </Label>
                        <Input
                            type="tel"
                            value={bookingData.emergencyContactPhone || ''}
                            onChange={(e) =>
                                handleInputChange(
                                    'emergencyContactPhone',
                                    e.target.value
                                )
                            }
                            placeholder="+1 (555) 123-4567"
                            className="text-base"
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
