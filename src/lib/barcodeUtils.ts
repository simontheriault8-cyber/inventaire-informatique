import { useEffect, useRef } from 'react';

/**
 * Hook personnalisé pour écouter les douchettes de code-barres USB / Bluetooth
 * Détecte une frappe clavier ultra-rapide (wedge mode) terminée par la touche 'Enter'
 */
export function useBarcodeScanner(onScan: (scannedCode: string) => void, enabled: boolean = true) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est en train de taper dans un champ de recherche ou un textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Si le délai entre deux touches est trop long (> 80ms), on réinitialise le buffer sauf si le buffer était vide
      if (timeDiff > 80 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= 3) {
          // Détection d'un scan complet
          if (!isInputField) {
            e.preventDefault();
          }
          onScan(code);
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        // Caractère imprimable
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, enabled]);
}
