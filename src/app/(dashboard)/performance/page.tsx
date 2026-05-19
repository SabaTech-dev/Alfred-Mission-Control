import { Suspense } from "react";
import { PerformanceClient } from "@/components/PerformanceClient";

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Monitoreo de Rendimiento
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Seguimiento continuo de métricas de rendimiento, alertas y tendencias históricas
          </p>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }}></div>
            <p style={{ color: "var(--text-secondary)" }}>Cargando métricas de rendimiento...</p>
          </div>
        </div>
      }>
        <PerformanceClient />
      </Suspense>
    </div>
  );
}