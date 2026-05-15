import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { getNotificationPermission, subscribeToPush, unsubscribeFromPush } from '../notifications';

export default function NotificationToggle({ swRegistration }) {
  const [state, setState]     = useState('loading'); // loading | unsupported | denied | off | on | busy
  const [subRef, setSubRef]   = useState(null);

  useEffect(() => {
    if (!swRegistration) return;
    if (!('Notification' in window)) { setState('unsupported'); return; }

    swRegistration.pushManager.getSubscription().then((sub) => {
      if (sub) { setSubRef(sub); setState('on'); }
      else setState(Notification.permission === 'denied' ? 'denied' : 'off');
    });
  }, [swRegistration]);

  async function toggle() {
    if (!swRegistration) return;
    setState('busy');
    try {
      if (subRef) {
        await unsubscribeFromPush(swRegistration);
        setSubRef(null);
        setState('off');
      } else {
        const permission = await getNotificationPermission();
        if (permission !== 'granted') { setState('denied'); return; }
        const sub = await subscribeToPush(swRegistration);
        setSubRef(sub);
        setState('on');
      }
    } catch {
      setState(subRef ? 'on' : 'off');
    }
  }

  if (state === 'unsupported' || state === 'loading') return null;

  const isOn      = state === 'on';
  const isBusy    = state === 'busy';
  const isDenied  = state === 'denied';

  return (
    <button
      onClick={toggle}
      disabled={isBusy || isDenied}
      title={
        isDenied ? 'Notifications blocked in browser settings'
        : isOn   ? 'Disable push notifications'
                 : 'Enable push notifications'
      }
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        isOn
          ? 'bg-violet-900/50 text-violet-300 hover:bg-violet-900'
          : isDenied
          ? 'cursor-not-allowed bg-gray-800 text-gray-600'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      {isBusy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isOn ? (
        <Bell size={12} />
      ) : (
        <BellOff size={12} />
      )}
      {isDenied ? 'Blocked' : isOn ? 'Alerts on' : 'Alerts off'}
    </button>
  );
}
