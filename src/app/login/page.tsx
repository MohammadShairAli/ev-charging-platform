import { AuthPanel } from "@/src/components/auth/AuthPanel";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <section className="hidden lg:block">
          <p className="text-sm font-semibold text-primary">EV Charging Pakistan</p>
          <h1 className="mt-3 text-5xl font-bold leading-tight text-foreground">Sign in before the road gets urgent</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Continue with your account, use Google, or enter as a guest and go straight to the map.
          </p>
        </section>
        <AuthPanel mode="login" />
      </div>
    </main>
  );
}
