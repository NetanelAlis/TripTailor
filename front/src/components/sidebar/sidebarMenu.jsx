import { Box, List, ListItem, Typography } from '@mui/material';

export default function SideBarMenu({
    onSelectChat = () => {},
    activeChat,
    numberOfChats,
}) {
    const chats = [];
    chats[0] = 0;

    // set the user's chats dynamically
    for (let i = numberOfChats; i > 0; i--) {
        chats.push({
            id: i,
            title: 'vacation ' + i,
        });
    }

    return (
        <Box
            sx={{
                marginTop: '75px',
                width: 285,
                height: '100vh',
                backgroundColor: '#d0ebff',
                color: '#FFFFFF',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                borderRight: '2px solid #a5d8ff',
            }}
        >
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: 317,
                    height: '75px',
                    backgroundColor: '#d0ebff',
                    zIndex: 1,
                    borderRight: '2px solid #a5d8ff',
                }}
            ></Box>

            {/* Header */}
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontWeight: '700',
                    fontFamily: 'Rubik, sans-serif',
                    color: '#062c56',
                    cursor: 'default',
                }}
            >
                My Chats
            </Typography>

            {/* Chat List */}
            <List sx={{ p: 0 }}>
                {chats.map((chat) => {
                    if (chat != 0)
                        return (
                            <ListItem
                                key={chat?.id}
                                onClick={() => {
                                    onSelectChat(chat?.id);
                                }}
                                sx={{
                                    py: 1,
                                    px: 2,
                                    borderRadius: 2,
                                    mb: 0.5,
                                    backgroundColor:
                                        activeChat === chat.id
                                            ? '#0f8bd245'
                                            : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.3s',
                                    '&:hover': {
                                        backgroundColor: '#0f8bd245',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: 16,
                                            color: '#062c56',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {chat.title}
                                    </Typography>
                                </Box>
                            </ListItem>
                        );
                    else {
                        return null;
                    }
                })}
            </List>
        </Box>
    );
}
