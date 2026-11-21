# Para devolver a la guía UI

La guía (`diseno/ui-guia/`) es la fuente: lo que INROCOMPRAS cambió o agregó en su copia (`src/shared/ui/`) tiene que
volver a la guía, o la próxima app copiará la versión vieja.

## Correcciones a componentes de la guía

| Componente                        | Qué se cambió                                                  | Por qué                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bits.tsx` · `T.thNum`, `T.tdNum` | `text-right`                                                   | La guía dice «los números a la derecha y su cabecera alineada igual», pero las clases no lo hacían: cada pantalla tenía que acordarse. |
| `card.tsx` · `Segmented`          | `min-h-9 sm:min-h-0`                                           | Medía ~30 px; la guía pide ≥ 36 px para lo que se toca en el celular.                                                                  |
| `select-menu.tsx`                 | Dentro de un `<dialog>` la lista se abre en línea              | El diálogo recorta lo que desborda y la lista quedaba cortada.                                                                         |
| `select-menu.tsx`                 | Las opciones largas pasan a dos líneas; el botón lleva `title` | Los nombres de proyecto largos se cortaban con «…» justo al elegir.                                                                    |

## Componentes nuevos (la guía los tenía como pendientes)

| Componente              | Dónde                                            | Qué resuelve                                                                                                                                                |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diálogo                 | `src/shared/ui/dialog.tsx`                       | `<dialog>` nativo (foco atrapado, Esc, foco de vuelta). `onEnviar` (Enter guarda), `amplio` (720 px), `useCerrarConCambios` (aviso de cambios sin guardar). |
| Ficha lateral           | `src/shared/ui/ficha.tsx`                        | Detalle de una fila a la derecha. Encima de la lista hasta 1535 px; desde 1536 px la corre; 640 px desde 1920 px.                                           |
| Encabezado              | `src/shared/ui/encabezado.tsx`                   | Título + «Actualizado hoy a las 10:42» + botón principal (patrón Listado).                                                                                  |
| Lista con cinco estados | `src/shared/ui/lista-estado.tsx`                 | Cargando, vacía, error con reintentar, parcial y completa.                                                                                                  |
| Exportar Excel          | `src/shared/exportar/excel.ts` + `BotonExportar` | Lo que se ve con los filtros; montos como número y moneda en su columna.                                                                                    |
| Borrar con deshacer     | `src/app/(app)/_lib/deshacer.ts`                 | La fila se oculta, el aviso ofrece «Deshacer» 5 s y recién entonces se borra.                                                                               |

## Decisiones de uso que conviene escribir en la guía

- **Botón en curso:** el gerundio del verbo de la etiqueta («Emitir solicitud» → «Emitiendo solicitud…»).
- **Aviso tras una acción:** la acción y el registro («Aprobar OC-2026-0142: hecho.»).
- **Fondo del diálogo:** `backdrop:bg-ink/30`. Es el único alfa de la app y no lleva texto encima; la guía no tiene token
  para esto.
