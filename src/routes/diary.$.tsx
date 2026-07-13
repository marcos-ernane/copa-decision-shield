import { createFileRoute } from '@tanstack/react-router';
import { DiaryShell, type DiaryTab } from '@/components/diary/DiaryShell';
import { OperatorManual } from '@/components/manual/OperatorManual';

function DiarySplat() {
  const { _splat } = Route.useParams();
  const key = (_splat ?? '').split('/')[0];

  let active: DiaryTab = 'timeline';
  if (key === 'principles') active = 'principles';
  else if (key === 'symptoms') active = 'symptoms';
  else if (key === 'gargalos') active = 'gargalos';
  else if (key === 'weekly') active = 'weekly';
  else if (key === 'manual') active = 'manual';

  if (active === 'manual') {
    return <DiaryShell active="manual"><OperatorManual /></DiaryShell>;
  }
  return <DiaryShell active={active} />;
}

export const Route = createFileRoute('/diary/$')({
  component: DiarySplat,
});
