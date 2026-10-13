import { useEffect, useState } from 'react';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];

/**
 * Tracks activity in this browser tab only. It never reads input values or stores
 * event details. Dispatches nirogya:user-activity and nirogya:user-idle events.
 */
export function useUserActivity(idleAfterMs = 5 * 60 * 1000) {
    const [lastActiveAt, setLastActiveAt] = useState(() => Date.now());
    const [isIdle, setIsIdle] = useState(false);

    useEffect(() => {
        let timer;
        let lastPointerMoveAt = 0;

        function markActive(event) {
            const now = Date.now();
            if (event.type === 'pointermove' && now - lastPointerMoveAt < 1000) return;
            if (event.type === 'pointermove') lastPointerMoveAt = now;
            clearTimeout(timer);
            setLastActiveAt(now);
            setIsIdle(false);
            window.dispatchEvent(new CustomEvent('nirogya:user-activity', { detail: { lastActiveAt: now } }));
            timer = window.setTimeout(() => {
                setIsIdle(true);
                window.dispatchEvent(new CustomEvent('nirogya:user-idle', { detail: { lastActiveAt: now } }));
            }, idleAfterMs);
        }

        function onVisibilityChange() {
            if (document.visibilityState === 'visible') markActive({ type: 'visibilitychange' });
        }

        timer = window.setTimeout(() => {
            setIsIdle(true);
            window.dispatchEvent(new CustomEvent('nirogya:user-idle', { detail: { lastActiveAt } }));
        }, idleAfterMs);
        ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, markActive, { passive: true }));
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearTimeout(timer);
            ACTIVITY_EVENTS.forEach(type => window.removeEventListener(type, markActive));
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [idleAfterMs]);

    return { isIdle, lastActiveAt };
}

export default function UserActivity({ idleAfterMs }) {
    const { isIdle } = useUserActivity(idleAfterMs);
    return <span className={`activity-indicator${isIdle ? ' is-idle' : ''}`} aria-live="polite">
        <span aria-hidden="true" />{isIdle ? 'Away' : 'Active'}
    </span>;
}