import { SettingsHeader } from '@/components/settings-header';

export default function DashboardPage() {
	return (
		<>
			<SettingsHeader />
			<div className="container mx-auto space-y-6 p-6">
				<h1 className="font-bold text-3xl">Dashboard</h1>
			</div>
		</>
	);
}
