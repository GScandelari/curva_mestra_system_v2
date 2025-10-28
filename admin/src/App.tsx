import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/common/LoadingScreen';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <Box sx={{ minHeight: '100vh' }}>
            <Routes>
                <Route
                    path="/login"
                    element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
                />
                <Route
                    path="/dashboard"
                    element={user ? <DashboardPage /> : <Navigate to="/login" replace />}
                />
                <Route
                    path="/"
                    element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
                />
                <Route
                    path="*"
                    element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
                />
            </Routes>
        </Box>
    );
}

export default App;