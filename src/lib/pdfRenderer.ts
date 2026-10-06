import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker pdfjs
if (typeof window !== 'undefined') {
  // Utilise un worker CDN compatible ou worker local
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export async function convertPdfPageToImage(file: File, pageNumber: number = 1, scale: number = 2.0): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Impossible de créer le contexte canvas 2D');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await (page.render(renderContext as any) as any).promise;
  return canvas.toDataURL('image/png');
}
