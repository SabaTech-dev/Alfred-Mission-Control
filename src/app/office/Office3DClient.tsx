'use client';

import dynamic from 'next/dynamic';

const Office3D = dynamic(() => import('@/components/Office3D/Office3D'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center" style={{ height: '100vh', width: '100vw' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-warning mx-auto mb-4" />
        <p className="text-neutral-400 text-lg">Loading office...</p>
      </div>
    </div>
  ),
});

export default function Office3DClient({ initialAgents }: { initialAgents: unknown[] }) {
  return <Office3D initialAgents={initialAgents} />;
}
