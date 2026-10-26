// Funções puras que transformam o conteúdo da planilha/PDF em [{ nome, turma }].

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const limpar = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const RE_NOME = /^(nome|aluno|aluna|estudante)/;
const RE_TURMA = /^(turma|serie|classe|sala|ano\b|grupo)/;
const RE_SITUACAO = /^(situacao|status)/;
export const SITUACAO_ACEITA = 'confirmado';
const ehNumero = (v) => /^\d+([.,]\d+)?$/.test(limpar(v));

// Procura o cabeçalho nas primeiras linhas: retorna { linha, nome, turma, situacao } ou null.
export function acharCabecalho(linhas, limite = 15) {
  for (let i = 0; i < Math.min(linhas.length, limite); i++) {
    const celulas = linhas[i].map(normalizar);
    const nome = celulas.findIndex((c) => RE_NOME.test(c));
    if (nome === -1) continue;
    const turma = celulas.findIndex((c, j) => j !== nome && RE_TURMA.test(c));
    const situacao = celulas.findIndex((c) => RE_SITUACAO.test(c));
    return { linha: i, nome, turma, situacao };
  }
  return null;
}

// linhas: matriz de células (como vem do Excel). Sem cabeçalho, usa a 1ª célula de texto
// como nome e a 2ª como turma (ignora colunas só com número, ex.: nº de chamada).
// Se houver coluna "Situação" (ex.: "Situação do contrato"), fica só com quem está "Confirmado".
// Retorna { alunos, temSituacao, ignorados }.
export function linhasParaAlunos(linhas) {
  const cab = acharCabecalho(linhas);
  const alunos = [];
  let ignorados = 0;

  if (cab) {
    for (const linha of linhas.slice(cab.linha + 1)) {
      const nome = limpar(linha[cab.nome]);
      if (!nome || RE_NOME.test(normalizar(nome)) || ehNumero(nome)) continue;
      if (cab.situacao !== -1 && normalizar(linha[cab.situacao]) !== SITUACAO_ACEITA) {
        if (!RE_SITUACAO.test(normalizar(linha[cab.situacao]))) ignorados++;
        continue;
      }
      alunos.push({ nome, turma: cab.turma === -1 ? '' : limpar(linha[cab.turma]) });
    }
    return { alunos, temSituacao: cab.situacao !== -1, ignorados };
  }

  for (const linha of linhas) {
    const textos = linha.map(limpar).filter((c) => c && !ehNumero(c));
    if (textos.length) alunos.push({ nome: textos[0], turma: textos[1] ?? '' });
  }
  return { alunos, temSituacao: false, ignorados };
}

// Agrupa os pedaços de texto de uma página de PDF (pdf.js) em linhas e células.
// itens: [{ str, x, y, largura }] — y cresce para cima, como no PDF.
export function itensPdfParaLinhas(itens, tolerancia = 3, vaoCelula = 8) {
  const ordenados = itens
    .filter((i) => i.str.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const linhas = [];
  for (const item of ordenados) {
    const atual = linhas[linhas.length - 1];
    if (atual && Math.abs(atual.y - item.y) <= tolerancia) atual.itens.push(item);
    else linhas.push({ y: item.y, itens: [item] });
  }

  return linhas.map(({ itens: lin }) => {
    lin.sort((a, b) => a.x - b.x);
    const celulas = [];
    let fim = -Infinity;
    for (const item of lin) {
      const ultima = celulas[celulas.length - 1];
      if (ultima && item.x - fim < vaoCelula) ultima.texto += (item.x - fim > 1 ? ' ' : '') + item.str;
      else celulas.push({ x: item.x, texto: item.str });
      fim = item.x + item.largura;
    }
    return celulas.map((c) => ({ x: c.x, texto: limpar(c.texto) }));
  });
}

// Converte as linhas do PDF em matriz. Se houver cabeçalho, alinha cada célula à coluna
// do cabeçalho mais próxima pela posição x (assim células vazias não deslocam as colunas).
export function linhasPdfParaMatriz(linhasPdf) {
  const matrizSimples = linhasPdf.map((l) => l.map((c) => c.texto));
  const cab = acharCabecalho(matrizSimples);
  if (!cab) return matrizSimples;

  const colunasX = linhasPdf[cab.linha].map((c) => c.x);
  return linhasPdf.map((linha, i) => {
    if (i === cab.linha) return matrizSimples[i];
    const saida = new Array(colunasX.length).fill('');
    for (const celula of linha) {
      let melhor = 0;
      for (let j = 1; j < colunasX.length; j++) {
        if (Math.abs(colunasX[j] - celula.x) < Math.abs(colunasX[melhor] - celula.x)) melhor = j;
      }
      saida[melhor] = saida[melhor] ? `${saida[melhor]} ${celula.texto}` : celula.texto;
    }
    return saida;
  });
}

// Texto da caixa de edição: uma linha por aluno, "Nome ; Turma" (aceita tab ao colar do Excel).
export function textoParaAlunos(texto) {
  return texto
    .split(/\r?\n/)
    .map((linha) => {
      const [nome, ...resto] = linha.split(/\t|;/);
      return { nome: limpar(nome), turma: limpar(resto.join(' ')) };
    })
    .filter((a) => a.nome);
}

export function alunosParaTexto(alunos) {
  return alunos.map((a) => (a.turma ? `${a.nome} ; ${a.turma}` : a.nome)).join('\n');
}

const comparar = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' }).compare;

export function ordenar(alunos) {
  return [...alunos].sort((a, b) => comparar(a.turma, b.turma) || comparar(a.nome, b.nome));
}

export function turmasDe(alunos) {
  const contagem = new Map();
  for (const a of alunos) contagem.set(a.turma, (contagem.get(a.turma) ?? 0) + 1);
  return [...contagem].sort((a, b) => comparar(a[0], b[0]));
}

// Insere posições vazias (null) para que cada turma comece numa folha nova.
// `inicio` é a etiqueta (1–porFolha) em que a primeira folha começa.
export function separarPorFolha(alunos, porFolha, inicio = 1) {
  const saida = [];
  alunos.forEach((aluno, i) => {
    if (i > 0 && aluno.turma !== alunos[i - 1].turma) {
      const usadas = (saida.length + inicio - 1) % porFolha;
      if (usadas) saida.push(...new Array(porFolha - usadas).fill(null));
    }
    saida.push(aluno);
  });
  return saida;
}
