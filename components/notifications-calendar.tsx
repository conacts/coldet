'use client';

import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import type { DayProps } from 'react-day-picker';

interface NotificationsCalendarProps {
  selectedDate?: Date;
  onSelect?: (date: Date | undefined) => void;
  notifications: Record<string, number>;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationsCalendar({
  selectedDate,
  onSelect,
  notifications,
  className,
  onOpenChange,
}: NotificationsCalendarProps) {
  const handleDateSelect = (newDate: Date | undefined) => {
    onSelect?.(newDate);
    onOpenChange?.(false);
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={handleDateSelect}
      initialFocus
      className={className}
      classNames={{
        head_row: 'flex justify-between px-1',
      }}
      components={{
        Day: ({ date, ...props }: DayProps) => {
          const dateString = date.toISOString().split('T')[0];
          const notificationCount = notifications[dateString];

          return (
            <div className="relative">
              <Button
                variant="ghost"
                className="size-9 p-0 font-normal aria-selected:opacity-100"
                onClick={() => handleDateSelect(date)}
              >
                {date.getDate()}
              </Button>
              {notificationCount && (
                <div className="absolute -top-1 -right-1 bg-primary text-xs rounded-full size-4 flex items-center justify-center text-white">
                  {notificationCount}
                </div>
              )}
            </div>
          );
        },
      }}
    />
  );
}
