import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);

    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/logout');
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isPetugas = () => user?.role === 'petugas';
  const isReparasi = () => user?.role === 'reparasi';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAdmin,
      isPetugas,
      isReparasi,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
