/**
 * App.tsx
 * -------------------------------------------------------------
 * The app's entry point. It does three things:
 *   1. Wraps everything in <HealthProvider> so every screen can
 *      read/modify the logged data and see the derived scores.
 *   2. Sets up navigation (the stack of screens you push/pop).
 *   3. Styles the top navigation bar.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './src/navigation';
import { HealthProvider } from './src/HealthContext';
import { colors } from './src/theme';

import DashboardScreen from './screens/DashboardScreen';
import LabsScreen from './screens/LabsScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import DietScreen from './screens/DietScreen';
import SleepScreen from './screens/SleepScreen';
import ProfileScreen from './screens/ProfileScreen';
import InsightsScreen from './screens/InsightsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <HealthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Dashboard has its own custom header, so we hide the default one. */}
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Labs" component={LabsScreen} options={{ title: 'Labs' }} />
            <Stack.Screen
              name="Exercise"
              component={ExerciseScreen}
              options={{ title: 'Exercise' }}
            />
            <Stack.Screen name="Diet" component={DietScreen} options={{ title: 'Diet' }} />
            <Stack.Screen name="Sleep" component={SleepScreen} options={{ title: 'Sleep' }} />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="Insights"
              component={InsightsScreen}
              options={{ title: 'Insights' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </HealthProvider>
    </SafeAreaProvider>
  );
}
