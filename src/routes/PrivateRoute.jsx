import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  return session ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
