import { Button, Drawer } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import SideBarMenu from './sidebarMenu';

const buttonStyle = {
    position: 'fixed',
    zIndex: 2,
    top: 100,
    borderRadius: '50%',
    minWidth: 0,
    width: 48,
    height: 48,
    backgroundColor: '#dee2e6',
    boxShadow: 'none',
    padding: 0,
    '&:hover': {
        backgroundColor: '#f1f3f5',
    },
    '&:focus': {
        outline: 'none',
    },
};

export default function SideBar({ open, setOpen }) {
    return (
        <div>
            {open && (
                <Button
                    sx={{
                        ...buttonStyle,
                    }}
                    onClick={() => setOpen(false)}
                >
                    <MenuOpenIcon sx={{ color: '#4c6ef5', fontSize: 28 }} />
                </Button>
            )}
            {!open && (
                <Button
                    sx={{
                        ...buttonStyle,
                    }}
                    onClick={() => setOpen(true)}
                >
                    <MenuIcon sx={{ color: '#4c6ef5', fontSize: 28 }} />
                </Button>
            )}

            <Drawer
                sx={{
                    '& .MuiDrawer-paper': {
                        top: 16,
                        zIndex: 1,
                    },
                }}
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                variant="persistent"
            >
                <SideBarMenu handleOpen={(open) => setOpen(open)} />
            </Drawer>
        </div>
    );
}
