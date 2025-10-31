import * as THREE from 'three';
import { EmailSenderGroup } from '@/types/email-management';
import { SenderAnalysis } from '@/types/email-management';

export const createCategoryTexture = (
  group: EmailSenderGroup,
  assignedSenders: SenderAnalysis[] = [],
  renderer?: THREE.WebGLRenderer
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');

  // Dimensioni ottimizzate per qualità HD
  const W = 800;
  const H = 1100;
  const DPR = window.devicePixelRatio || 2;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // Background con gradiente del colore del gruppo
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, group.colore + '4D'); // 30% opacity
  gradient.addColorStop(1, group.colore + '1F'); // 12% opacity
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Bordo colorato
  ctx.strokeStyle = group.colore + '80'; // 50% opacity
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Icona + Nome gruppo (top)
  ctx.fillStyle = group.colore;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(group.icon + ' ' + group.nome_gruppo, W / 2, 80);
  ctx.shadowColor = 'transparent'; // Reset shadow

  // Contatore mittenti
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText(String(assignedSenders.length), W / 2, 250);
  ctx.shadowColor = 'transparent'; // Reset shadow

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#a0a0a0';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText('mittenti assegnati', W / 2, 290);
  ctx.shadowColor = 'transparent'; // Reset shadow

  // Lista mittenti (scrollabile visualmente)
  ctx.font = '20px monospace';
  ctx.textAlign = 'left';
  let y = 360;

  const maxVisible = 15;
  assignedSenders.slice(0, maxVisible).forEach((sender) => {
    // Nome mittente con shadow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`• ${sender.companyName}`, 40, y);

    // Contatore email con shadow
    ctx.fillStyle = '#a0a0a0';
    ctx.textAlign = 'right';
    ctx.fillText(`${sender.emailCount} email`, W - 40, y);
    ctx.textAlign = 'left';
    ctx.shadowColor = 'transparent'; // Reset shadow

    y += 40;
  });

  // "..." se ci sono più mittenti
  if (assignedSenders.length > maxVisible) {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(
      `... e altri ${assignedSenders.length - maxVisible} mittenti`,
      W / 2,
      y + 20
    );
    ctx.shadowColor = 'transparent'; // Reset shadow
  }

  // Crea texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() || 4;
  texture.needsUpdate = true;

  return texture;
};

export const createEmptyTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');

  const W = 800;
  const H = 1100;
  const DPR = window.devicePixelRatio || 2;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // Background scuro
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  // Testo placeholder
  ctx.fillStyle = '#666666';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Empty Slot', W / 2, H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
};
