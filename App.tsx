/**
 * App.tsx
 * -------------------------------------------------------------
 * The app's entry point. It does three things:
 *   1. Wraps everything in <ConceptsProvider> so every screen can
 *      read/modify the concept list.
 *   2. Sets up navigation (the stack of screens you push/pop).
 *   3. Styles the top navigation bar.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './src/navigation';
import { ConceptsProvider } from './src/ConceptsContext';
import { PremiumProvider } from './src/premium';
import { colors } from './src/theme';

import HomeScreen from './screens/HomeScreen';
import LibraryScreen from './screens/LibraryScreen';
import AddConceptScreen from './screens/AddConceptScreen';
import ConceptDetailScreen from './screens/ConceptDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PremiumProvider>
      <ConceptsProvider>
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
            {/* Home has its own custom header, so we hide the default one. */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Library"
              component={LibraryScreen}
              options={{ title: 'Library' }}
            />
            <Stack.Screen
              name="AddConcept"
              component={AddConceptScreen}
              options={{ title: 'Add concept' }}
            />
            <Stack.Screen
              name="ConceptDetail"
              component={ConceptDetailScreen}
              options={{ title: 'Concept' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ConceptsProvider>
      </PremiumProvider>
    </SafeAreaProvider>
  );
}
