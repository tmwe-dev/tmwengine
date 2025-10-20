import { DesignLabComponent } from "@/types/design-lab";

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number;
  source: 'canvas-start' | 'canvas-end' | 'component-start' | 'component-end' | 'component-center';
}

export interface SnapResult {
  x: number;
  y: number;
  activeGuides: GuideLine[];
}

/**
 * Calcola tutte le guide possibili basandosi su canvas e componenti esistenti
 */
export function getGuideLines(
  canvasWidth: number,
  canvasHeight: number,
  components: DesignLabComponent[],
  excludeComponentId?: string
): GuideLine[] {
  const guides: GuideLine[] = [];

  // Guide dai bordi del canvas
  guides.push(
    { type: 'vertical', position: 0, source: 'canvas-start' },
    { type: 'vertical', position: canvasWidth, source: 'canvas-end' },
    { type: 'horizontal', position: 0, source: 'canvas-start' },
    { type: 'horizontal', position: canvasHeight, source: 'canvas-end' }
  );

  // Guide dagli altri componenti
  components
    .filter(c => c.id !== excludeComponentId)
    .forEach(component => {
      const pos = component.position as { x: number; y: number; width: number; height: number };
      
      // Guide verticali (bordi sinistro, centro, destro)
      guides.push(
        { type: 'vertical', position: pos.x, source: 'component-start' },
        { type: 'vertical', position: pos.x + pos.width / 2, source: 'component-center' },
        { type: 'vertical', position: pos.x + pos.width, source: 'component-end' }
      );

      // Guide orizzontali (bordi superiore, centro, inferiore)
      guides.push(
        { type: 'horizontal', position: pos.y, source: 'component-start' },
        { type: 'horizontal', position: pos.y + pos.height / 2, source: 'component-center' },
        { type: 'horizontal', position: pos.y + pos.height, source: 'component-end' }
      );
    });

  return guides;
}

/**
 * Applica snap magnetico alla posizione e ritorna le guide attive
 */
export function snapToGuides(
  x: number,
  y: number,
  width: number,
  height: number,
  guides: GuideLine[],
  snapThreshold: number = 8
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const activeGuides: GuideLine[] = [];

  // Punti di snap del componente che stiamo muovendo
  const componentPoints = {
    left: x,
    right: x + width,
    centerX: x + width / 2,
    top: y,
    bottom: y + height,
    centerY: y + height / 2,
  };

  // Trova la guida verticale più vicina
  let minVerticalDistance = snapThreshold;
  let verticalSnapGuide: GuideLine | null = null;
  let verticalSnapOffset = 0;

  guides
    .filter(g => g.type === 'vertical')
    .forEach(guide => {
      // Controlla distanza da left, center, right
      const distances = [
        { offset: guide.position - componentPoints.left, point: 'left' },
        { offset: guide.position - componentPoints.centerX, point: 'center' },
        { offset: guide.position - componentPoints.right, point: 'right' },
      ];

      distances.forEach(({ offset, point }) => {
        const distance = Math.abs(offset);
        if (distance < minVerticalDistance) {
          minVerticalDistance = distance;
          verticalSnapGuide = guide;
          verticalSnapOffset = offset;
          
          // Calcola la nuova posizione X in base al punto di snap
          if (point === 'left') {
            snappedX = guide.position;
          } else if (point === 'center') {
            snappedX = guide.position - width / 2;
          } else if (point === 'right') {
            snappedX = guide.position - width;
          }
        }
      });
    });

  if (verticalSnapGuide) {
    activeGuides.push(verticalSnapGuide);
  }

  // Trova la guida orizzontale più vicina
  let minHorizontalDistance = snapThreshold;
  let horizontalSnapGuide: GuideLine | null = null;
  let horizontalSnapOffset = 0;

  guides
    .filter(g => g.type === 'horizontal')
    .forEach(guide => {
      // Controlla distanza da top, center, bottom
      const distances = [
        { offset: guide.position - componentPoints.top, point: 'top' },
        { offset: guide.position - componentPoints.centerY, point: 'center' },
        { offset: guide.position - componentPoints.bottom, point: 'bottom' },
      ];

      distances.forEach(({ offset, point }) => {
        const distance = Math.abs(offset);
        if (distance < minHorizontalDistance) {
          minHorizontalDistance = distance;
          horizontalSnapGuide = guide;
          horizontalSnapOffset = offset;
          
          // Calcola la nuova posizione Y in base al punto di snap
          if (point === 'top') {
            snappedY = guide.position;
          } else if (point === 'center') {
            snappedY = guide.position - height / 2;
          } else if (point === 'bottom') {
            snappedY = guide.position - height;
          }
        }
      });
    });

  if (horizontalSnapGuide) {
    activeGuides.push(horizontalSnapGuide);
  }

  return {
    x: snappedX,
    y: snappedY,
    activeGuides,
  };
}
