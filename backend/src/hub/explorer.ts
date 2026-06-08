import { router } from './router';

export function getActiveAgents() {
  const agents = router.getClients(); // Need to expose clients in router
  return Array.from(agents.keys()).map(did => ({
    did,
    status: 'online',
    lastActive: new Date().toISOString()
  }));
}
