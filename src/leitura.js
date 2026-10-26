import { linhasParaAlunos, itensPdfParaLinhas, linhasPdfParaMatriz } from './parse.js';

// Lê .xlsx/.xls/.csv/.ods ou .pdf e devolve { alunos, temSituacao, ignorados } (ver linhasParaAlunos).
// Tudo roda no navegador.
export async function lerArquivo(arquivo) {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith('.pdf')) return lerPdf(arquivo);
  if (/\.(xlsx|xlsm|xls|csv|ods)$/.test(nome)) return lerPlanilha(arquivo);
  throw new Error('Formato não suportado. Envie PDF, Excel (.xlsx/.xls), CSV ou ODS.');
}

async function lerPlanilha(arquivo) {
  const XLSX = await import('xlsx');
  const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
  const resultado = { alunos: [], temSituacao: false, ignorados: 0 };
  // Lê todas as abas (escolas costumam separar uma turma por aba).
  for (const nomeAba of livro.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(livro.Sheets[nomeAba], { header: 1, defval: '', raw: false });
    const daAba = linhasParaAlunos(linhas);
    // Sem coluna de turma: usa o nome da aba quando há mais de uma.
    if (livro.SheetNames.length > 1) daAba.alunos.forEach((a) => (a.turma ||= nomeAba));
    resultado.alunos.push(...daAba.alunos);
    resultado.temSituacao ||= daAba.temSituacao;
    resultado.ignorados += daAba.ignorados;
  }
  return resultado;
}

async function lerPdf(arquivo) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const linhas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const { items } = await pagina.getTextContent();
    const itens = items
      .filter((i) => 'str' in i)
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], largura: i.width }));
    linhas.push(...itensPdfParaLinhas(itens));
  }
  if (!linhas.length) {
    throw new Error('Não encontrei texto no PDF. Se ele for uma imagem escaneada, use a planilha ou cole a lista.');
  }
  return linhasParaAlunos(linhasPdfParaMatriz(linhas));
}
