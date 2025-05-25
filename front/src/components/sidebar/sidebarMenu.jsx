import { Box, List, ListItem, Typography } from '@mui/material';

export default function SideBarMenu({ onSelectChat = () => {}, activeChat }) {
  const sampleChats = [
    {
      id: 1,
      title: 'Trip to Rome',
      preview: 'Check out the recommended spots for Day 2...',
    },
    {
      id: 2,
      title: 'Customer Support',
      preview: 'Welcome! How can I help you today?',
    },
    {
      id: 3,
      title: 'Grocery List for Thanksgiving',
      preview: 'Don’t forget the cranberry sauce...',
    },
    {
      id: 4,
      title: 'Capstone Project Ideas',
      preview: 'Maybe we could build a trip planner app...',
    },
    {
      id: 5,
      title: 'Weekly Driver Schedule',
      preview: 'Night shift drivers have been added...',
    },
  ];

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
        {sampleChats.map((chat) => (
          <ListItem
            key={chat.id}
            onClick={() => {
              onSelectChat(chat.id);
            }}
            sx={{
              py: 1,
              px: 2,
              borderRadius: 2,
              mb: 0.5,
              backgroundColor:
                activeChat === chat.id ? '#0f8bd245' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.3s',
              '&:hover': {
                backgroundColor: '#0f8bd245',
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#062c56',
                  fontWeight: 500,
                }}
              >
                {chat.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  color: '#034d8a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '250px',
                }}
              >
                {chat.preview}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
