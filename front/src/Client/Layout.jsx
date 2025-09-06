import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Conversation, User } from './Entities/index.js';
import {
    MessageSquare,
    Plane,
    Map,
    ChevronsLeft,
    ChevronsRight,
    Compass,
    LogOut,
    User as UserIcon,
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from './Components/ui/sidebar.jsx';
import Navbar from './Components/landing/Navbar.jsx';

const navigationItems = [
    {
        title: 'New Trip',
        url: '/chat?new=true',
        icon: MessageSquare,
    },
    { title: 'Trip Summary', url: '/chat/history', icon: Map },
    { title: 'Account', url: '/account', icon: UserIcon },
];

const SidebarContentComponent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    const { collapsed } = useSidebar();
    const currentConversationId = new URLSearchParams(location.search).get(
        'id'
    );

    useEffect(() => {
        const loadConversations = async () => {
            try {
                setIsLoadingConversations(true);
                const data = await Conversation.list('-updated_date');
                setConversations(data);
            } catch (error) {
                console.error('Sidebar: Error loading conversations:', error);
                setConversations([]);
            } finally {
                setIsLoadingConversations(false);
            }
        };
        loadConversations();
        const onUpdated = () => loadConversations();
        window.addEventListener('tt:conversations-updated', onUpdated);
        return () =>
            window.removeEventListener('tt:conversations-updated', onUpdated);
    }, [location]);

    const handleLogout = async () => {
        await User.logout();
        navigate('/');
    };

    return (
        <div className="flex flex-col h-full">
            <SidebarHeader className="border-b border-slate-200/60 p-4 flex-col">
                <Link
                    to="/"
                    className="w-full transition-opacity hover:opacity-80"
                >
                    <div className="flex items-center gap-3 w-full pl-1 sm:pl-2">
                        <img
                            src="/images/logo-without-name.png"
                            alt="TripTailor"
                            className="h-10 w-auto object-contain flex-shrink-0"
                        />
                        <div
                            className={`transition-opacity duration-200 whitespace-nowrap ${
                                collapsed ? 'opacity-0' : 'opacity-100'
                            }`}
                        >
                            <h2 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                                TripTailor
                            </h2>
                        </div>
                    </div>
                </Link>
                <div className="mt-3 w-full">
                    <SidebarTrigger className="w-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 p-2 rounded-lg">
                        <div
                            className={`flex items-center w-full ${
                                collapsed
                                    ? 'justify-center px-0 gap-0'
                                    : 'justify-start px-2 gap-3'
                            }`}
                        >
                            <div className="w-10 h-10 flex items-center justify-center">
                                {collapsed ? (
                                    <ChevronsRight className="w-5 h-5" />
                                ) : (
                                    <ChevronsLeft className="w-5 h-5" />
                                )}
                            </div>
                            {!collapsed && (
                                <span className="font-medium text-slate-700">
                                    Collapse
                                </span>
                            )}
                        </div>
                    </SidebarTrigger>
                </div>
            </SidebarHeader>

            <SidebarContent
                className={`flex-1 flex flex-col p-3 ${
                    collapsed ? 'overflow-hidden' : 'overflow-y-auto'
                }`}
            >
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-2">
                            {navigationItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl h-11 w-full text-slate-700 ${
                                            (location.pathname ===
                                                item.url.split('?')[0] &&
                                                !currentConversationId &&
                                                item.title !==
                                                    'Trip Summary') ||
                                            (location.pathname ===
                                                '/chat/history' &&
                                                item.title ===
                                                    'Trip Summary') ||
                                            (location.pathname === '/account' &&
                                                item.title === 'Account')
                                                ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                                                : ''
                                        }`}
                                    >
                                        <Link
                                            to={item.url}
                                            className={`flex items-center min-h-[44px] ${
                                                collapsed
                                                    ? 'justify-center px-0 gap-0'
                                                    : 'justify-start px-4 gap-3'
                                            } py-2 w-full`}
                                        >
                                            {collapsed ? (
                                                <div className="w-10 h-10 flex items-center justify-center">
                                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                                </div>
                                            ) : (
                                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                            )}
                                            <span
                                                className={`font-medium whitespace-nowrap ${
                                                    collapsed ? 'hidden' : ''
                                                }`}
                                            >
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Recent Trips */}
                {!collapsed && (
                    <SidebarGroup className="mt-4">
                        <SidebarGroupLabel
                            className={
                                'text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3'
                            }
                        >
                            Recent Trips
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            {isLoadingConversations ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <SidebarMenu className="space-y-2">
                                    {conversations.map((conv) => (
                                        <SidebarMenuItem key={conv.id}>
                                            <SidebarMenuButton
                                                asChild
                                                className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl h-11 w-full justify-start text-left ${
                                                    currentConversationId ===
                                                    conv.id
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : ''
                                                }`}
                                            >
                                                <Link
                                                    to={`/chat?id=${conv.id}`}
                                                    className={`flex items-center justify-start px-4 ${
                                                        collapsed
                                                            ? 'gap-0'
                                                            : 'gap-3'
                                                    } py-2 w-full overflow-hidden`}
                                                >
                                                    <Compass className="w-4 h-4 flex-shrink-0" />
                                                    <span
                                                        className={`font-medium text-sm truncate text-left whitespace-nowrap ${
                                                            collapsed
                                                                ? 'hidden'
                                                                : ''
                                                        }`}
                                                    >
                                                        {conv.title}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            )}
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <div className="mt-auto p-3 border-t border-slate-200/60">
                <SidebarMenu className="space-y-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className={`hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-xl h-11 w-full text-slate-600 ${
                                collapsed ? 'justify-center' : 'justify-start'
                            }`}
                            onClick={handleLogout}
                        >
                            <div
                                className={`flex items-center ${
                                    collapsed
                                        ? 'justify-center px-0 gap-0'
                                        : 'justify-start px-4 gap-3'
                                } py-2 w-full`}
                            >
                                {collapsed ? (
                                    <div className="w-10 h-10 flex items-center justify-center">
                                        <LogOut className="w-5 h-5 flex-shrink-0" />
                                    </div>
                                ) : (
                                    <LogOut className="w-5 h-5 flex-shrink-0" />
                                )}
                                <span
                                    className={`font-medium whitespace-nowrap ${
                                        collapsed ? 'hidden' : ''
                                    }`}
                                >
                                    Logout
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>
        </div>
    );
};

export default function Layout() {
    const [user, setUser] = useState(null);
    const location = useLocation();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const userDetails = localStorage.getItem('userDetails');
        if (userDetails) {
            try {
                setUser(JSON.parse(userDetails));
            } catch (error) {
                setUser(null);
            }
        }
    }, []);

    // Close mobile sidebar whenever route changes
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location]);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">
                        Please log in to access the chat
                    </h2>
                    <p className="text-gray-500 mb-4">
                        You need to be authenticated to use this feature.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="h-screen">
                <div className="h-full flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
                    {/* Desktop sidebar */}
                    <Sidebar className="hidden md:block flex-none border-r border-slate-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 overflow-hidden">
                        <SidebarContentComponent />
                    </Sidebar>

                    {/* Mobile sidebar overlay */}
                    {isMobileSidebarOpen && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <div
                                className="absolute inset-0 bg-black/30"
                                onClick={() => setIsMobileSidebarOpen(false)}
                            />
                            <Sidebar className="absolute left-0 top-0 h-full w-64 border-r border-slate-200/60 bg-white shadow-xl overflow-hidden">
                                <SidebarContentComponent />
                            </Sidebar>
                        </div>
                    )}

                    <main className="flex-1 flex flex-col relative min-w-0">
                        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 px-4 sm:px-6 py-3 md:hidden">
                            <div className="flex items-center gap-3">
                                <SidebarTrigger
                                    className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200"
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                >
                                    <ChevronsRight className="w-5 h-5 text-slate-700" />
                                </SidebarTrigger>
                                <Link
                                    to="/"
                                    className="flex items-center gap-2"
                                >
                                    <img
                                        src="/images/logo-without-name.png"
                                        alt="TripTailor"
                                        className="h-6 w-auto object-contain"
                                    />
                                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                                        TripTailor
                                    </span>
                                </Link>
                            </div>
                        </header>
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
