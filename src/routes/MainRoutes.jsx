import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import PrivateRoute from './PrivateRoute';

// pages
const DashboardDefault = Loadable(lazy(() => import('views/dashboard/Default')));
const UtilsTypography = Loadable(lazy(() => import('views/utilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('views/utilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('views/utilities/Shadow')));
const SamplePage = Loadable(lazy(() => import('views/sample-page')));
const Login = Loadable(lazy(() => import('views/pages/authentication/Login')));
const Register = Loadable(lazy(() => import('views/pages/authentication/Register')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/',
      element: (
        <PrivateRoute>
          <DashboardDefault />
        </PrivateRoute>
      )
    },
    {
      path: 'dashboard/default',
      element: (
        <PrivateRoute>
          <DashboardDefault />
        </PrivateRoute>
      )
    },
    {
      path: 'typography',
      element: (
        <PrivateRoute>
          <UtilsTypography />
        </PrivateRoute>
      )
    },
    {
      path: 'color',
      element: (
        <PrivateRoute>
          <UtilsColor />
        </PrivateRoute>
      )
    },
    {
      path: 'shadow',
      element: (
        <PrivateRoute>
          <UtilsShadow />
        </PrivateRoute>
      )
    },
    {
      path: 'sample-page',
      element: (
        <PrivateRoute>
          <SamplePage />
        </PrivateRoute>
      )
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/register',
      element: <Register />
    },
    {
      path: '*',
      element: <Navigate to="/" />
    }
  ]
};

export default MainRoutes;
