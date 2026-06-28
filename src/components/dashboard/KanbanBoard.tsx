'use client';

import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { StageColumn } from './StageColumn';
import { DashboardStats } from './DashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useCandidates } from '@/hooks/useCandidates';
import type { ApplicationStatus } from '@/types';

const STAGES: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => (
          <div key={s} className="flex min-w-[240px] flex-1 flex-col gap-3">
            <Skeleton className="h-9 rounded-lg" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { candidates, loading, error, updateStage } = useCandidates();

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    updateStage(draggableId, destination.droppableId as ApplicationStatus);
  }

  if (loading) return <BoardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  const byStage = Object.fromEntries(
    STAGES.map((stage) => [stage, candidates.filter((c) => c.stage === stage)]),
  ) as Record<ApplicationStatus, typeof candidates>;

  return (
    <div className="space-y-6">
      <DashboardStats candidates={candidates} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <StageColumn key={stage} stage={stage} candidates={byStage[stage]} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
