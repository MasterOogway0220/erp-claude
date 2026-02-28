/**
 * Wraps HTML with a print-ready script that triggers window.print()
 * and sets up @media print styles for correct page layout.
 * Used as an alternative to server-side Puppeteer PDF generation.
 */
export function wrapHtmlForPrint(html: string, landscape: boolean): string {
  const orientation = landscape ? "landscape" : "portrait";

  const printScript = `
    <style>
      @media print {
        @page {
          size: A4 ${orientation};
          margin: 10mm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      @media screen {
        body {
          max-width: ${landscape ? "297mm" : "210mm"};
          margin: 20px auto;
          padding: 10px;
          background: #f5f5f5;
        }
      }
    </style>
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 300);
      });
    </script>
  `;

  // Inject before </head> if present, otherwise before </html> or append
  if (html.includes("</head>")) {
    return html.replace("</head>", printScript + "</head>");
  }
  if (html.includes("</html>")) {
    return html.replace("</html>", printScript + "</html>");
  }
  return html + printScript;
}
