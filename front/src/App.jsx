import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import NewChat from './pages/new-chat/NewChat';
import RootLayout from './pages/root-layout/RootLayout';
import Chat from './pages/chat/Chat';

const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true, element: <HomePage /> },
            { path: '/new-chat', element: <NewChat /> },
            { path: '/chat', element: <Chat /> },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
