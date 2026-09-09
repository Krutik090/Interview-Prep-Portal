import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, Plus, Trash2 } from 'lucide-react';
import {
  useListTrainingsQuery,
  useCreateTrainingMutation,
  useSetTrainingPublishStatusMutation,
  useDeleteTrainingMutation,
} from '../trainings/trainingsApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { Table, Th, Td, Tr } from '../../components/ui/Table.jsx';
import { EmptyState, InlineError, LoadingState } from '../../components/ui/Feedback.jsx';
import { ROUND_ORDER, ROUND_META } from '../../components/ui/meta.js';

export default function ProgramsPage() {
  const { data, isLoading } = useListTrainingsQuery();
  const [createTraining, { isLoading: creating, error }] = useCreateTrainingMutation();
  const [setPublishStatus] = useSetTrainingPublishStatusMutation();
  const [deleteTraining] = useDeleteTrainingMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', roundType: ROUND_ORDER[0], description: '' });

  async function handleCreate(e) {
    e.preventDefault();
    const result = await createTraining(form);
    if (!result.error) {
      setForm({ title: '', roundType: ROUND_ORDER[0], description: '' });
      setShowForm(false);
    }
  }

  const programs = data?.programs ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Training programs"
        description="Create a program for a round, add modules to it, then publish it for students."
        actions={
          <Button icon={Plus} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New program'}
          </Button>
        }
      />

      {showForm && (
        <Panel className="mb-5">
          <PanelHeader title="New program" description="It starts as a draft — students won't see it until you publish." />
          <form className="flex flex-col gap-4 px-5 py-5" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Title" required>
                {(a) => (
                  <Input
                    {...a}
                    placeholder="e.g. Quantitative Aptitude Bootcamp"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                )}
              </Field>
              <Field label="Interview round" required>
                {(a) => (
                  <Select
                    {...a}
                    value={form.roundType}
                    onChange={(e) => setForm((p) => ({ ...p, roundType: e.target.value }))}
                  >
                    {ROUND_ORDER.map((r) => (
                      <option key={r} value={r}>
                        {ROUND_META[r].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Description" hint="One or two sentences on what this program covers.">
              {(a) => (
                <Textarea
                  {...a}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              )}
            </Field>

            {error && <InlineError>Could not create the program. Check the title and try again.</InlineError>}

            <div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating' : 'Create program'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title={`All programs (${programs.length})`} />
        {isLoading ? (
          <LoadingState />
        ) : programs.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No programs yet"
            description="Create your first training program to get students started."
            action={
              <Button size="sm" icon={Plus} onClick={() => setShowForm(true)}>
                New program
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Program</Th>
                <Th>Round</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <Tr key={program._id}>
                  <Td>
                    <Link
                      to={`/admin/trainings/${program._id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {program.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{program.description}</p>
                  </Td>
                  <Td>
                    <RoundBadge roundType={program.roundType} />
                  </Td>
                  <Td>
                    <StatusBadge status={program.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setPublishStatus({
                            programId: program._id,
                            publish: program.status !== 'published',
                          })
                        }
                      >
                        {program.status === 'published' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        aria-label={`Delete ${program.title}`}
                        onClick={() => deleteTraining(program._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
