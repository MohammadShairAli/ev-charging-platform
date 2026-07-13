import { ProfilePanel } from "@/src/components/auth/ProfilePanel";
import { requireSessionAccess } from "@/src/lib/auth-guard";

export default async function ProfilePage() {
  await requireSessionAccess();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">Profile</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Your profile</h1>
      <div className="mt-6">
        <ProfilePanel />
      </div>
    </section>
  );
}
