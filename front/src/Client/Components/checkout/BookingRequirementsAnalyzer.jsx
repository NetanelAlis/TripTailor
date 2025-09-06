import { useEffect, useMemo } from 'react';

/**
 * Custom hook that analyzes booking requirements from all flights
 * and determines the unified set of required fields for passengers and contact info
 */
export function useBookingRequirementsAnalyzer(enhancedFlights) {
    // Analyze booking requirements from all flights
    const analyzeRequirements = () => {
        const allRequirements = {
            emailAddressRequired: false,
            mobilePhoneNumberRequired: false,
            homePhoneRequired: false,
            workPhoneRequired: false,
            alternateEmailRequired: false,
            emergencyContactRequired: false,
            emergencyContactPhoneRequired: false,
            travelerRequirements: [],
            maxTravelers: 0,
        };

        // Collect requirements from all flights
        enhancedFlights.forEach((flight) => {
            const pricingData = flight.pricingData;
            if (pricingData?.data?.flightOffers?.[0]?.travelerPricings) {
                const flightOffer = pricingData.data.flightOffers[0];

                // Check for shared requirements
                if (flightOffer.bookingRequirements) {
                    const bookingReq = flightOffer.bookingRequirements;

                    // Shared fields
                    if (bookingReq.emailAddressRequired) {
                        allRequirements.emailAddressRequired = true;
                    }
                    if (bookingReq.mobilePhoneNumberRequired) {
                        allRequirements.mobilePhoneNumberRequired = true;
                    }
                    if (bookingReq.homePhoneRequired) {
                        allRequirements.homePhoneRequired = true;
                    }
                    if (bookingReq.workPhoneRequired) {
                        allRequirements.workPhoneRequired = true;
                    }
                    if (bookingReq.alternateEmailRequired) {
                        allRequirements.alternateEmailRequired = true;
                    }
                    if (bookingReq.emergencyContactRequired) {
                        allRequirements.emergencyContactRequired = true;
                    }
                    if (bookingReq.emergencyContactPhoneRequired) {
                        allRequirements.emergencyContactPhoneRequired = true;
                    }

                    // Traveler-specific requirements
                    if (bookingReq.travelerRequirements) {
                        bookingReq.travelerRequirements.forEach(
                            (travelerReq, index) => {
                                // Ensure we have enough slots for travelers
                                if (
                                    !allRequirements.travelerRequirements[index]
                                ) {
                                    allRequirements.travelerRequirements[
                                        index
                                    ] = {};
                                }

                                // Merge requirements - if any flight requires a field, we require it
                                const currentReq =
                                    allRequirements.travelerRequirements[index];

                                // Map the booking requirements fields to our internal field names
                                if (travelerReq.genderRequired)
                                    currentReq.genderRequired = true;
                                if (travelerReq.dateOfBirthRequired)
                                    currentReq.dateOfBirthRequired = true;
                                if (travelerReq.redressRequiredIfAny)
                                    currentReq.redressRequiredIfAny = true;
                                if (travelerReq.residenceRequired)
                                    currentReq.residenceRequired = true;

                                // Assume basic fields are always required unless explicitly stated otherwise
                                currentReq.firstName = true; // First name is typically always required
                                currentReq.lastName = true; // Last name is typically always required

                                // Basic contact information - always required for booking
                                currentReq.emailRequired = true;
                                currentReq.phoneNumberRequired = true;
                                currentReq.nationalIdRequired = true;

                                // For nationality and documents, check if they're explicitly required
                                if (travelerReq.nationalityRequired !== false)
                                    currentReq.nationalityRequired = true;
                                if (travelerReq.documentRequired !== false)
                                    currentReq.documentRequired = true;
                            }
                        );

                        // Update max travelers count
                        allRequirements.maxTravelers = Math.max(
                            allRequirements.maxTravelers,
                            bookingReq.travelerRequirements.length
                        );
                    }
                }

                // Fallback: if no bookingRequirements, infer from travelerPricings length
                const travelerCount = flightOffer.travelerPricings?.length || 1;
                allRequirements.maxTravelers = Math.max(
                    allRequirements.maxTravelers,
                    travelerCount
                );

                // If no specific requirements, assume basic fields are required
                if (
                    !flightOffer.bookingRequirements &&
                    allRequirements.travelerRequirements.length === 0
                ) {
                    for (let i = 0; i < travelerCount; i++) {
                        if (!allRequirements.travelerRequirements[i]) {
                            allRequirements.travelerRequirements[i] = {
                                firstName: true,
                                lastName: true,
                                genderRequired: true,
                                dateOfBirthRequired: true,
                                nationalityRequired: true,
                                documentRequired: true,
                                emailRequired: true,
                                phoneNumberRequired: true,
                                nationalIdRequired: true,
                            };
                        }
                    }
                }
            }
        });

        // If we have flights but no specific requirements, assume at least 1 traveler
        if (enhancedFlights.length > 0 && allRequirements.maxTravelers === 0) {
            allRequirements.maxTravelers = 1;
            allRequirements.travelerRequirements[0] = {
                firstName: true,
                lastName: true,
                genderRequired: true,
                dateOfBirthRequired: true,
                nationalityRequired: true,
                documentRequired: true,
                emailRequired: true,
                phoneNumberRequired: true,
                nationalIdRequired: true,
            };
        }

        return allRequirements;
    };

    const requirements = useMemo(
        () => analyzeRequirements(),
        [enhancedFlights]
    );

    const requiredSharedFields = useMemo(
        () => ({
            emailAddressRequired: requirements.emailAddressRequired,
            mobilePhoneNumberRequired: requirements.mobilePhoneNumberRequired,
            homePhoneRequired: requirements.homePhoneRequired,
            workPhoneRequired: requirements.workPhoneRequired,
            alternateEmailRequired: requirements.alternateEmailRequired,
            emergencyContactRequired: requirements.emergencyContactRequired,
            emergencyContactPhoneRequired:
                requirements.emergencyContactPhoneRequired,
        }),
        [requirements]
    );

    const requiredPassengerFields = useMemo(
        () => requirements.travelerRequirements,
        [requirements]
    );

    return useMemo(
        () => ({
            requirements,
            numberOfPassengers: requirements.maxTravelers,
            requiredPassengerFields,
            requiredSharedFields,
        }),
        [requirements, requiredPassengerFields, requiredSharedFields]
    );
}

// Legacy component export for backward compatibility (though it shouldn't be used)
export default function BookingRequirementsAnalyzer({ enhancedFlights }) {
    console.warn(
        'BookingRequirementsAnalyzer is deprecated. Use useBookingRequirementsAnalyzer hook instead.'
    );
    return null;
}

// Export the analysis function for use in other components
export { BookingRequirementsAnalyzer };
