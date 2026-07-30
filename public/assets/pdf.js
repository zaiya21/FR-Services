/* =====================================================================
   PDF — a minimal writer, and the report layout that uses it
   ---------------------------------------------------------------------
   "Download PDF" has to produce an actual .pdf file. The alternative —
   opening the print dialog and asking the operator to choose "Save as
   PDF" — is the same button as Print wearing a different label, and on a
   phone it does nothing at all.

   A CDN library was not an option: this prototype runs from file:// and
   the artifacts are meant to stay self-contained. So this is PDF 1.4
   written by hand, using the base-14 fonts every reader has built in.
   That buys a small file and no dependency, at the cost of one real
   limitation:

     BASE-14 HELVETICA IS WinAnsiEncoding, WHICH HAS NO PESO SIGN.
     Embedding a font that does would add ~300 KB. Instead every string is
     transliterated to ASCII on the way in, and a peso sign becomes "PHP".
     A printed report saying "PHP 43,344" is unambiguous; a mojibake glyph
     where the currency should be is not.

   Everything renders from the report model built in ops.js, so the PDF
   and the on-screen sheet can never disagree about a figure.
   ===================================================================== */

/* ---- Helvetica / Helvetica-Bold advance widths, in 1/1000 em, for
        ASCII 32–126. Needed to right-align money columns and to know when
        a cell has to be truncated. These are the standard AFM values. ---- */
const PDF_W_REG = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
  556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const PDF_W_BOLD = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
  975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
  333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
  611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

/* Unicode the report legitimately contains, mapped to something a
   WinAnsi font can actually draw. */
const PDF_TRANS = {
  '₱':'PHP ', '—':'-', '–':'-', '·':'-', '•':'-',
  '’':"'", '‘':"'", '“':'"', '”':'"', '…':'...',
  '×':'x', 'ñ':'n', 'Ñ':'N', ' ':' ', '−':'-'
};

/** ASCII-only, PDF-escaped. Also guarantees one JS char == one byte, which
    is what makes the xref byte offsets below correct. */
function pdfText(s){
  let out = '';
  const str = String(s == null ? '' : s);
  for (const ch of str){
    const mapped = PDF_TRANS[ch] !== undefined ? PDF_TRANS[ch] : ch;
    for (const c of mapped){
      const code = c.charCodeAt(0);
      if (code < 32 || code > 126) continue;
      if (c === '(' || c === ')' || c === '\\') out += '\\';
      out += c;
    }
  }
  return out;
}
/** The same transliteration without the escaping — for measuring. */
function pdfPlain(s){
  return pdfText(s).replace(/\\([()\\])/g, '$1');
}

function pdfWidth(s, size, bold){
  const t = pdfPlain(s);
  const tbl = bold ? PDF_W_BOLD : PDF_W_REG;
  let w = 0;
  for (let i = 0; i < t.length; i++){
    const c = t.charCodeAt(i) - 32;
    w += (c >= 0 && c < tbl.length) ? tbl[c] : 500;
  }
  return w * size / 1000;
}
/** Truncate to fit, with an ellipsis, so a long payee cannot run into the
    money column beside it. */
function pdfFit(s, max, size, bold){
  if (pdfWidth(s, size, bold) <= max) return String(s);
  let t = pdfPlain(s);
  while (t.length > 1 && pdfWidth(t + '...', size, bold) > max) t = t.slice(0, -1);
  return t.replace(/[ ,.;:-]+$/, '') + '...';
}

/* =====================================================================
   The document
   ===================================================================== */
function PDFDoc(landscape){
  this.W = landscape ? 841.89 : 595.28;
  this.H = landscape ? 595.28 : 841.89;
  this.pages = [];
  this.ops = null;
  this.newPage();
}
PDFDoc.prototype.newPage = function(){
  this.ops = [];
  this.pages.push(this.ops);
  return this;
};
/* Callers think in "distance from the top"; PDF measures from the bottom. */
PDFDoc.prototype._y = function(top){ return this.H - top; };

