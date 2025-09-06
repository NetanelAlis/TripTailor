import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Components/ui/button.jsx';
import { Input } from '../Components/ui/input.jsx';
import { Label } from '../Components/ui/label.jsx';
import { Badge } from '../Components/ui/badge.jsx';
import CountrySelector from '../Components/ui/country-selector.jsx';
import {
    User as UserIcon,
    Mail,
    Phone,
    CreditCard,
    Calendar,
    Users,
    Edit3,
    Save,
    X,
    Check,
    MapPin,
    Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAvailableCurrencies } from '../utils/currencyConverter.js';
import { updateUserDetails, fetchUserDetails } from '../../api/userApi.js';

export default function AccountPage() {
    const [user, setUser] = useState(null);
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingEmergency, setIsEditingEmergency] = useState(false);
    const [editedData, setEditedData] = useState({});
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    // Helper function to check if a field has a meaningful value
    const hasValue = (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'boolean') return true; // boolean values are considered valid
        return true;
    };

    useEffect(() => {
        const loadUser = async () => {
            try {
                // Get user details from localStorage (our existing auth system)
                const userDetails = localStorage.getItem('userDetails');
                if (!userDetails) {
                    navigate('/');
                    return;
                }

                // Try to fetch fresh data from the backend first
                try {
                    const response = await fetchUserDetails();
                    const freshUserData = response.user_data;

                    // Merge with existing localStorage data to preserve auth info
                    const existingUserData = JSON.parse(userDetails);
                    const mergedUserData = {
                        ...existingUserData,
                        ...freshUserData,
                    };

                    setUser(mergedUserData);
                    setEditedData({
                        full_name: mergedUserData.full_name || '',
                        phone_number: mergedUserData.phone_number || '',
                        passport_name: mergedUserData.passport_name || '',
                        date_of_birth: mergedUserData.date_of_birth || '',
                        gender: mergedUserData.gender || '',
                        nationality: mergedUserData.nationality || '',
                        national_id: mergedUserData.national_id || '',
                        passport_number: mergedUserData.passport_number || '',
                        passport_expiry_date:
                            mergedUserData.passport_expiry_date || '',
                        passport_issuance_location:
                            mergedUserData.passport_issuance_location || '',
                        passport_issuance_country:
                            mergedUserData.passport_issuance_country || '',
                        preferred_currency:
                            mergedUserData.preferred_currency || 'USD',
                        location_permission:
                            mergedUserData.location_permission || false,
                        location_data: mergedUserData.location_data || null,
                        emergency_contact: mergedUserData.emergency_contact || {
                            name: '',
                            phone: '',
                            relationship: '',
                        },
                        address: mergedUserData.address || {
                            street: '',
                            city: '',
                            state: '',
                            postal_code: '',
                            country: '',
                        },
                    });

                    // Update localStorage with fresh data
                    localStorage.setItem(
                        'userDetails',
                        JSON.stringify(mergedUserData)
                    );
                } catch (fetchError) {
                    console.warn(
                        'Failed to fetch fresh user data, using localStorage:',
                        fetchError
                    );

                    // Fallback to localStorage data
                    const userData = JSON.parse(userDetails);
                    setUser(userData);
                    setEditedData({
                        full_name: userData.full_name || '',
                        phone_number: userData.phone_number || '',
                        passport_name: userData.passport_name || '',
                        date_of_birth: userData.date_of_birth || '',
                        gender: userData.gender || '',
                        nationality: userData.nationality || '',
                        national_id: userData.national_id || '',
                        passport_number: userData.passport_number || '',
                        passport_expiry_date:
                            userData.passport_expiry_date || '',
                        passport_issuance_location:
                            userData.passport_issuance_location || '',
                        passport_issuance_country:
                            userData.passport_issuance_country || '',
                        preferred_currency:
                            userData.preferred_currency || 'USD',
                        location_permission:
                            userData.location_permission || false,
                        location_data: userData.location_data || null,
                        emergency_contact: userData.emergency_contact || {
                            name: '',
                            phone: '',
                            relationship: '',
                        },
                        address: userData.address || {
                            street: '',
                            city: '',
                            state: '',
                            postal_code: '',
                            country: '',
                        },
                    });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                navigate('/');
            }
        };
        loadUser();
    }, [navigate]);

    const handleInputChange = (field, value) => {
        if (field.startsWith('emergency_')) {
            const emergencyField = field.replace('emergency_', '');
            setEditedData((prev) => ({
                ...prev,
                emergency_contact: {
                    ...prev.emergency_contact,
                    [emergencyField]: value,
                },
            }));
        } else {
            setEditedData((prev) => ({ ...prev, [field]: value }));
        }
    };

    const handleSavePersonal = async () => {
        setSaving(true);
        try {
            // Prepare update data for personal information section
            const personalUpdateData = {
                full_name: editedData.full_name,
                phone_number: editedData.phone_number,
                passport_name: editedData.passport_name,
                date_of_birth: editedData.date_of_birth,
                gender: editedData.gender,
                nationality: editedData.nationality,
                national_id: editedData.national_id,
                passport_number: editedData.passport_number,
                passport_expiry_date: editedData.passport_expiry_date,
                passport_issuance_location:
                    editedData.passport_issuance_location,
                passport_issuance_country: editedData.passport_issuance_country,
                address: editedData.address,
            };

            // Remove undefined/null values
            const cleanUpdateData = Object.fromEntries(
                Object.entries(personalUpdateData).filter(
                    ([_, value]) =>
                        value !== undefined && value !== null && value !== ''
                )
            );

            // Call the lambda to update user details
            await updateUserDetails(cleanUpdateData);

            // Update local state and localStorage
            const updatedUser = { ...user, ...cleanUpdateData };
            localStorage.setItem('userDetails', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setIsEditingPersonal(false);

            alert('Personal information updated successfully!');
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEmergency = async () => {
        setSaving(true);
        try {
            // Prepare update data for emergency contact section
            const emergencyUpdateData = {
                emergency_contact: {
                    name: editedData.emergency_contact.name,
                    phone: editedData.emergency_contact.phone,
                    relationship: editedData.emergency_contact.relationship,
                },
            };

            // Remove empty values from emergency contact
            const cleanEmergencyContact = {};
            Object.entries(emergencyUpdateData.emergency_contact).forEach(
                ([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        cleanEmergencyContact[key] = value;
                    }
                }
            );

            // Only update if there are valid emergency contact fields
            if (Object.keys(cleanEmergencyContact).length > 0) {
                emergencyUpdateData.emergency_contact = cleanEmergencyContact;

                // Call the lambda to update user details
                await updateUserDetails(emergencyUpdateData);

                // Update local state and localStorage
                const updatedUser = {
                    ...user,
                    emergency_contact: cleanEmergencyContact,
                };
                localStorage.setItem(
                    'userDetails',
                    JSON.stringify(updatedUser)
                );
                setUser(updatedUser);
            }

            setIsEditingEmergency(false);
            alert('Emergency contact updated successfully!');
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleLocationPermissionChange = async (checked) => {
        if (checked) {
            // Request location permission and capture coordinates
            if ('geolocation' in navigator) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            resolve,
                            reject,
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 300000, // 5 minutes
                            }
                        );
                    });

                    const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString(),
                    };

                    // Update edited data with location permission and coordinates
                    setEditedData((prev) => ({
                        ...prev,
                        location_permission: true,
                        location_data: locationData,
                    }));

                    console.log('Location captured:', locationData);
                } catch (error) {
                    console.error('Error getting location:', error);
                    alert(
                        'Unable to access location. Please check your browser settings and try again.'
                    );

                    // Keep permission as false if location access failed
                    setEditedData((prev) => ({
                        ...prev,
                        location_permission: false,
                        location_data: null,
                    }));
                }
            } else {
                alert('Geolocation is not supported by this browser.');
                setEditedData((prev) => ({
                    ...prev,
                    location_permission: false,
                    location_data: null,
                }));
            }
        } else {
            // User unchecked location permission
            setEditedData((prev) => ({
                ...prev,
                location_permission: false,
                location_data: null,
            }));
        }
    };

    const handleSaveSystem = async () => {
        setSaving(true);
        try {
            // Prepare update data for system settings section
            const systemUpdateData = {
                preferred_currency: editedData.preferred_currency,
                location_permission: editedData.location_permission,
            };

            // Add location data if permission is granted and data exists
            if (editedData.location_permission && editedData.location_data) {
                systemUpdateData.location_data = editedData.location_data;
            }

            // Remove undefined/null values
            const cleanUpdateData = Object.fromEntries(
                Object.entries(systemUpdateData).filter(
                    ([_, value]) => value !== undefined && value !== null
                )
            );

            // Call the lambda to update user details
            await updateUserDetails(cleanUpdateData);

            // Update local state and localStorage
            const updatedUser = { ...user, ...cleanUpdateData };
            localStorage.setItem('userDetails', JSON.stringify(updatedUser));
            setUser(updatedUser);

            alert('System settings updated successfully!');
        } catch (error) {
            console.error('Error updating user data:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelPersonal = () => {
        setEditedData({
            ...editedData,
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            passport_name: user.passport_name || '',
            date_of_birth: user.date_of_birth || '',
            gender: user.gender || '',
            nationality: user.nationality || '',
        });
        setIsEditingPersonal(false);
    };

    const handleCancelEmergency = () => {
        setEditedData({
            ...editedData,
            emergency_contact: user.emergency_contact || {
                name: '',
                phone: '',
                relationship: '',
            },
        });
        setIsEditingEmergency(false);
    };

    const availableCurrencies = getAvailableCurrencies();
    const currencies = Object.entries(availableCurrencies).map(
        ([code, info]) => ({
            value: code,
            label: `${code} - ${info.name}`,
            symbol: info.symbol,
        })
    );

    if (!user) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-600">Loading your account...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-blue-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            My Account
                        </h1>
                        <p className="text-slate-600">
                            Manage your travel preferences and personal
                            information
                        </p>
                    </div>
                </motion.div>

                {/* Account Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-200">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800">
                                Account Settings
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage your personal information, emergency
                                contacts, and system preferences
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Personal Information */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" />
                                    Personal Information
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="flex items-center gap-2"
                                    >
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            type="email"
                                            value={user.email}
                                            disabled
                                            className="bg-slate-50"
                                        />
                                        <Badge
                                            variant="secondary"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                                        >
                                            Verified
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Full Name</Label>
                                    <Input
                                        id="full_name"
                                        value={
                                            isEditingPersonal
                                                ? editedData.full_name
                                                : user.full_name || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'full_name',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? 'Enter your full name'
                                                : 'Add your full name'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="phone_number"
                                        className="flex items-center gap-2"
                                    >
                                        <Phone className="w-4 h-4 text-slate-500" />
                                        International Phone Number
                                    </Label>
                                    <Input
                                        id="phone_number"
                                        type="tel"
                                        value={
                                            isEditingPersonal
                                                ? editedData.phone_number
                                                : user.phone_number || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'phone_number',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? '+1 (555) 123-4567'
                                                : 'Add your international phone number'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passport_name">
                                        Passport Name
                                    </Label>
                                    <Input
                                        id="passport_name"
                                        value={
                                            isEditingPersonal
                                                ? editedData.passport_name
                                                : user.passport_name || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'passport_name',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? 'Enter your passport name'
                                                : 'Add your passport name'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date_of_birth">
                                        Date of Birth
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        value={
                                            isEditingPersonal
                                                ? editedData.date_of_birth
                                                : user.date_of_birth || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'date_of_birth',
                                                e.target.value
                                            )
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    {isEditingPersonal ? (
                                        <select
                                            value={editedData.gender || ''}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    'gender',
                                                    e.target.value
                                                )
                                            }
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="">
                                                Select Gender
                                            </option>
                                            <option value="male">Male</option>
                                            <option value="female">
                                                Female
                                            </option>
                                            <option value="other">Other</option>
                                            <option value="prefer_not_to_say">
                                                Prefer not to say
                                            </option>
                                        </select>
                                    ) : (
                                        <Input
                                            value={
                                                user.gender || 'Not specified'
                                            }
                                            disabled
                                            className="bg-slate-50"
                                        />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="nationality">
                                        Nationality
                                    </Label>
                                    {isEditingPersonal ? (
                                        <CountrySelector
                                            value={editedData.nationality}
                                            onChange={(value) =>
                                                handleInputChange(
                                                    'nationality',
                                                    value
                                                )
                                            }
                                            placeholder="Select nationality"
                                        />
                                    ) : (
                                        <Input
                                            value={
                                                user.nationality ||
                                                'Not specified'
                                            }
                                            disabled
                                            className="bg-slate-50"
                                        />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="national_id">
                                        National ID
                                    </Label>
                                    <Input
                                        id="national_id"
                                        value={
                                            isEditingPersonal
                                                ? editedData.national_id
                                                : user.national_id || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'national_id',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? 'Enter your national ID'
                                                : 'Add your national ID'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passport_number">
                                        Passport Number
                                    </Label>
                                    <Input
                                        id="passport_number"
                                        value={
                                            isEditingPersonal
                                                ? editedData.passport_number
                                                : user.passport_number || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'passport_number',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? 'Enter your passport number'
                                                : 'Add your passport number'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passport_expiry_date">
                                        Passport Expiry Date
                                    </Label>
                                    <Input
                                        id="passport_expiry_date"
                                        type="date"
                                        value={
                                            isEditingPersonal
                                                ? editedData.passport_expiry_date
                                                : user.passport_expiry_date ||
                                                  ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'passport_expiry_date',
                                                e.target.value
                                            )
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passport_issuance_location">
                                        Passport Issuance Location
                                    </Label>
                                    <Input
                                        id="passport_issuance_location"
                                        value={
                                            isEditingPersonal
                                                ? editedData.passport_issuance_location
                                                : user.passport_issuance_location ||
                                                  ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'passport_issuance_location',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingPersonal
                                                ? 'Enter passport issuance location'
                                                : 'Add passport issuance location'
                                        }
                                        disabled={!isEditingPersonal}
                                        className={
                                            !isEditingPersonal
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passport_issuance_country">
                                        Passport Issuance Country
                                    </Label>
                                    {isEditingPersonal ? (
                                        <CountrySelector
                                            value={
                                                editedData.passport_issuance_country
                                            }
                                            onChange={(value) =>
                                                handleInputChange(
                                                    'passport_issuance_country',
                                                    value
                                                )
                                            }
                                            placeholder="Select issuance country"
                                        />
                                    ) : (
                                        <Input
                                            value={
                                                user.passport_issuance_country ||
                                                'Not specified'
                                            }
                                            disabled
                                            className="bg-slate-50"
                                        />
                                    )}
                                </div>

                                {/* Address Information */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-slate-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Address Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="address_street">
                                                Street Address
                                            </Label>
                                            <Input
                                                id="address_street"
                                                value={
                                                    isEditingPersonal
                                                        ? editedData.address
                                                              ?.street || ''
                                                        : user.address
                                                              ?.street || ''
                                                }
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'address',
                                                        {
                                                            ...editedData.address,
                                                            street: e.target
                                                                .value,
                                                        }
                                                    )
                                                }
                                                placeholder={
                                                    isEditingPersonal
                                                        ? 'Enter street address'
                                                        : 'Add street address'
                                                }
                                                disabled={!isEditingPersonal}
                                                className={
                                                    !isEditingPersonal
                                                        ? 'bg-slate-50'
                                                        : ''
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address_city">
                                                City
                                            </Label>
                                            <Input
                                                id="address_city"
                                                value={
                                                    isEditingPersonal
                                                        ? editedData.address
                                                              ?.city || ''
                                                        : user.address?.city ||
                                                          ''
                                                }
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'address',
                                                        {
                                                            ...editedData.address,
                                                            city: e.target
                                                                .value,
                                                        }
                                                    )
                                                }
                                                placeholder={
                                                    isEditingPersonal
                                                        ? 'Enter city'
                                                        : 'Add city'
                                                }
                                                disabled={!isEditingPersonal}
                                                className={
                                                    !isEditingPersonal
                                                        ? 'bg-slate-50'
                                                        : ''
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address_state">
                                                State/Province
                                            </Label>
                                            <Input
                                                id="address_state"
                                                value={
                                                    isEditingPersonal
                                                        ? editedData.address
                                                              ?.state || ''
                                                        : user.address?.state ||
                                                          ''
                                                }
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'address',
                                                        {
                                                            ...editedData.address,
                                                            state: e.target
                                                                .value,
                                                        }
                                                    )
                                                }
                                                placeholder={
                                                    isEditingPersonal
                                                        ? 'Enter state/province'
                                                        : 'Add state/province'
                                                }
                                                disabled={!isEditingPersonal}
                                                className={
                                                    !isEditingPersonal
                                                        ? 'bg-slate-50'
                                                        : ''
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address_postal_code">
                                                Postal Code
                                            </Label>
                                            <Input
                                                id="address_postal_code"
                                                value={
                                                    isEditingPersonal
                                                        ? editedData.address
                                                              ?.postal_code ||
                                                          ''
                                                        : user.address
                                                              ?.postal_code ||
                                                          ''
                                                }
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'address',
                                                        {
                                                            ...editedData.address,
                                                            postal_code:
                                                                e.target.value,
                                                        }
                                                    )
                                                }
                                                placeholder={
                                                    isEditingPersonal
                                                        ? 'Enter postal code'
                                                        : 'Add postal code'
                                                }
                                                disabled={!isEditingPersonal}
                                                className={
                                                    !isEditingPersonal
                                                        ? 'bg-slate-50'
                                                        : ''
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="address_country">
                                                Country
                                            </Label>
                                            {isEditingPersonal ? (
                                                <CountrySelector
                                                    value={
                                                        editedData.address
                                                            ?.country
                                                    }
                                                    onChange={(value) =>
                                                        handleInputChange(
                                                            'address',
                                                            {
                                                                ...editedData.address,
                                                                country: value,
                                                            }
                                                        )
                                                    }
                                                    placeholder="Select country"
                                                />
                                            ) : (
                                                <Input
                                                    value={
                                                        user.address?.country ||
                                                        'Not specified'
                                                    }
                                                    disabled
                                                    className="bg-slate-50"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information Buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                                {!isEditingPersonal ? (
                                    <Button
                                        onClick={() =>
                                            setIsEditingPersonal(true)
                                        }
                                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                                        size="sm"
                                    >
                                        <Edit3 className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            Edit
                                        </span>
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={handleCancelPersonal}
                                            size="sm"
                                        >
                                            <X className="w-4 h-4 sm:mr-2" />
                                            <span className="hidden sm:inline">
                                                Cancel
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={handleSavePersonal}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                                            size="sm"
                                        >
                                            {saving ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full sm:mr-2" />
                                            ) : (
                                                <Save className="w-4 h-4 sm:mr-2" />
                                            )}
                                            <span className="hidden sm:inline">
                                                Save
                                            </span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <hr className="border-slate-200" />

                        {/* Emergency Contact */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Emergency Contact
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_name">
                                        Contact Name
                                    </Label>
                                    <Input
                                        id="emergency_name"
                                        value={
                                            isEditingEmergency
                                                ? editedData.emergency_contact
                                                      .name
                                                : user.emergency_contact
                                                      ?.name || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'emergency_name',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingEmergency
                                                ? 'Emergency contact name'
                                                : 'Add emergency contact'
                                        }
                                        disabled={!isEditingEmergency}
                                        className={
                                            !isEditingEmergency
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_phone">
                                        Contact Phone
                                    </Label>
                                    <Input
                                        id="emergency_phone"
                                        type="tel"
                                        value={
                                            isEditingEmergency
                                                ? editedData.emergency_contact
                                                      .phone
                                                : user.emergency_contact
                                                      ?.phone || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'emergency_phone',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingEmergency
                                                ? 'Emergency contact phone'
                                                : 'Add contact phone'
                                        }
                                        disabled={!isEditingEmergency}
                                        className={
                                            !isEditingEmergency
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_relationship">
                                        Relationship
                                    </Label>
                                    <Input
                                        id="emergency_relationship"
                                        value={
                                            isEditingEmergency
                                                ? editedData.emergency_contact
                                                      .relationship
                                                : user.emergency_contact
                                                      ?.relationship || ''
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'emergency_relationship',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            isEditingEmergency
                                                ? 'e.g., Spouse, Parent'
                                                : 'Add relationship'
                                        }
                                        disabled={!isEditingEmergency}
                                        className={
                                            !isEditingEmergency
                                                ? 'bg-slate-50'
                                                : ''
                                        }
                                    />
                                </div>
                            </div>

                            {/* Emergency Contact Buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                                {!isEditingEmergency ? (
                                    <Button
                                        onClick={() =>
                                            setIsEditingEmergency(true)
                                        }
                                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                                        size="sm"
                                    >
                                        <Edit3 className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            Edit
                                        </span>
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={handleCancelEmergency}
                                            size="sm"
                                        >
                                            <X className="w-4 h-4 sm:mr-2" />
                                            <span className="hidden sm:inline">
                                                Cancel
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={handleSaveEmergency}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                                            size="sm"
                                        >
                                            {saving ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full sm:mr-2" />
                                            ) : (
                                                <Save className="w-4 h-4 sm:mr-2" />
                                            )}
                                            <span className="hidden sm:inline">
                                                Save
                                            </span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <hr className="border-slate-200" />

                        {/* System Settings */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    System Settings
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="preferred_currency"
                                        className="flex items-center gap-2"
                                    >
                                        <CreditCard className="w-4 h-4 text-slate-500" />
                                        Preferred Currency
                                    </Label>
                                    <select
                                        value={
                                            editedData.preferred_currency ||
                                            user.preferred_currency ||
                                            'USD'
                                        }
                                        onChange={(e) =>
                                            handleInputChange(
                                                'preferred_currency',
                                                e.target.value
                                            )
                                        }
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {currencies.map((currency) => (
                                            <option
                                                key={currency.value}
                                                value={currency.value}
                                            >
                                                {currency.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="location_permission"
                                            checked={
                                                editedData.location_permission !==
                                                undefined
                                                    ? editedData.location_permission
                                                    : user.location_permission ||
                                                      false
                                            }
                                            onChange={(e) =>
                                                handleLocationPermissionChange(
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label
                                            htmlFor="location_permission"
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <MapPin className="w-4 h-4 text-slate-500" />
                                            Allow Location Access
                                        </Label>
                                    </div>
                                    <p className="text-xs text-slate-500 ml-6">
                                        Enable location services for
                                        personalized travel recommendations
                                    </p>
                                </div>
                            </div>

                            {/* System Settings Buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    onClick={handleSaveSystem}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                                    size="sm"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full sm:mr-2" />
                                    ) : (
                                        <Save className="w-4 h-4 sm:mr-2" />
                                    )}
                                    <span className="hidden sm:inline">
                                        Save
                                    </span>
                                </Button>
                            </div>
                        </div>

                        {/* Profile Completion Status */}
                        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-slate-800">
                                        Profile Completion
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                        Complete your profile for faster
                                        bookings
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        // Define all profile fields to check
                                        const personalFields = [
                                            user.full_name,
                                            user.phone_number,
                                            user.passport_name,
                                            user.date_of_birth,
                                            user.gender,
                                            user.nationality,
                                            user.national_id,
                                            user.passport_number,
                                            user.passport_expiry_date,
                                            user.passport_issuance_location,
                                            user.passport_issuance_country,
                                        ];

                                        const addressFields = user.address
                                            ? [
                                                  user.address.street,
                                                  user.address.city,
                                                  user.address.state,
                                                  user.address.postal_code,
                                                  user.address.country,
                                              ]
                                            : [];

                                        const emergencyFields =
                                            user.emergency_contact
                                                ? [
                                                      user.emergency_contact
                                                          .name,
                                                      user.emergency_contact
                                                          .phone,
                                                      user.emergency_contact
                                                          .relationship,
                                                  ]
                                                : [];

                                        const allFields = [
                                            ...personalFields,
                                            ...addressFields,
                                            ...emergencyFields,
                                        ];

                                        const completedFields =
                                            allFields.filter(hasValue).length;
                                        const totalFields = allFields.length;
                                        const percentage =
                                            totalFields > 0
                                                ? Math.round(
                                                      (completedFields /
                                                          totalFields) *
                                                          100
                                                  )
                                                : 0;

                                        return completedFields ===
                                            totalFields ? (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                <Check className="w-3 h-3 mr-1" />
                                                Complete
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-amber-700 border-amber-300"
                                            >
                                                {percentage}% Complete
                                            </Badge>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-slate-600">
                                <p>
                                    Personal Info:{' '}
                                    {hasValue(user.full_name) &&
                                    hasValue(user.phone_number) &&
                                    hasValue(user.passport_name) &&
                                    hasValue(user.date_of_birth) &&
                                    hasValue(user.gender) &&
                                    hasValue(user.nationality)
                                        ? '✓'
                                        : '○'}{' '}
                                    Basic details
                                </p>
                                <p>
                                    Documents:{' '}
                                    {hasValue(user.national_id) &&
                                    hasValue(user.passport_number) &&
                                    hasValue(user.passport_expiry_date) &&
                                    hasValue(user.passport_issuance_location) &&
                                    hasValue(user.passport_issuance_country)
                                        ? '✓'
                                        : '○'}{' '}
                                    Passport & ID
                                </p>
                                <p>
                                    Address:{' '}
                                    {user.address &&
                                    hasValue(user.address.street) &&
                                    hasValue(user.address.city) &&
                                    hasValue(user.address.state) &&
                                    hasValue(user.address.postal_code) &&
                                    hasValue(user.address.country)
                                        ? '✓'
                                        : '○'}{' '}
                                    Full address
                                </p>
                                <p>
                                    Emergency:{' '}
                                    {user.emergency_contact &&
                                    hasValue(user.emergency_contact.name) &&
                                    hasValue(user.emergency_contact.phone) &&
                                    hasValue(
                                        user.emergency_contact.relationship
                                    )
                                        ? '✓'
                                        : '○'}{' '}
                                    Emergency contact
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
