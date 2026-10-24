import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ChargingScreen from '../screens/ChargingScreen';
import CleaningScreen from '../screens/CleaningScreen';
import SchedulingScreen from '../screens/SchedulingScreen';
import DepotOpsScreen from '../screens/DepotOpsScreen';
import AdminWorkspaceScreen from '../screens/AdminWorkspaceScreen';

export default function AppNavigator() {
  const { currentScreen } = useAuth();

  switch (currentScreen) {
    case 'ADMIN_WORKSPACE':
      return <AdminWorkspaceScreen />;
    case 'CHARGING':
      return <ChargingScreen />;
    case 'CLEANING':
      return <CleaningScreen />;
    case 'SCHEDULING':
      return <SchedulingScreen />;
    case 'DEPOT_OPS':
      return <DepotOpsScreen />;
    case 'LOGIN':
    default:
      return <LoginScreen />;
  }
}
