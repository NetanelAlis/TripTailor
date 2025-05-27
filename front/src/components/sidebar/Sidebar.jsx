import { Drawer } from '@mui/material';
import SideBarMenu from './sidebarMenu';
import { useNavigate } from 'react-router-dom';

export default function SideBar({
  open,
  setOpen,
  activeChat,
  setActiveChat,
  numberOfChats,
}) {
  const navigate = useNavigate();
  return (
    <div>
      <Drawer
        sx={{
          '& .MuiDrawer-paper': {
            zIndex: 1,
          },
        }}
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        variant="persistent"
      >
        <SideBarMenu
          onSelectChat={(chatId) => {
            navigate('/chat', {
              state: { newChatId: chatId },
            });
          }}
          activeChat={activeChat}
          numberOfChats={numberOfChats}
        />
      </Drawer>
    </div>
  );
}
