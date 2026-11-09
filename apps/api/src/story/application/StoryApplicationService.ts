import type { StoryView } from '@daoyou/game-domain/story';
import { playerCommandExecutor } from '@server/player/application/state/CommandExecutors.js';
import { StoryService } from '@server/story/application/StoryService.js';
import {
  incrementCounter,
  recordCounterMax,
} from '@server/achievements/application/AchievementService.js';

export function completeStoryPerformanceCommand(args: {
  userId: string;
  cultivatorId: string;
  scriptId: string;
  outcome: string;
}) {
  return playerCommandExecutor.executeWithLock({
    userId: args.userId,
    cultivatorId: args.cultivatorId,
    source: 'story_performance_complete',
    command: async (tx) => {
      const settled = await StoryService.completePerformance(
        args.cultivatorId,
        args.scriptId,
        args.outcome,
        tx,
      );
      if (settled.view.chapterId === 'arrival') {
        await recordCounterMax(args.cultivatorId, 'story.chapter', 1, tx);
      }
      return {
        result: settled.view,
        resourceChanges: settled.changes,
      };
    },
  });
}

export function completeStoryGuideCommand(args: {
  userId: string;
  cultivatorId: string;
  lessonId: string;
}) {
  return playerCommandExecutor.executeWithLock({
    userId: args.userId,
    cultivatorId: args.cultivatorId,
    source: 'story_guide_complete',
    command: async (tx) => {
      const settled = await StoryService.completeGuide(
        args.cultivatorId,
        args.lessonId,
        tx,
      );
      await incrementCounter(args.cultivatorId, 'story.guide', 1, tx);
      return {
        result: settled.view,
        resourceChanges: settled.changes,
      };
    },
  });
}

export type CompletedStoryPerformance = StoryView;
