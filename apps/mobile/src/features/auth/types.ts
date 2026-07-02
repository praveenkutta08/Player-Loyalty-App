/** Auth stack routes: login, passwordless enrolment/recovery, and OTP verification. */
export type AuthStackParamList = {
  Login: undefined;
  Enrol: undefined;
  Forgot: undefined;
  Otp: { email: string; mode: 'enrol' | 'recover' };
};
