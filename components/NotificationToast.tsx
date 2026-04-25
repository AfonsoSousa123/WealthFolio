import React, { useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp?: Date;
}

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000); // Auto dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  };

  const iconColors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div className={`pointer-events-auto w-full overflow-hidden rounded-xl border shadow-lg transition-all ${bgColors[notification.type]} flex items-start p-4 animate-fade-in-up backdrop-blur-md`}>
       <div className="flex-shrink-0">
         {notification.type === 'success' && <svg className={`h-6 w-6 ${iconColors.success}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
         {notification.type === 'warning' && <svg className={`h-6 w-6 ${iconColors.warning}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
         {notification.type === 'info' && <svg className={`h-6 w-6 ${iconColors.info}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
       </div>
       <div className="ml-3 w-0 flex-1 pt-0.5">
         <p className="text-sm font-bold">{notification.title}</p>
         <p className="mt-1 text-sm opacity-90 leading-snug">{notification.message}</p>
       </div>
       <div className="ml-4 flex flex-shrink-0">
         <button
           className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 opacity-60 hover:opacity-100"
           onClick={() => onDismiss(notification.id)}
         >
           <span className="sr-only">Close</span>
           <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
           </svg>
         </button>
       </div>
    </div>
  );
};