/**
 * App.tsx
 * -------------------------------------------------------------
 * The app's entry point for the LID (Living in Data) Phase-1 mockup.
 *   1. Wraps everything in <LidProvider> so every screen can read/modify
 *      subjects, measurements, and engine evaluations.
 *   2. Sets up navigation (the stack of screens you push/pop).
 *   3. Styles the top navigation bar.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './src/navigation';
import { LidProvider } from './src/LidContext';
import { colors } from './src/theme';

import HomeScreen from './screens/HomeScreen';
import CreateSubjectScreen from './screens/CreateSubjectScreen';
import AddMeasurementScreen from './screens/AddMeasurementScreen';
import LipidResultScreen from './screens/LipidResultScreen';
import MeasurementHistoryScreen from './screens/MeasurementHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <LidProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.textOnPrimary,
              headerTitleStyle: { color: colors.textOnPrimary },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Home has its own custom header, so we hide the default one. */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateSubject"
              component={CreateSubjectScreen}
              options={{ title: 'New subject' }}
            />
            <Stack.Screen
              name="AddMeasurement"
              component={AddMeasurementScreen}
              options={{ title: 'Add measurement' }}
            />
            <Stack.Screen
              name="LipidResult"
              component={LipidResultScreen}
              options={{ title: 'Lipid evaluation' }}
            />
            <Stack.Screen
              name="MeasurementHistory"
              component={MeasurementHistoryScreen}
              options={{ title: 'Measurement history' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </LidProvider>
    </SafeAreaProvider>
  );
}
