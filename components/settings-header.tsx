'use client';

import { memo } from 'react';
import { SidebarToggle } from '@/components/sidebar-toggle';

function PureSettingsHeader() {
  return (
    <header className="flex items-center gap-2 bg-background p-2 sticky top-0">
      <SidebarToggle />
    </header>
  );
}

export const SettingsHeader = memo(
  PureSettingsHeader,
  () => {
    return true;
  }
);
