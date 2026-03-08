# PDF Viewer Libraries for React and Next.js (2024 Research)

## Top PDF Viewer Libraries

### 1. React-PDF

- **Package**: `react-pdf`
- **GitHub**: <https://github.com/wojtekmaj/react-pdf>
- **Pros**:
  - Open-source (MIT License)
  - Lightweight and simple
  - Works with React 16.8+
- **Cons**:
  - Limited advanced features
  - SSR challenges

### 2. React PDF Viewer

- **Package**: `@react-pdf-viewer/core`
- **Pros**:
  - Modular architecture
  - Plugin-based system
  - Advanced annotation features
- **Cons**:
  - Commercial library
  - Limited updates since 2023

### 3. PDF.js (Mozilla)

- **Package**: `pdfjs-dist`
- **Pros**:
  - Open-source
  - Robust rendering engine
  - Foundation for many React PDF libraries
- **Cons**:
  - Requires manual integration
  - No built-in React components

## Implementation Best Practices

### Next.js Configuration

```javascript
// next.config.js
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.node/,
      use: 'raw-loader',
    });
    return config;
  },
};
```
### SSR-Safe PDF Viewer Component
```jsx
'use client'
import dynamic from 'next/dynamic'
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const LazyPdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false
})

export default function PDFViewerWrapper({ src }) {
  return <LazyPdfViewer src={src} />
}
```
### Full PDF Viewer Component

```jsx
'use client'
import { useState } from 'react';
import { Document, Page } from 'react-pdf';

export default function PdfViewer({ src }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div>
      <Document
        file={src}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>
      <div>
        <p>Page {pageNumber} of {numPages}</p>
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(p => p - 1)}
        >
          Previous
        </button>
        <button
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```
## Performance Considerations
- Use web workers for parsing
- Lazy load PDF viewer components
- Implement pagination for large documents
- Use server-side storage for PDF files

## Recommended Libraries
- **Simple Projects**: React-PDF
- **Enterprise/Advanced**: Nutrient Web SDK
- **Custom Requirements**: PDF.js with custom React wrapper

## Installation
```bash
# React-PDF
npm install react-pdf pdfjs-dist

# PDF.js
npm install pdfjs-dist

# React PDF Viewer
npm install @react-pdf-viewer/core
```

## Browser Compatibility

- Requires modern browsers supporting ES6
- Polyfills recommended for older browsers
- Test across Chrome, Firefox, Safari, and Edge

## Limitations

- Server-side rendering challenges
- Performance with large/complex PDFs
- Annotation and form interaction varies by library

## Recommended GitHub Resources

1. <https://github.com/wojtekmaj/react-pdf>
2. <https://github.com/pdf-viewer-react/starter-rp-next-js>
3. <https://github.com/hersharan/react-nextjs-pdf-viewer-examples>

## Further Research

- Investigate WebAssembly-based PDF rendering
- Explore PDF.js advanced features
- Compare performance across different libraries
