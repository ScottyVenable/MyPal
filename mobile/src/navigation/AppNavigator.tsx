import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ProfilesScreen from '../screens/ProfilesScreen';
import ChatScreen from '../screens/ChatScreen';
import StatsScreen from '../screens/StatsScreen';
import BrainScreen from '../screens/BrainScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Stats') {
            iconName = 'chart-line';
          } else if (route.name === 'Brain') {
            iconName = 'brain';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          } else {
            iconName = 'help';
          }

          return (
            <MaterialCommunityIcons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerTitle: 'MyPal Chat' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ headerTitle: 'Statistics' }}
      />
      <Tab.Screen
        name="Brain"
        component={BrainScreen}
        options={{ headerTitle: 'Neural Network' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Profiles"
          component={ProfilesScreen}
          options={{ headerTitle: 'Select Profile' }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
