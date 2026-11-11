import { SharedSpineRenderer } from '@app/lib/spine/vendor/SharedSpineRenderer';
import type { SpineModelConfig } from '@app/lib/spine/registry';
import { cn } from '@app/lib/cn';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * 用 pixi-spine 渲染真实骨骼动画。
 *
 * 该组件会静态引入 pixi.js，调用方必须用 `React.lazy` 加载，
 * 避免把渲染器塞进首屏主包。
 */
export function SpineFigure({
  model,
  label,
  className,
  fallback,
}: {
  model: SpineModelConfig;
  label: string;
  className?: string;
  /** 模型缺失或渲染失败时退回的静态墨像 */
  fallback?: ReactNode;
}) {
  const rawId = useId();
  const instanceId = `spine-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    setFailed(false);

    SharedSpineRenderer.load({
      id: instanceId,
      jsonUrl: model.jsonUrl,
      atlasUrl: model.atlasUrl,
      animation: model.animation,
      loop: true,
    })
      .then(() => {
        if (disposed) {
          SharedSpineRenderer.remove(instanceId);
          return;
        }
        SharedSpineRenderer.bindCanvas(mount, instanceId);
      })
      .catch((reason: unknown) => {
        console.error(`[SpineFigure] ${model.slug} 加载失败`, reason);
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      SharedSpineRenderer.remove(instanceId);
    };
  }, [instanceId, model]);

  if (failed) return <>{fallback}</>;

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label={label}
      className={cn('relative overflow-hidden', className)}
    />
  );
}
