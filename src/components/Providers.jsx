'use client';

import { SocketProvider } from '@/context/SocketContext';
import NotificationToast from '@/app/components/NotificationToast';

export default function Providers({ children }) {
  return (
    <SocketProvider>
      <NotificationToast />
      {children}
    </SocketProvider>
  );
}
