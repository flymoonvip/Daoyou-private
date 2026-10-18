import { useCultivatorDisplayProjection } from '@app/components/feature/cultivator/useCultivatorDisplayProjection';
import { CaveHubContent } from '@app/components/feature/home/CaveHubContent';
import { HomeAside } from '@app/components/feature/home/HomeAside';
import { GameSceneFrame } from '@app/components/game-shell/GameSceneFrame';

export function HomeView() {
  const projection = useCultivatorDisplayProjection();
  const cultivator = projection.data?.cultivator;

  if (!cultivator) {
    return <CaveHubContent />;
  }

  return (
    <GameSceneFrame
      title="洞府"
      aside={cultivator.id ? <HomeAside cultivatorId={cultivator.id} /> : undefined}
    >
      <CaveHubContent />
    </GameSceneFrame>
  );
}
