import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';

export default function AppHeader() {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          fontWeight={800}
          sx={{ color: 'inherit', textDecoration: 'none' }}
        >
          Exoplore
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Button component={RouterLink} to="/" color="inherit">
          Home
        </Button>

        <Button component={RouterLink} to="/about-data" color="inherit">
          About Data
        </Button>

        <Tooltip title="Open FAQ">
          <IconButton
            component={RouterLink}
            to="/faq"
            color="inherit"
            aria-label="Open FAQ"
            sx={{ ml: 1, border: 1, borderColor: 'divider', width: 36, height: 36 }}
          >
            ?
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
