let active = false;
const listeners = new Set<(value: boolean) => void>();
export function setPaymentFlowActive(value: boolean) { active = value; listeners.forEach((listener) => listener(value)); }
export function isPaymentFlowActive() { return active; }
export function onPaymentFlowChanged(listener: (value: boolean) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
