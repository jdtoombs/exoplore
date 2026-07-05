import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, Container, CssBaseline, ThemeProvider } from '@mui/material';
import AppHeader from './components/AppHeader';
import AboutDataPage from './pages/AboutDataPage';
import FaqPage from './pages/FaqPage';
import HomePage from './pages/HomePage';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppHeader />

        <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, sm: 3, lg: 4 } }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about-data" element={<AboutDataPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
