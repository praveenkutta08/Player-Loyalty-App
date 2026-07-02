import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { EnrolScreen } from './screens/EnrolScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OtpScreen } from './screens/OtpScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Auth stack shown while unauthenticated: login (A3), enrol (A5), OTP (A4), recovery (A8). */
export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Enrol" component={EnrolScreen} />
      <Stack.Screen name="Forgot" component={ForgotPasswordScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  );
}
