import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '../../../Client/Components/ui/button';
import {
    formatCurrency,
    getUserPreferredCurrency,
} from '../../../Client/utils/currencyConverter';

export default function CompleteBooking({
    totalPrice,
    handleCompleteBooking,
    isBooking = false,
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 text-center"
        >
            <Button
                onClick={handleCompleteBooking}
                disabled={isBooking}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
            >
                {isBooking ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing Booking...
                    </>
                ) : (
                    <>
                        Complete Booking -{' '}
                        {formatCurrency(totalPrice, getUserPreferredCurrency())}
                    </>
                )}
            </Button>
            <p className="text-sm text-slate-500 mt-3">
                By completing this booking, you agree to our terms and
                conditions.
                <br />
                Confirmation details will be sent to your email address.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Shield className="w-3 h-3" />
                <span>Secure SSL encrypted payment</span>
            </div>
        </motion.div>
    );
}
