import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiLockPasswordLine, RiMailLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://el-mawardy-store.vercel.app/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Dynamically extract role from response or token
      let extractedRole = 
        data.role || 
        data.user?.role || 
        data.data?.role || 
        data.data?.user?.role || 
        data.result?.role || 
        data.result?.user?.role;

      // Fallback: Decode token to get role
      if (!extractedRole && data.token) {
        try {
          const payloadString = atob(data.token.split('.')[1]);
          const payload = JSON.parse(payloadString);
          if (payload && payload.role) {
            extractedRole = payload.role;
          }
        } catch (e) {
          console.error("Token decode failed", e);
        }
      }

      const finalRole = extractedRole || 'admin';

      // Store authentication data
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: formData.email,
        token: data.token,
        role: finalRole
      }));

      // Navigate to dashboard
      navigate('/admin/default');
    } catch (err) {
      let errorMessage = 'An error occurred during login';
      
      if (err.message.includes('fails to match the required pattern')) {
        errorMessage = 'Password or username is incorrect';
      } else if (err.message.includes('must be at least 8 characters')) {
        errorMessage = 'Password must be at least 8 characters long and contain at least one uppercase letter';
      } else if (err.message.includes('User not found') || err.message.includes('Incorrect Password')) {
        errorMessage = 'Password or username is incorrect';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-purple-600">Ayla HomeWear</h1>
            <p className="text-gray-600 mt-2">Admin Dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <RiMailLine className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <RiLockPasswordLine className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <RiEyeOffLine className="h-5 w-5 text-gray-400" />
                  ) : (
                    <RiEyeLine className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center bg-purple-600 py-3 px-4 text-sm font-medium text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full border-r-transparent border-b-transparent"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              ©{new Date().getFullYear()} Ayla HomeWear. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
