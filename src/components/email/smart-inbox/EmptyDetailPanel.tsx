import { Mail } from 'lucide-react';

export const EmptyDetailPanel = () => (
  <div className="h-full flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
    <div className="text-center space-y-4 p-8">
      <div className="text-6xl mb-4">📧</div>
      <h3 className="text-lg font-semibold">Seleziona una email</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Clicca su una email dalla lista per visualizzarne i dettagli completi
      </p>
    </div>
  </div>
);
