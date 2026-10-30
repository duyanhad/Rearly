import * as signalR from '@microsoft/signalr';
import { API_URL } from './apiClient';

// One connection per browser tab, shared by every component that needs it.
// StrictMode mounts effects twice, so the start call must be idempotent.
let connection = null;
let starting = null;
let retry = null;
function build(token) {
  const hub = new signalR.HubConnectionBuilder().withUrl(`${API_URL}/hubs/notifications`, {
    accessTokenFactory: () => token
  }).withAutomaticReconnect().build();

  // withAutomaticReconnect gives up after a few tries; keep trying while the tab is open.
  hub.onclose(() => {
    retry = setTimeout(() => {
      starting = null;
      ensureStarted(token);
    }, 5000);
  });
  return hub;
}
export function getConnection(token) {
  connection ??= build(token);
  return connection;
}
export function ensureStarted(token) {
  const hub = getConnection(token);
  starting ??= hub.start().catch(error => {
    console.warn('SignalR không kết nối được:', error);
  });
  return hub;
}
export async function disconnect() {
  if (retry) clearTimeout(retry);
  retry = null;
  starting = null;
  const hub = connection;
  connection = null;
  if (hub) await hub.stop().catch(() => undefined);
}