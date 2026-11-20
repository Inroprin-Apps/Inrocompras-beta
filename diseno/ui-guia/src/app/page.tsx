import { redirect } from 'next/navigation';

// La raíz lleva al manual: es la puerta de entrada a la guía. La introducción de la guía vive en /introduccion.
export default function Raiz() {
    redirect('/manual');
}
