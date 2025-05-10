import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import PublicIcon from '@mui/icons-material/Public';
import DepartureBoardIcon from '@mui/icons-material/DepartureBoard';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, List, ListItem, Typography, Collapse } from '@mui/material';
import { useState } from 'react';

export default function SideBarMenu({ handleOpen }) {
    const [active, setActive] = useState(0);
    const [expanded, setExpanded] = useState(null);

    const menuItemsData = [
        {
            text: 'נסיעות',
            icon: <DepartureBoardIcon fontSize="large" />,
        },
        {
            text: 'סידור עבודה יומי',
            icon: <CalendarTodayIcon fontSize="large" />,
            subMenu: [
                {
                    text: 'שיבוץ נהגים אוטומטי',
                    icon: <GroupAddIcon fontSize="large" />,
                },
                {
                    text: 'החלפת רכב ברכב',
                    icon: <DirectionsCarIcon fontSize="large" />,
                },
                {
                    text: 'החלפת ראש בראש',
                    icon: <SwapHorizIcon fontSize="large" />,
                },
            ],
        },
        {
            text: 'תובלה',
            icon: <LocalShippingIcon fontSize="large" />,
            subMenu: [
                { text: 'משלוח רגיל' },
                { text: 'משלוח מהיר' },
                { text: 'משלוח מטען כבד' },
                { text: 'משלוח חירום' },
                { text: 'מעקב משלוחים' },
            ],
        },
        {
            text: 'בניית מסלולים',
            icon: <AltRouteIcon fontSize="large" />,
        },
        {
            text: 'גיאוגרפיה',
            icon: <PublicIcon fontSize="large" />,
        },
    ];

    return (
        <Box
            sx={{
                width: 240,
                direction: 'rtl',
                height: '100vh',
                backgroundColor: '#e9ecef',
                p: 2,
                overflowY: 'auto',
            }}
            role="presentation"
        >
            <Box
                sx={{
                    mb: 1,
                    px: 2,
                    py: 1,
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: '#343a40',
                    width: '100%',
                    fontFamily: 'Rubik, sans-serif',
                    borderBottom: '1px solid #ced4da',
                }}
            >
                פעולות נוספות
            </Box>
            <List sx={{ p: 0 }}>
                {menuItemsData.map((item, index) => (
                    <Box key={item.text}>
                        <ListItem
                            button
                            onClick={() => {
                                setActive(index);
                                if (item.subMenu) {
                                    setExpanded(
                                        expanded === index ? null : index
                                    );
                                } else {
                                    handleOpen(false);
                                    setExpanded(null);
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingY: 1,
                                paddingX: 2,
                                backgroundColor:
                                    active === index
                                        ? '#dbe4ff'
                                        : 'transparent',
                                borderRadius: 2,
                                cursor: 'pointer',
                                color: '#343a40',
                                '&:hover': {
                                    backgroundColor: '#edf2ff',
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                {item.icon}
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontWeight: '500',
                                        color: '#495057',
                                        fontFamily: 'Rubik, sans-serif',
                                        marginRight: 0.3,
                                    }}
                                >
                                    {item.text}
                                </Typography>
                            </Box>

                            {item.subMenu && (
                                <>
                                    {expanded === index ? (
                                        <ExpandLessIcon fontSize="small" />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" />
                                    )}
                                </>
                            )}
                        </ListItem>
                        {item.subMenu && (
                            <Collapse
                                in={expanded === index}
                                timeout="auto"
                                unmountOnExit
                            >
                                <List component="div" disablePadding>
                                    {item.subMenu.map((subItem) => (
                                        <ListItem
                                            key={subItem.text}
                                            onClick={() => {
                                                handleOpen(false);
                                                setExpanded(null);
                                                setActive(index);
                                            }}
                                            sx={{
                                                pl: 6,
                                                py: 0.7,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                color: '#495057',
                                                fontSize: 14,
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    backgroundColor: '#f1f3f5',
                                                },
                                            }}
                                        >
                                            {subItem.icon && subItem.icon}
                                            <Typography
                                                sx={{
                                                    marginRight: 1,
                                                    fontSize: 14,
                                                    fontWeight: '500',
                                                    color: '#495057',
                                                    fontFamily:
                                                        'Rubik, sans-serif',
                                                    textWrap: 'nowrap',
                                                }}
                                            >
                                                {subItem.text}
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        )}
                    </Box>
                ))}
            </List>
        </Box>
    );
}
