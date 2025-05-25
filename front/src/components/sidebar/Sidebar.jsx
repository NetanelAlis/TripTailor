import { Drawer } from '@mui/material';
import SideBarMenu from './sidebarMenu';

export default function SideBar({ open, setOpen, activeChat, setActiveChat }) {
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
            // setOpen(open);
            setActiveChat(chatId);
          }}
          activeChat={activeChat}
        />
      </Drawer>
    </div>
  );
}
