// Mientras carga: la silueta de una lista, sin texto que salte.
export default function Cargando() {
    return (
        <div aria-busy="true" aria-label="Cargando" className="mt-12 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-card bg-surface-3" />
            ))}
        </div>
    );
}
