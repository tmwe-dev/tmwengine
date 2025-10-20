import { DesignLabComponent } from "@/types/design-lab";

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number;
  source: 'canvas-start' | 'canvas-end' | 'component-start' | 'component-end' | 'component-center' | 'grid';
}

export interface DistanceInfo {
  direction: 'top' | 'bottom' | 'left' | 'right';
  distance: number;
  fromComponentId: string;
  x: number;
  y: number;
}

export interface SnapResult {
  x: number;
  y: number;
  activeGuides: GuideLine[];
}

/**
 * Genera guide griglia ogni 10 pixel
 */
export function generateGridGuides(
  canvasWidth: number,
  canvasHeight: number
): GuideLine[] {
  const guides: GuideLine[] = [];

  // Guide verticali ogni 10px
  for (let x = 0; x <= canvasWidth; x += 10) {
    guides.push({ type: 'vertical', position: x, source: 'grid' });
  }

  // Guide orizzontali ogni 10px
  for (let y = 0; y <= canvasHeight; y += 10) {
    guides.push({ type: 'horizontal', position: y, source: 'grid' });
  }

  return guides;
}

/**
 * Calcola tutte le guide possibili basandosi su canvas e componenti esistenti
 */
export function getGuideLines(
  canvasWidth: number,
  canvasHeight: number,
  components: DesignLabComponent[],
  excludeComponentId?: string,
  includeGrid: boolean = false
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

  // Aggiungi guide griglia se richiesto
  if (includeGrid) {
    const gridGuides = generateGridGuides(canvasWidth, canvasHeight);
    guides.push(...gridGuides);
  }

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

/**
 * Calcola distanze dall'elemento più vicino in ogni direzione
 */
export function calculateNearestDistances(
  x: number,
  y: number,
  width: number,
  height: number,
  components: DesignLabComponent[],
  excludeComponentId: string,
  threshold: number = 60
): DistanceInfo[] {
  const distances: DistanceInfo[] = [];
  const currentBounds = {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };

  let nearestTop: { distance: number; component: DesignLabComponent } | null = null;
  let nearestBottom: { distance: number; component: DesignLabComponent } | null = null;
  let nearestLeft: { distance: number; component: DesignLabComponent } | null = null;
  let nearestRight: { distance: number; component: DesignLabComponent } | null = null;

  // Trova il componente più vicino per ogni direzione
  components
    .filter(c => c.id !== excludeComponentId)
    .forEach(component => {
      const pos = component.position as { x: number; y: number; width: number; height: number };
      const compBounds = {
        left: pos.x,
        right: pos.x + pos.width,
        top: pos.y,
        bottom: pos.y + pos.height,
      };

      // Distanza TOP (componente sopra)
      if (compBounds.bottom <= currentBounds.top) {
        const distance = currentBounds.top - compBounds.bottom;
        if (distance < threshold && (!nearestTop || distance < nearestTop.distance)) {
          nearestTop = { distance, component };
        }
      }

      // Distanza BOTTOM (componente sotto)
      if (compBounds.top >= currentBounds.bottom) {
        const distance = compBounds.top - currentBounds.bottom;
        if (distance < threshold && (!nearestBottom || distance < nearestBottom.distance)) {
          nearestBottom = { distance, component };
        }
      }

      // Distanza LEFT (componente a sinistra)
      if (compBounds.right <= currentBounds.left) {
        const distance = currentBounds.left - compBounds.right;
        if (distance < threshold && (!nearestLeft || distance < nearestLeft.distance)) {
          nearestLeft = { distance, component };
        }
      }

      // Distanza RIGHT (componente a destra)
      if (compBounds.left >= currentBounds.right) {
        const distance = compBounds.left - currentBounds.right;
        if (distance < threshold && (!nearestRight || distance < nearestRight.distance)) {
          nearestRight = { distance, component };
        }
      }
    });

  // Crea DistanceInfo per ogni direzione trovata
  if (nearestTop) {
    const compPos = nearestTop.component.position as { x: number; y: number; width: number; height: number };
    distances.push({
      direction: 'top',
      distance: Math.round(nearestTop.distance),
      fromComponentId: nearestTop.component.id,
      x: currentBounds.centerX,
      y: (compPos.y + compPos.height + currentBounds.top) / 2,
    });
  }

  if (nearestBottom) {
    const compPos = nearestBottom.component.position as { x: number; y: number; width: number; height: number };
    distances.push({
      direction: 'bottom',
      distance: Math.round(nearestBottom.distance),
      fromComponentId: nearestBottom.component.id,
      x: currentBounds.centerX,
      y: (currentBounds.bottom + compPos.y) / 2,
    });
  }

  if (nearestLeft) {
    const compPos = nearestLeft.component.position as { x: number; y: number; width: number; height: number };
    distances.push({
      direction: 'left',
      distance: Math.round(nearestLeft.distance),
      fromComponentId: nearestLeft.component.id,
      x: (compPos.x + compPos.width + currentBounds.left) / 2,
      y: currentBounds.centerY,
    });
  }

  if (nearestRight) {
    const compPos = nearestRight.component.position as { x: number; y: number; width: number; height: number };
    distances.push({
      direction: 'right',
      distance: Math.round(nearestRight.distance),
      fromComponentId: nearestRight.component.id,
      x: (currentBounds.right + compPos.x) / 2,
      y: currentBounds.centerY,
    });
  }

  return distances;
}
