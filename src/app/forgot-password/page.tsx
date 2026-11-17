import ForgotPassword from '@/components/auth/ForgotPassword';

export const metadata = {
  title: 'Reset your password',
  description: 'Get a code by email and choose a new password.',
};

export default function ForgotPasswordPage() {
  return (
    <main>
      <ForgotPassword />
    </main>
  );
}
