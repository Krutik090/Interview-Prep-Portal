import { useMarkModuleReadMutation } from '../../submissions/submissionsApi.js';

export default function MaterialModuleView({ programId, module, progress }) {
  const [markRead, { isLoading }] = useMarkModuleReadMutation();
  const done = progress?.status === 'completed' || progress?.status === 'failed';

  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap text-sm">{module.contentBody}</p>
      {module.videoUrl && (
        <a href={module.videoUrl} target="_blank" rel="noreferrer" className="text-sm underline">
          Watch video
        </a>
      )}
      <button
        disabled={done || isLoading}
        onClick={() => markRead({ programId, moduleId: module._id })}
        className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {done ? 'Marked as read' : isLoading ? 'Saving...' : 'Mark as read'}
      </button>
    </div>
  );
}
