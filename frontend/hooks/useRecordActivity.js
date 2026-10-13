import { useCallback } from 'react';

export default function useRecordActivity() {
    const recordActivity = useCallback((feature, action, route) => {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = { feature, action, route, timestamp };
            const existing = JSON.parse(localStorage.getItem('nirogya_user_activities') || '[]');
            existing.unshift(logEntry);
            localStorage.setItem('nirogya_user_activities', JSON.stringify(existing.slice(0, 50)));
            window.dispatchEvent(new CustomEvent('nirogya:activity-recorded', { detail: logEntry }));
        } catch {
            // Local storage error fallback
        }
    }, []);

    return { recordActivity };
}
