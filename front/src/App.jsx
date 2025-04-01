import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import NewChat from './pages/new-chat/NewChat';
import Chat from './components/chat/Chat';

const router = createBrowserRouter([
  { path: '/new-chat', element: <NewChat /> },
  { path: '/chat', element: <Chat /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
