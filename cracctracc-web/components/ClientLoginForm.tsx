'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/auth-client';

export default function ClientLoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              onClick={() => authClient.signIn.social({ provider: 'google' })}
            >
              Sign in with Google
            </Button>
            <Button
              onClick={() => authClient.signIn.social({ provider: 'facebook' })}
            >
              Sign in with Facebook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
