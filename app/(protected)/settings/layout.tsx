import { Separator } from '@/components/ui/separator';
import { SettingsNav } from '@/components/settings-nav';
import { SettingsHeader } from '@/components/settings-header';

export default function SettingsLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <>
      <SettingsHeader />
      <div className="max-w-7xl mx-auto space-y-6 w-full p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and details
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <SettingsNav />
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
    </>
  );
}
