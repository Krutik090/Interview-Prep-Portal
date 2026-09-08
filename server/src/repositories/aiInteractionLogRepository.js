import { AiInteractionLog } from '../models/AiInteractionLog.js';

export function record({ userId, operation, promptVersion, status, latencyMs }) {
  return AiInteractionLog.create({ user: userId, operation, promptVersion, status, latencyMs });
}
