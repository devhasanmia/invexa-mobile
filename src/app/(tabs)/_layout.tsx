import React from 'react';
import { Stack } from 'expo-router';

export default function TabsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
