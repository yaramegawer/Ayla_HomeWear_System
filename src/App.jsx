import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import { ProductProvider } from './contexts/ProductContext';
import Sidebar from './components/sidebar';
import Navbar from './components/navbar';
import routes from './routes';

// Auth layout component
const AuthLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <Outlet />
  </div>
);

// Admin layout component
const AdminLayout = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Navbar 
          brandText="Dashboard" 
          user={user}
          onLogout={handleLogout}
        />
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const token = localStorage.getItem('token');
  return isAuthenticated && token ? children : <Navigate to="/auth/login" />;
};

// Lazy import Login component
const Login = React.lazy(() => import('./views/auth/login'));

function App() {
  let isCashier = false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'cashier') isCashier = true;
  } catch (e) {}

  return (
    <AdminProvider>
      <ProductProvider>
        <Routes>
          <Route path="/auth" element={<AuthLayout />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  {routes.map((route, index) => {
                    if (isCashier && route.path === 'finance') return null;
                    return (
                      <Route
                        key={index}
                        path={route.path}
                        element={<route.component />}
                      />
                    );
                  })}
                  {isCashier && <Route path="finance" element={<Navigate to="/admin/default" />} />}
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/auth/login" />} />
        </Routes>
      </ProductProvider>
    </AdminProvider>
  );
}

export default App;