PDFDoc.prototype.text = function(str, x, top, o){
  const opt  = o || {};
  const size = opt.size || 9;
  const font = opt.bold ? '/F2' : '/F1';
  let s = String(str == null ? '' : str);
  if (opt.max) s = pdfFit(s, opt.max, size, opt.bold);

  let px = x;
  if (opt.align === 'right')  px = x - pdfWidth(s, size, opt.bold);
  if (opt.align === 'center') px = x - pdfWidth(s, size, opt.bold) / 2;

  const c = opt.color || [0.09, 0.10, 0.13];
  this.ops.push(`${c[0]} ${c[1]} ${c[2]} rg`);
  this.ops.push(`BT ${font} ${size} Tf 1 0 0 1 ${px.toFixed(2)} ${this._y(top).toFixed(2)} Tm (${pdfText(s)}) Tj ET`);
  return this;
};
PDFDoc.prototype.rect = function(x, top, w, h, color){
  const c = color || [0.95, 0.95, 0.95];
  this.ops.push(`${c[0]} ${c[1]} ${c[2]} rg ${x.toFixed(2)} ${this._y(top + h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  return this;
};
PDFDoc.prototype.line = function(x1, top1, x2, top2, color, width){
  const c = color || [0.80, 0.80, 0.80];
  this.ops.push(`${(width || 0.6).toFixed(2)} w ${c[0]} ${c[1]} ${c[2]} RG ` +
    `${x1.toFixed(2)} ${this._y(top1).toFixed(2)} m ${x2.toFixed(2)} ${this._y(top2).toFixed(2)} l S`);
  return this;
};

/** Serialise. Byte offsets are string offsets, which holds because
    pdfText() guarantees every character is a single ASCII byte. */
PDFDoc.prototype.build = function(){
  const objs = [];
  const add = body => { objs.push(body); return objs.length; };   // 1-based object number

  const catalog = add(null);                       // reserved, filled below
  const pagesId = add(null);
  const fontR   = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontB   = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const kids = [];
  this.pages.forEach(ops => {
    const stream = ops.join('\n');
    const cId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pId = add(`<< /Type /Page /Parent ${pagesId} 0 R ` +
      `/MediaBox [0 0 ${this.W.toFixed(2)} ${this.H.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R >> >> ` +
      `/Contents ${cId} 0 R >>`);
    kids.push(pId);
  });

  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(k => k + ' 0 R').join(' ')}] >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
};
PDFDoc.prototype.blob = function(){
  /* Latin-1 bytes, one per character — Blob would otherwise UTF-8 encode
     and shift every xref offset. */
  const s = this.build();
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xFF;
  return new Blob([bytes], { type: 'application/pdf' });
};

/* =====================================================================
   REPORT LAYOUT
   ===================================================================== */
const PDF_INK   = [0.07, 0.08, 0.11];
const PDF_MUTED = [0.42, 0.45, 0.52];
const PDF_RULE  = [0.80, 0.82, 0.86];
const PDF_BAND  = [0.95, 0.96, 0.97];
const PDF_BRAND = [0.02, 0.48, 0.18];

function pdfFromReport(model){
  /* Wide tables get landscape — a seven-column booking register squeezed
     into A4 portrait is unreadable, and unreadable is the same as broken. */
  const widest = model.tables.reduce((n, t) => Math.max(n, t.cols.length), 0);
  const doc = new PDFDoc(widest >= 6);
  const M = 40, W = doc.W, RIGHT = W - M;
  let y = M;

  const room = need => {
    if (y + need <= doc.H - M - 26) return;
    doc.newPage();
    y = M;
  };

  /* ---- masthead ---- */
  doc.text(model.company, M, y + 12, { size:17, bold:true });
  doc.text('FR SERVICES', RIGHT, y + 6, { size:8, bold:true, align:'right', color:PDF_BRAND });
  doc.text('Company admin report', RIGHT, y + 17, { size:8, align:'right', color:PDF_MUTED });
  y += 22;
  if (model.companyLoc){
    doc.text(model.companyLoc, M, y + 8, { size:9, color:PDF_MUTED });
    y += 12;
  }
  y += 8;
  doc.line(M, y, RIGHT, y, PDF_INK, 1.4);
  y += 18;

  doc.text(model.title, M, y, { size:13, bold:true });
  y += 14;
  doc.text(model.period + '   ·   generated ' + model.generated, M, y, { size:9, color:PDF_MUTED });
  y += 20;

  /* ---- KPI band ---- */
  if (model.kpis.length){
    const per = (RIGHT - M) / model.kpis.length;
    const h = 46;
    doc.rect(M, y, RIGHT - M, h, PDF_BAND);
    model.kpis.forEach((k, i) => {
      const x = M + per * i + 10;
      doc.text(k.label.toUpperCase(), x, y + 14, { size:7, bold:true, color:PDF_MUTED, max:per - 18 });
      doc.text(k.value,               x, y + 29, { size:12, bold:true, max:per - 18 });
      if (k.note) doc.text(k.note,    x, y + 39, { size:7, color:PDF_MUTED, max:per - 18 });
      if (i) doc.line(M + per * i, y + 6, M + per * i, y + h - 6, PDF_RULE, 0.6);
    });
    y += h + 22;
  }

  /* ---- tables ---- */
  model.tables.forEach(tbl => {
    const total = tbl.cols.reduce((n, c) => n + (c.w || 1), 0);
    const span  = RIGHT - M;
    const xs = []; let acc = M;
    tbl.cols.forEach(c => { xs.push(acc); acc += span * (c.w || 1) / total; });
    const widthOf = i => span * (tbl.cols[i].w || 1) / total - 8;

    const header = () => {
      doc.rect(M, y, span, 17, PDF_BAND);
      tbl.cols.forEach((c, i) => {
        const right = c.align === 'right';
        doc.text(c.label, right ? xs[i] + widthOf(i) + 4 : xs[i] + 4, y + 12,
          { size:7.5, bold:true, color:PDF_MUTED, align: right ? 'right' : 'left', max:widthOf(i) });
      });
      y += 17;
    };

    room(60);
    doc.text(tbl.title, M, y, { size:10.5, bold:true });
    y += 10;
    header();

    tbl.rows.forEach((row, n) => {
      if (y + 15 > doc.H - M - 26){
        doc.newPage(); y = M;
        doc.text(tbl.title + ' (continued)', M, y, { size:10.5, bold:true });
        y += 10;
        header();
      }
      if (n % 2) doc.rect(M, y, span, 14, [0.975, 0.975, 0.98]);
      row.forEach((cell, i) => {
        if (i >= tbl.cols.length) return;
        const right = tbl.cols[i].align === 'right';
        doc.text(cell, right ? xs[i] + widthOf(i) + 4 : xs[i] + 4, y + 10,
          { size:8, align: right ? 'right' : 'left', max:widthOf(i) });
      });
      y += 14;
    });

    if (tbl.total){
      room(20);
      doc.line(M, y, RIGHT, y, PDF_INK, 1);
      tbl.total.forEach((cell, i) => {
        if (i >= tbl.cols.length || !cell) return;
        const right = tbl.cols[i].align === 'right';
        doc.text(cell, right ? xs[i] + widthOf(i) + 4 : xs[i] + 4, y + 12,
          { size:8.5, bold:true, align: right ? 'right' : 'left', max:widthOf(i) });
      });
      y += 18;
    }
    y += 18;
  });

  /* ---- notes ---- */
  if (model.notes.length){
    room(14 * model.notes.length + 12);
    doc.line(M, y, RIGHT, y, PDF_RULE, 0.6);
    y += 12;
    model.notes.forEach(n => {
      doc.text('- ' + n, M, y, { size:7.5, color:PDF_MUTED, max:RIGHT - M });
      y += 11;
    });
  }

  /* ---- footers, once the page count is known ---- */
  const pages = doc.pages.length;
  doc.pages.forEach((ops, i) => {
    doc.ops = ops;
    const fy = doc.H - M + 6;
    doc.line(M, fy - 10, RIGHT, fy - 10, PDF_RULE, 0.6);
    doc.text(model.company + ' · ' + model.title, M, fy, { size:7.5, color:PDF_MUTED });
    doc.text(`Page ${i + 1} of ${pages}`, RIGHT, fy, { size:7.5, color:PDF_MUTED, align:'right' });
  });

  return doc;
}

/** Build, name and hand the file to the browser. */
function downloadReportPDF(model, filename){
  const doc  = pdfFromReport(model);
  const name = filename || (
    String(model.company).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' + model.kind + '-' + model.generated.replace(/ /g, '-').toLowerCase() + '.pdf');
  const url = URL.createObjectURL(doc.blob());
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return name;
}
