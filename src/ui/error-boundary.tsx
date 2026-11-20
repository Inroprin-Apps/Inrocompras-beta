'use client';

// LO QUE SE ROMPE AQUÍ DENTRO NO SE LLEVA LA PANTALLA. Viene de GRAMA (shared/ui/error-boundary).
//
// En React un error al pintar sube hasta arriba y desmonta el árbol entero: un solo registro con el dato raro
// deja la pantalla en blanco, y con ella los otros quince que estaban bien. En una pantalla de trabajo eso no es
// un fallo aislado, es no poder trabajar. Y una frontera de error solo se puede escribir como CLASE:
// `componentDidCatch` no tiene equivalente en hooks.
//
// Atrapa lo que pasa AL PINTAR y en los efectos de sus hijos. NO atrapa lo que pasa dentro de un manejador de
// eventos (ahí el error no rompe nada por sí solo) ni lo que falla en el servidor antes de llegar.
//
// EL ERROR CRUDO SIEMPRE VA AL LOG. Lo que se enseña es una frase legible; lo que se registra es el error entero
// con su traza. Tragarse uno para que la pantalla quede limpia es cómo se acaba con un fallo que nadie puede
// reproducir. `onError` es el sitio para mandarlo fuera (el servicio de errores de cada app); GRAMA lo manda a
// PostHog y aquí cada app decide.
import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
    {
        children: ReactNode;
        /** Qué se pinta en su lugar. Recibe el error para poder decir algo concreto. */
        fallback: (error: Error) => ReactNode;
        /** Para el log: qué zona de la pantalla es esta. */
        label: string;
        /**
         * CUANDO ESTO CAMBIA, SE VUELVE A INTENTAR. Sin esto, una frontera que ya se rompió se queda rota para
         * siempre: elegir OTRO registro seguiría enseñando el aviso del anterior. Se le pasa el id de lo que pinta.
         */
        resetKey?: string | null;
        /** Mandar el error fuera (servicio de errores). Recibe la zona para poder agrupar. */
        onError?: (report: { zone: string; message: string; stack?: string }) => void;
    },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidUpdate(prev: { resetKey?: string | null }) {
        if (this.state.error !== null && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[ErrorBoundary] ${this.props.label}:`, error, info.componentStack);
        // Se manda también la ZONA: es lo que permite contar «esto pasa en el editor» en vez de cien errores sueltos.
        this.props.onError?.({ zone: this.props.label, message: error.message, stack: error.stack?.slice(0, 2000) });
    }

    render() {
        return this.state.error === null ? this.props.children : this.props.fallback(this.state.error);
    }
}
