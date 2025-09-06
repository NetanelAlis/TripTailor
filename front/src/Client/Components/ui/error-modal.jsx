import React from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './button.jsx';

export default function ErrorModal({
    isOpen,
    onClose,
    title,
    message,
    onRetry,
}) {
    if (!isOpen) {
        // Ensure modal is completely removed from DOM
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>

                <div className="flex justify-center">
                    <Button onClick={onClose} className="px-6 py-2">
                        OK
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
