# Freight Cost Calculator

A single-file, mobile-responsive web app for calculating freight (CBM) volume
from a product dimension list. No backend required — everything (including
the Excel parsing) runs client-side in the browser.

## Folder structure

```
freight-cost-calculator/
├── index.html            # complete app: HTML + CSS + JS in one file
├── sample-products.xlsx  # example product list to test the upload feature
└── README.md
```

## Running it

Just open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
No install, no server, no build step.

If you'd rather serve it (e.g. to test on a phone on the same network):

```bash
cd freight-cost-calculator
python3 -m http.server 8000
# then visit http://localhost:8000 on any device on the same network
```

## How to use it

1. **Upload an Excel file** — click "Choose Excel File" and select a
   `.xlsx` or `.xls` file with columns for Product Name, Length, Width,
   and Height (in cm). Header names are matched loosely, so
   "Length (L)", "Length", or "L (cm)" all work.
2. **Select a product** — in any row, start typing in the "Product Name"
   field; it's a searchable dropdown (browser autocomplete) built from
   your uploaded list. Selecting an exact match auto-fills Length, Width,
   and Height.
3. **CBM** is calculated automatically:
   `CBM = (Length × Width × Height) / 1,000,000`, shown to 4 decimal places.
4. **Enter Quantity** — type the number of units for that row.
5. **Freight Volume** updates instantly: `Freight Volume = CBM × Quantity`.
6. **Add / remove rows** with the "+ Add Row" button and the "×" button
   on each row.
7. The **Grand Total Freight Volume** (sum of all rows) is shown live in
   the amber stamp at the bottom of the table.
8. **Download your results** — click "Download Results (.xlsx)" above
   the table to export exactly what's on screen (Product Name, Length,
   Width, Height, CBM, Quantity, Freight Volume for every row, plus a
   Grand Total line) as a dated `.xlsx` file, e.g.
   `freight-calculation-2026-07-10.xlsx`. This also runs entirely in
   the browser via SheetJS — nothing is sent to a server.

## Notes on the Excel parsing

The app uses [SheetJS](https://sheetjs.com/) (loaded from a CDN) to read
the uploaded workbook in-browser — nothing is uploaded to a server. It
reads the first sheet in the workbook and matches columns by loosely
normalizing header text (lowercased, punctuation stripped), so minor
header variations won't break the upload.

## Customizing

Everything — layout, styling, and logic — lives in `index.html`, split
into a `<style>` block (design tokens at the top, as CSS custom
properties) and a `<script>` block (clearly commented into: Excel upload,
row management, and calculations). No build tools or dependencies to
install beyond the CDN-hosted SheetJS library.

## Downloading your results

Below the Grand Total, click **Download Freight Calculation (.xlsx)** to export the
current manifest as an Excel file — one row per product with Length, Width,
Height, CBM, Quantity, and Freight Volume, plus a Grand Total row at the
bottom. The file downloads straight to your browser's default download
folder, named `freight-calculation-YYYY-MM-DD.xlsx`. This also runs
entirely client-side via SheetJS — nothing is uploaded anywhere.
