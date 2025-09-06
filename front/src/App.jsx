import {
    createBrowserRouter,
    RouterProvider,
    useNavigate,
    useLocation,
} from 'react-router-dom';
import { useEffect } from 'react';

// New Client components (replacing all old code)
import Layout from './Client/Layout';
import ChatPage from './Client/Pages/Chat';
import HistoryPage from './Client/Pages/History';
import Home from './Client/Pages/Home';
import AuthCallback from './Client/Pages/AuthCallback';
import CheckoutPage from './Client/Pages/Checkout';
import BookingSummaryPage from './Client/Pages/BookingSummary';
import AccountPage from './Client/Pages/Account';

// Temporary component to handle old redirect URI
function NewChatRedirect() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Redirect to the new auth-callback route with the same query parameters
        navigate(`/auth-callback${location.search}`, { replace: true });
    }, [navigate, location]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Redirecting...
                </h2>
                <p className="text-gray-500">
                    Please wait while we redirect you to the new authentication
                    page.
                </p>
            </div>
        </div>
    );
}

const router = createBrowserRouter([
    // New Client home page as the main page
    {
        path: '/',
        element: <Home />,
    },
    // Temporary route to handle old redirect URI
    {
        path: '/new-chat',
        element: <NewChatRedirect />,
    },
    // Authentication callback handler
    {
        path: '/auth-callback',
        element: <AuthCallback />,
    },
    // New Client authenticated interface - using Outlet for proper child rendering
    {
        path: '/chat',
        element: <Layout />,
        children: [
            { index: true, element: <ChatPage /> },
            { path: 'history', element: <HistoryPage /> },
        ],
    },
    // Checkout page (authenticated)
    {
        path: '/checkout',
        element: <Layout />,
        children: [{ index: true, element: <CheckoutPage /> }],
    },
    // Account page (authenticated)
    {
        path: '/account',
        element: <Layout />,
        children: [{ index: true, element: <AccountPage /> }],
    },
    // Booking Summary page (authenticated)
    {
        path: '/booking-summary',
        element: <Layout />,
        children: [{ index: true, element: <BookingSummaryPage /> }],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
