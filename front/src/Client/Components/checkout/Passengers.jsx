import React from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { Button } from '../../../Client/Components/ui/button';
import { Input } from '../../../Client/Components/ui/input';
import { Label } from '../../../Client/Components/ui/label';
import CountrySelector from '../../../Client/Components/ui/country-selector.jsx';

export default function Passengers({
    enhancedFlights,
    bookingData,
    handlePassengerChange,
    addPassenger,
    numberOfPassengers = 0,
    requiredPassengerFields = [],
}) {
    if (enhancedFlights.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
        >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                    <Plane className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                    Passengers ({numberOfPassengers})
                </h2>
            </div>

            <div className="space-y-4">
                {bookingData.passengers
                    .slice(0, numberOfPassengers)
                    .map((passenger, index) => {
                        const passengerRequirements =
                            requiredPassengerFields[index] || {};

                        return (
                            <div
                                key={index}
                                className="border border-slate-200 rounded-lg p-4 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-slate-800">
                                        Passenger {index + 1}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Render only required fields */}
                                    {passengerRequirements.firstName !==
                                        false && (
                                        <div className="space-y-2">
                                            <Label>First Name *</Label>
                                            <Input
                                                value={passenger.firstName}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'firstName',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="John"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.lastName !==
                                        false && (
                                        <div className="space-y-2">
                                            <Label>Last Name *</Label>
                                            <Input
                                                value={passenger.lastName}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'lastName',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Doe"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.middleName && (
                                        <div className="space-y-2">
                                            <Label>Middle Name</Label>
                                            <Input
                                                value={passenger.middleName}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'middleName',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Middle name (optional)"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.dateOfBirthRequired && (
                                        <div className="space-y-2">
                                            <Label>Date of Birth *</Label>
                                            <Input
                                                type="date"
                                                value={passenger.dateOfBirth}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'dateOfBirth',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.genderRequired && (
                                        <div className="space-y-2">
                                            <Label>Gender *</Label>
                                            <select
                                                value={passenger.gender}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'gender',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">
                                                    Select Gender
                                                </option>
                                                <option value="MALE">
                                                    Male
                                                </option>
                                                <option value="FEMALE">
                                                    Female
                                                </option>
                                                <option value="OTHER">
                                                    Other
                                                </option>
                                                <option value="PREFER_NOT_TO_SAY">
                                                    Prefer not to say
                                                </option>
                                            </select>
                                        </div>
                                    )}
                                    {passengerRequirements.nationalityRequired && (
                                        <div className="space-y-2">
                                            <Label>Nationality *</Label>
                                            <CountrySelector
                                                value={passenger.nationality}
                                                onChange={(value) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'nationality',
                                                        value
                                                    )
                                                }
                                                placeholder="Select nationality"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.emailRequired && (
                                        <div className="space-y-2">
                                            <Label>Email *</Label>
                                            <Input
                                                type="email"
                                                value={passenger.email}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'email',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="john.doe@example.com"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.phoneNumberRequired && (
                                        <div className="space-y-2">
                                            <Label>Phone Number *</Label>
                                            <Input
                                                value={passenger.phoneNumber}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'phoneNumber',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="+972501234567"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.nationalIdRequired && (
                                        <div className="space-y-2">
                                            <Label>National ID *</Label>
                                            <Input
                                                value={passenger.nationalId}
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'nationalId',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="123456789"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.documentRequired && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Passport Number</Label>
                                                <Input
                                                    value={
                                                        passenger.passportNumber
                                                    }
                                                    onChange={(e) =>
                                                        handlePassengerChange(
                                                            index,
                                                            'passportNumber',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="A12345678"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    Passport Expiry Date
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={
                                                        passenger.passportExpiryDate
                                                    }
                                                    onChange={(e) =>
                                                        handlePassengerChange(
                                                            index,
                                                            'passportExpiryDate',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    Passport Issuance Location
                                                </Label>
                                                <Input
                                                    value={
                                                        passenger.passportIssuanceLocation
                                                    }
                                                    onChange={(e) =>
                                                        handlePassengerChange(
                                                            index,
                                                            'passportIssuanceLocation',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Tel Aviv"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    Passport Issuance Country
                                                </Label>
                                                <CountrySelector
                                                    value={
                                                        passenger.passportIssuanceCountry
                                                    }
                                                    onChange={(value) =>
                                                        handlePassengerChange(
                                                            index,
                                                            'passportIssuanceCountry',
                                                            value
                                                        )
                                                    }
                                                    placeholder="Select issuance country"
                                                />
                                            </div>
                                        </>
                                    )}
                                    {passengerRequirements.redressRequiredIfAny && (
                                        <div className="space-y-2">
                                            <Label>Redress Number</Label>
                                            <Input
                                                value={
                                                    passenger.redressNumber ||
                                                    ''
                                                }
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'redressNumber',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Redress number (if applicable)"
                                            />
                                        </div>
                                    )}
                                    {passengerRequirements.residenceRequired && (
                                        <div className="space-y-2">
                                            <Label>Residence Country</Label>
                                            <Input
                                                value={
                                                    passenger.residenceCountry ||
                                                    ''
                                                }
                                                onChange={(e) =>
                                                    handlePassengerChange(
                                                        index,
                                                        'residenceCountry',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Country of residence"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </motion.div>
    );
}
