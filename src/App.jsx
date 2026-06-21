import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProductProvider } from './contexts/ProductContext';
import { OrderProvider } from './contexts/OrderContext';
import Sidebar from './components/sidebar';
import Navbar from './components/navbar';
import PageLoader from './components/Loading/PageLoader';
import routes from './routes';

const AuthLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <Outlet />
  </div>
);

const AdminLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    const handleResize = () => {
      if (window.innerWidth >= 1200) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen w-full bg-lightPrimary dark:!bg-navy-900 flex overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="h-full w-full flex-1 flex flex-col transition-all xl:ml-[300px] overflow-auto">
        <Navbar
          brandText="Dashboard"
          user={user}
          onLogout={handleLogout}
          onOpenSidenav={() => setOpen(true)}
        />
        <main className="flex-1 p-4 mb-auto">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const token = localStorage.getItem('token');
  return isAuthenticated && token ? children : <Navigate to="/auth/login" />;
};

const Login = React.lazy(() => import('./views/auth/login'));

function App() {
  let isCashier = false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'cashier') isCashier = true;
  } catch (e) {}

  return (
    <Routes>
      <Route path="/auth" element={<AuthLayout />} />
      <Route
        path="/auth/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <OrderProvider>
              <ProductProvider>
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
                    {isCashier && (
                      <Route path="finance" element={<Navigate to="/admin/default" />} />
                    )}
                  </Routes>
                </AdminLayout>
              </ProductProvider>
            </OrderProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/auth/login" />} />
    </Routes>
  );
}

export default App;
