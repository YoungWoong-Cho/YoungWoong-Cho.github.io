import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

const pages = ['About', 'Projects', 'Contact'];

function NavigationBar() {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const getUrlString = () => {
    const path = window.location.pathname;
    const pathSegments = path.split('/');
    return pathSegments[1];
  };

  const extractedString = getUrlString();

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#FFF' }}>
      <Toolbar>

        {/* Larger window */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', width: '100%' }}>
          <Typography
            variant='h2'
            color='primary'
            component="a"
            href="/"
            sx={{
              position: 'absolute',
              textDecoration: 'none',
            }}
          >
            Youngwoong Cho
          </Typography>

          <Box sx={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {pages.map((page) => (
              <Button
                key={page}
                color={extractedString === page.toLowerCase() ? 'primary' : 'secondary'}
                onClick={() => navigate(`${page.toLowerCase()}`)}
                sx={{ my: 2, display: 'block',
                  textDecoration: extractedString === page.toLowerCase() ? 'underline' : 'undefined',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {page}
              </Button>
            ))}
          </Box>
        </Box>


        {/* Smaller window */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', width: '100%' }}>
          <Box sx={{ position: 'absolute' }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="primary"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => navigate(`${page.toLowerCase()}`)}>
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          
          <Box sx={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Typography
              variant="h2"
              color='primary'
              component="a"
              href="/"
              sx={{
                display: 'flex',
                textDecoration: 'none',
              }}
            >
              Youngwoong Cho
            </Typography>
          </Box>
        
        </Box>

      </Toolbar>
    </AppBar>
  );
}
export default NavigationBar;