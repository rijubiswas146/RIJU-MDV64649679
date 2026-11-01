// ids of messages sent by the .bot (sim) chat — so a reply to them continues that chat
export const simMessages = new Map(); // messageId -> chat jid
export function rememberSim(id, jid) {
  if (!id) return;
  simMessages.set(id, jid);
  if (simMessages.size > 500) simMessages.delete(simMessages.keys().next().value);
}
