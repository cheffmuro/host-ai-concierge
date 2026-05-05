const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function triggerReverseLogistics(orderId: string): Promise<{ ok: true; trackingId: string }> {
  await delay();
  void orderId;
  return { ok: true, trackingId: `RL${Date.now()}` };
}

export async function triggerHandoff(conversationId: string): Promise<{ ok: true }> {
  await delay();
  void conversationId;
  return { ok: true };
}
