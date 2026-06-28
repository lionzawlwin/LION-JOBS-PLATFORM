import { Droppable, Draggable } from '@hello-pangea/dnd';
import { CandidateCard } from './CandidateCard';
import { cn } from '@/lib/utils';
import type { Candidate, ApplicationStatus } from '@/types';

interface StageMeta {
  dot: string;
  header: string;
}

const STAGE_META: Record<ApplicationStatus, StageMeta> = {
  Applied: {
    dot: 'bg-blue-500',
    header: 'border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-900/10',
  },
  Shortlisted: {
    dot: 'bg-amber-500',
    header: 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10',
  },
  Interview: {
    dot: 'bg-purple-500',
    header: 'border-purple-200 bg-purple-50/50 dark:border-purple-800/40 dark:bg-purple-900/10',
  },
  Hired: {
    dot: 'bg-green-500',
    header: 'border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10',
  },
};

interface Props {
  stage: ApplicationStatus;
  candidates: Candidate[];
}

export function StageColumn({ stage, candidates }: Props) {
  const meta = STAGE_META[stage];

  return (
    <div className="flex min-w-[240px] flex-1 flex-col gap-3">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border px-3 py-2',
          meta.header,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
          <span className="text-sm font-semibold text-foreground">{stage}</span>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {candidates.length}
        </span>
      </div>

      {/* Droppable list */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex min-h-[120px] flex-col gap-2 rounded-xl p-2 transition-colors',
              snapshot.isDraggingOver
                ? 'bg-brand-50/60 dark:bg-brand-600/5'
                : 'bg-transparent',
            )}
          >
            {candidates.map((candidate, index) => (
              <Draggable
                key={candidate.id}
                draggableId={candidate.id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      'cursor-grab active:cursor-grabbing transition-transform',
                      snapshot.isDragging && 'rotate-1 scale-[1.02] opacity-90',
                    )}
                  >
                    <CandidateCard candidate={candidate} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {candidates.length === 0 && !snapshot.isDraggingOver && (
              <p className="py-6 text-center text-xs text-muted-foreground/50">
                Drop candidates here
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
