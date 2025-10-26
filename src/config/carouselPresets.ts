/**
 * Radio Carousel 3D - Configuration Presets
 * 
 * Collezione di configurazioni salvate per diversi effetti visivi del carosello 3D
 */

export interface CarouselPreset {
  name: string;
  description: string;
  camera: {
    fov: { mobile: number; desktop: number };
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
  };
  carousel: {
    radius: number;
    meshYPosition: number;
    meshLookAt: { x: number; y: number; z: number };
  };
  geometry: {
    width: number;
    height: number;
    scaleFactor: string; // Formula come stringa
  };
  lighting: {
    ambient: { color: string; intensity: number };
    point: { color: string; intensity: number; distance: number };
  };
  created: string;
  author: string;
}

/**
 * TRAPEZOID EFFECT PRESET
 * 
 * Configurazione salvata il 26 ottobre 2025
 * Crea un effetto prospettico trapezoidale con card inclinate verso il basso
 * 
 * CARATTERISTICHE:
 * - Card posizionate in alto (Y=1.5) ma orientate verso il centro basso (Y=0)
 * - Crea inclinazione prospettica che fa apparire la card come un trapezio
 * - Parte superiore più lontana, parte inferiore più vicina alla camera
 * - Effetto visivo molto cinematografico e dinamico
 */
export const TRAPEZOID_CAROUSEL: CarouselPreset = {
  name: "Trapezoid Perspective Effect",
  description: "Card inclinate con effetto trapezio prospettico. Le card sono posizionate in alto (Y=1.5) ma guardano verso il centro basso (Y=0), creando un'inclinazione visiva unica.",
  
  camera: {
    fov: {
      mobile: 62,
      desktop: 67
    },
    position: {
      x: 0,
      y: 0,
      z: 13.5
    },
    lookAt: {
      x: 0,
      y: 1.5,
      z: 0
    }
  },
  
  carousel: {
    radius: 7.8,
    meshYPosition: 1.5, // 🔑 KEY: Card sollevate in alto
    meshLookAt: {
      x: 0,
      y: 0, // 🔑 KEY: Ma guardano verso il centro basso (crea trapezio)
      z: 0
    }
  },
  
  geometry: {
    width: 4.83,
    height: 7.04,
    scaleFactor: "Math.min(window.innerWidth / 1200, 2.0)"
  },
  
  lighting: {
    ambient: {
      color: "0xffffff",
      intensity: 0.6
    },
    point: {
      color: "0x8b5cf6",
      intensity: 1,
      distance: 100
    }
  },
  
  created: "2025-10-26",
  author: "Luca (user experiment)"
};

/**
 * DEFAULT FLAT PRESET
 * 
 * Configurazione standard con card piatte (non inclinate)
 * Per confronto con effetto trapezio
 */
export const DEFAULT_FLAT_CAROUSEL: CarouselPreset = {
  name: "Default Flat Carousel",
  description: "Configurazione standard con card perfettamente verticali, senza inclinazione prospettica.",
  
  camera: {
    fov: {
      mobile: 62,
      desktop: 67
    },
    position: {
      x: 0,
      y: 0,
      z: 13.5
    },
    lookAt: {
      x: 0,
      y: 1.5,
      z: 0
    }
  },
  
  carousel: {
    radius: 7.8,
    meshYPosition: 1.5,
    meshLookAt: {
      x: 0,
      y: 1.5, // 🔑 Stessa altezza = nessuna inclinazione
      z: 0
    }
  },
  
  geometry: {
    width: 4.83,
    height: 7.04,
    scaleFactor: "Math.min(window.innerWidth / 1200, 2.0)"
  },
  
  lighting: {
    ambient: {
      color: "0xffffff",
      intensity: 0.6
    },
    point: {
      color: "0x8b5cf6",
      intensity: 1,
      distance: 100
    }
  },
  
  created: "2025-10-26",
  author: "Default configuration"
};

/**
 * Utility per applicare un preset al carosello
 */
export const applyPreset = (preset: CarouselPreset) => {
  console.log(`📦 Applying carousel preset: ${preset.name}`);
  console.log(`📝 Description: ${preset.description}`);
  return preset;
};

/**
 * Export tutti i preset disponibili
 */
export const CAROUSEL_PRESETS = {
  TRAPEZOID: TRAPEZOID_CAROUSEL,
  DEFAULT: DEFAULT_FLAT_CAROUSEL
} as const;
