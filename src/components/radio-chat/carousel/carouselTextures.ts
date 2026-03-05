import * as THREE from 'three';
import { RadioMessage } from '@/types/radio';

/** Color config per sender type */
const GRADIENT_CONFIG = {
  human: {
    from: 'rgba(59, 130, 246, 0.1)',
    to: 'rgba(37, 99, 235, 0.05)',
    border: 'rgba(59, 130, 246, 0.2)',
    title: '#1e40af',
    badge: '#2563eb'
  },
  chatgpt: {
    from: 'rgba(34, 197, 94, 0.1)',
    to: 'rgba(22, 163, 74, 0.05)',
    border: 'rgba(34, 197, 94, 0.2)',
    title: '#166534',
    badge: '#16a34a'
  },
  gemini: {
    from: 'rgba(6, 182, 212, 0.1)',
    to: 'rgba(8, 145, 178, 0.05)',
    border: 'rgba(6, 182, 212, 0.2)',
    title: '#155e75',
    badge: '#0891b2'
  },
  claude: {
    from: 'rgba(168, 85, 247, 0.1)',
    to: 'rgba(147, 51, 234, 0.05)',
    border: 'rgba(168, 85, 247, 0.2)',
    title: '#6b21a8',
    badge: '#9333ea'
  }
} as const;

const CARD_W = 800;
const CARD_H = 1100;

export const createTextTexture = (message: RadioMessage, renderer?: THREE.WebGLRenderer): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const DPR = window.devicePixelRatio || 2;

  canvas.width = CARD_W * DPR;
  canvas.height = CARD_H * DPR;
  ctx.scale(DPR, DPR);

  const senderType = message.sender_type as keyof typeof GRADIENT_CONFIG;
  const colors = GRADIENT_CONFIG[senderType];

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  gradient.addColorStop(0, colors.from);
  gradient.addColorStop(1, colors.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Border
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, CARD_W - 3, CARD_H - 3);

  // Mirror horizontally
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-CARD_W, 0);

  // Badge
  const badgeText = senderType.toUpperCase();
  const badgePadding = 12;
  const badgeHeight = 32;
  ctx.font = 'bold 18px sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + badgePadding * 2;
  ctx.fillStyle = colors.badge;
  ctx.fillRect(20, 20, badgeWidth, badgeHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, 20 + badgeWidth / 2, 20 + badgeHeight / 2 + 6);

  // Title
  ctx.fillStyle = colors.title;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message.sender_name, CARD_W / 2, 80);

  // Body text
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'left';

  const lineHeight = 32;
  const maxWidth = CARD_W - 80;
  const words = message.content.split(' ');
  let x = 40;
  let y = 140;
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  ctx.restore();

  // Texture with optimal filtering
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;

  return texture;
};

export const createEmptyTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const DPR = window.devicePixelRatio || 2;
  canvas.width = CARD_W * DPR;
  canvas.height = CARD_H * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};
