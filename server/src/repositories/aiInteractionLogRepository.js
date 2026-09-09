import { AiInteractionLog } from '../models/AiInteractionLog.js';

export function record({ userId, operation, promptVersion, status, latencyMs }) {
  return AiInteractionLog.create({ user: userId, operation, promptVersion, status, latencyMs });
}

export function aggregateUsage() {
  return AiInteractionLog.aggregate([
    {
      $group: {
        _id: { operation: '$operation', status: '$status' },
        count: { $sum: 1 },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { '_id.operation': 1, '_id.status': 1 } },
  ]);
}
