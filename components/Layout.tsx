import React, { useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { UserProfileModal } from './UserProfileModal';
import { useChatContext } from '../contexts/ChatContext';
import { useIdentityContext } from '../contexts/IdentityContext';
import { useUIContext } from '../contexts/UIContext';
import { SHOW_HEADER_QUICK_SEARCH } from '../config/env';
import { HandoffNotificationToast } from './notifications/HandoffNotificationToast';

export const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // We can infer current view from location or keep it simple.
    // Sidebar needs 'currentView'.
    // Mapping: /:companyId/inbox -> inbox
    // /:companyId/products -> products
    const pathParts = location.pathname.split('/');
    // location.pathname is typically /:companyId/inbox
    // Order tasks: ["", ":companyId", "orders", ":orderId", "tasks", ... optional :taskId]
    const isOrderTasksRoute =
        pathParts.length >= 5 &&
        pathParts[2] === 'orders' &&
        pathParts[4] === 'tasks';

    const currentViewStr = pathParts.length > 2 ? pathParts[2] : 'inbox';
    const allowedSidebar = [
        'inbox',
        'products',
        'settings',
        'funnel',
        'analytics',
        'my-tasks',
        'all-tasks',
    ] as const;
    type SidebarView = (typeof allowedSidebar)[number];

    const currentView: SidebarView = isOrderTasksRoute
        ? 'all-tasks'
        : allowedSidebar.includes(currentViewStr as SidebarView)
          ? (currentViewStr as SidebarView)
          : 'inbox';

    const { chatDispatch, setSelectedChatId } = useChatContext();
    const { identityDispatch } = useIdentityContext();
    const {
        uiState,
        uiDispatch,
        toggleUserModal,
        setSearchOpen,
        setSearchQuery,
    } = useUIContext();

    const resetState = useCallback(() => {
        chatDispatch({ type: 'RESET_CHAT' });
        identityDispatch({ type: 'RESET_IDENTITY' });
        uiDispatch({ type: 'RESET_UI' });
    }, [chatDispatch, identityDispatch, uiDispatch]);

    const handleNavigate = (view: string) => {
        // Construct path relative to current company
        // We assume we are under /:companyId
        // The safest way is to go back to parent then append view
        navigate(view);
    };

    const handleSearchSelect = (type: 'client' | 'deal' | 'nav', id: string) => {
        setSearchOpen(false);
        setSearchQuery('');
        const cid = pathParts[1];
        if (!cid) return;
        if (type === 'nav') {
            navigate(`/${cid}/${id}`);
            return;
        }
        if (type === 'client') {
            navigate(`/${cid}/inbox`);
            setSelectedChatId(id);
            return;
        }
        navigate(`/${cid}/funnel`);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        toggleUserModal();
        resetState();
        window.location.href = '/login';
    };

    return (
        <>
            <div className="flex h-[100dvh] w-full bg-white overflow-hidden text-primary md:h-screen">
                <div className="hidden md:flex">
                    <Sidebar
                        currentView={currentView}
                        onNavigate={(view) => {
                            const companyId = pathParts[1];
                            navigate(`/${companyId}/${view}`);
                        }}
                        onProfileClick={toggleUserModal}
                    />
                </div>
                <div className="flex flex-col flex-1 h-full overflow-hidden relative">
                    <div className="hidden md:block">
                        <WorkspaceHeader
                            quickSearch={
                                SHOW_HEADER_QUICK_SEARCH
                                    ? {
                                          searchQuery: uiState.searchQuery,
                                          isSearchOpen: uiState.isSearchOpen,
                                          onSearchChange: setSearchQuery,
                                          onSearchFocus: () => setSearchOpen(true),
                                          onSearchClose: () => setSearchOpen(false),
                                          onSearchSelect: handleSearchSelect,
                                      }
                                    : undefined
                            }
                        />
                    </div>

                    <div className="relative flex min-h-0 flex-1 overflow-hidden">
                        <Outlet />
                    </div>
                    {uiState.isUserModalOpen && <UserProfileModal onClose={toggleUserModal} onLogout={handleLogout} />}
                </div>
            </div>
            <HandoffNotificationToast />
        </>
    );
};
