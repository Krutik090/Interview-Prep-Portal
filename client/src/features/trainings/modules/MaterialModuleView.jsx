import { Check } from 'lucide-react';
import { useMarkModuleReadMutation } from '../../submissions/submissionsApi.js';
import { sanitizeHtml } from '../../../lib/sanitizeHtml.js';
import Button from '../../../components/ui/Button.jsx';

export default function MaterialModuleView({ programId, module, progress }) {
  const [markRead, { isLoading }] = useMarkModuleReadMutation();
  const done = progress?.status === 'completed' || progress?.status === 'failed';

  return (
    <div className="flex flex-col gap-4">
      {module.instructions && <p className="text-[13px] text-muted">{module.instructions}</p>}

      {/* Admin-authored rich text: sanitized server-side before storage and
          again here (DOMPurify) before rendering. */}
      <div
        className="max-w-[68ch] text-sm leading-relaxed text-ink/85 [&_a]:text-brand [&_a]:underline [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(module.contentBody) }}
      />

      {module.videoUrl && (
        <a
          href={module.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-brand underline underline-offset-2"
        >
          Watch the video for this module
        </a>
      )}

      <div>
        <Button
          variant={done ? 'secondary' : 'primary'}
          icon={done ? Check : undefined}
          disabled={done || isLoading}
          onClick={() => markRead({ programId, moduleId: module._id })}
        >
          {done ? 'Marked as read' : isLoading ? 'Saving' : 'Mark as read'}
        </Button>
      </div>
    </div>
  );
}
