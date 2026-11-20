'use client';

// Una barra de pestañas que manda la URL (?pestana=), con el mismo aspecto que Tabs de la guía. Tabs guarda la
// pestaña en el fragmento y pinta paneles; aquí la pestaña es un filtro más de la lista, así que va con urlState.
export function BarraPestanas<K extends string>({ pestanas, activa, onCambiar }: { pestanas: { key: K; label: string; count?: number }[]; activa: K; onCambiar: (k: K) => void }) {
    return (
        <div role="tablist" className="no-scrollbar mb-4 flex gap-1 overflow-x-auto border-b border-control">
            {pestanas.map((t) => {
                const on = activa === t.key;
                return (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onCambiar(t.key)}
                        className={`-mb-px flex items-center gap-1.5 border-b-[3px] px-3.5 py-2 text-body font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on ? 'border-primary text-primary-strong' : 'border-transparent text-ink hover:border-control'
                        }`}
                    >
                        {t.label}
                        {t.count !== undefined && (
                            <span className={`rounded-full px-1.5 text-small font-medium tabular-nums ${on ? 'bg-primary-soft text-primary-strong' : 'bg-surface-3 text-ink'}`}>{t.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
