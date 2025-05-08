import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import PrivateRoute from './PrivateRoute';
import GraphsPage from '../views/pages/custom-pages/graphsPages';
import InfoPage from '../views/pages/custom-pages/currentInfoPage';

// pages
const DashboardDefault = Loadable(lazy(() => import('views/dashboard/Default')));
const UtilsTypography = Loadable(lazy(() => import('views/utilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('views/utilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('views/utilities/Shadow')));
const SamplePage = Loadable(lazy(() => import('views/sample-page')));
const Login = Loadable(lazy(() => import('views/pages/authentication/Login')));
const Register = Loadable(lazy(() => import('views/pages/authentication/Register')));
const HomeSettingsPage = Loadable(lazy(() => import('views/pages/custom-pages/homeSettings')));
const LoadsScreen = Loadable(lazy(() => import('views/pages/custom-pages/loadsPage')));
const DevicesScreen = Loadable(lazy(() => import('views/pages/custom-pages/devicesPage')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/devices',
      element: (
        <PrivateRoute>
          <DevicesScreen />
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
    },
    {
      path: '/current-info',
      element: (
        <PrivateRoute>
          <InfoPage />
        </PrivateRoute>
      )
    },
    {
      path: '/home-settings',
      element: (
        <PrivateRoute>
          <HomeSettingsPage />
        </PrivateRoute>
      )
    },
    {
      path: '/loads',
      element: (
        <PrivateRoute>
          <LoadsScreen />
        </PrivateRoute>
      )
    },
    {
      path: '/graphs',
      element: (
        <PrivateRoute>
          <GraphsPage />
        </PrivateRoute>
      )
    }
  ]
};

export default MainRoutes;
