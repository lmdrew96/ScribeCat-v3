import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCallback, useEffect, useRef } from 'react';

interface HandwritingCanvasProps {
  open: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}

export function HandwritingCanvas({ open, onClose, onSave }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.min(window.innerWidth * 0.8, 1200);
    canvas.height = Math.min(window.innerHeight * 0.6, 800);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctxRef.current = ctx;
  }, [open]);

  const start = useCallback((x: number, y: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  }, []);

  const move = useCallback((x: number, y: number) => {
    const ctx = ctxRef.current;
    if (!ctx || !drawing.current) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const end = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.closePath();
    drawing.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      (canvas as HTMLCanvasElement).setPointerCapture(e.pointerId);
      start(e.offsetX, e.offsetY);
    };
    const handlePointerMove = (e: PointerEvent) => move(e.offsetX, e.offsetY);
    const handlePointerUp = (e: PointerEvent) => {
      (canvas as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      end();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [start, move, end]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'));
    if (!blob) return;
    const file = new File([blob], `handwriting-${Date.now()}.png`, { type: 'image/png' });
    await onSave(file);
    onClose();
  }, [onSave, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Handwriting Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <canvas ref={canvasRef} className="w-full border rounded bg-white" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={handleSave}>
              Save handwriting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

