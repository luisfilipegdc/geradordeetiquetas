import './style.css';
import { lerArquivo } from './leitura.js';
import { textoParaAlunos, alunosParaTexto, ordenar, turmasDe, separarPorFolha } from './parse.js';
import { POR_FOLHA } from './layout.js';

const $ = (id) => document.getElementById(id);
const el = {
  arquivo: $('arquivo'), soltar: $('soltar'), status: $('status'), lista: $('lista'), total: $('total'),
  secaoTurmas: $('secao-turmas'), turmas: $('turmas'), busca: $('busca-turma'), resumo: $('resumo'),
  gerar: $('gerar'), baixar: $('baixar'), previa: $('previa'),
};

const SEM_TURMA = '(sem turma)';
let desmarcadas = new Set(); // guardamos as desmarcadas para que turmas novas venham marcadas
let urlPdf = null;

function status(texto, erro = false) {
  el.status.textContent = texto;
  el.status.classList.toggle('erro', erro);
}

const alunosDaLista = () => textoParaAlunos(el.lista.value);

function selecionados() {
  const alunos = alunosDaLista().filter((a) => !desmarcadas.has(a.turma || SEM_TURMA));
  return $('ordenar').checked ? ordenar(alunos) : alunos;
}

function atualizarResumo() {
  const qtd = selecionados().length;
  const folhas = Math.ceil(posicionados().length / POR_FOLHA) || 0;
  el.resumo.textContent = qtd ? `${qtd} etiquetas · ${folhas} folha${folhas === 1 ? '' : 's'}` : 'Nenhuma turma marcada.';
  el.gerar.disabled = qtd === 0;
}

function posicionados() {
  const alunos = selecionados();
  const inicio = inicioValido();
  const lista = $('folha-por-turma').checked ? separarPorFolha(alunos, POR_FOLHA, inicio) : alunos;
  return [...new Array(inicio - 1).fill(null), ...lista];
}

function inicioValido() {
  const n = Math.trunc(Number($('inicio').value));
  return Math.min(Math.max(n || 1, 1), POR_FOLHA);
}

function desenharTurmas() {
  const alunos = alunosDaLista();
  el.total.textContent = alunos.length;
  const turmas = turmasDe(alunos);
  el.secaoTurmas.hidden = turmas.length < 2;
  const filtro = el.busca.value.trim().toLowerCase();

  el.turmas.replaceChildren(
    ...turmas.map(([turma, qtd]) => {
      const nome = turma || SEM_TURMA;
      const label = document.createElement('label');
      label.className = 'turma';
      label.hidden = filtro && !nome.toLowerCase().includes(filtro);
      const caixa = document.createElement('input');
      caixa.type = 'checkbox';
      caixa.checked = !desmarcadas.has(nome);
      caixa.dataset.turma = nome;
      label.append(caixa, ` ${nome} `, Object.assign(document.createElement('small'), { textContent: qtd }));
      return label;
    }),
  );
  atualizarResumo();
}

el.turmas.addEventListener('change', (e) => {
  const { turma } = e.target.dataset;
  if (e.target.checked) desmarcadas.delete(turma);
  else desmarcadas.add(turma);
  atualizarResumo();
});

function marcarVisiveis(marcar) {
  for (const caixa of el.turmas.querySelectorAll('label:not([hidden]) input')) {
    caixa.checked = marcar;
    if (marcar) desmarcadas.delete(caixa.dataset.turma);
    else desmarcadas.add(caixa.dataset.turma);
  }
  atualizarResumo();
}
$('marcar-todas').addEventListener('click', () => marcarVisiveis(true));
$('desmarcar-todas').addEventListener('click', () => marcarVisiveis(false));
el.busca.addEventListener('input', desenharTurmas);

async function carregar(arquivo) {
  if (!arquivo) return;
  status(`Lendo ${arquivo.name}…`);
  try {
    const { alunos, temSituacao, ignorados } = await lerArquivo(arquivo);
    if (!alunos.length) {
      throw new Error(
        temSituacao
          ? 'Nenhum aluno com situação "Confirmado" no arquivo.'
          : 'Não encontrei alunos no arquivo. Confira se há uma coluna "Nome".',
      );
    }
    el.lista.value = alunosParaTexto(alunos);
    desmarcadas = new Set();
    const semTurma = alunos.filter((a) => !a.turma).length;
    status(
      `${alunos.length} alunos carregados de ${arquivo.name}.` +
        (temSituacao
          ? ` Só os com situação "Confirmado" (${ignorados} ignorados).`
          : ' Atenção: não há coluna "Situação" — entram todos os alunos do arquivo.') +
        (semTurma ? ` ${semTurma} sem turma — confira a lista.` : '') +
        (arquivo.name.toLowerCase().endsWith('.pdf') ? ' PDF é lido por aproximação: confira a lista antes de imprimir.' : ''),
    );
    desenharTurmas();
  } catch (erro) {
    console.error(erro);
    status(erro.message || 'Não consegui ler o arquivo.', true);
  }
}

el.arquivo.addEventListener('change', () => carregar(el.arquivo.files[0]));
for (const evento of ['dragenter', 'dragover']) {
  el.soltar.addEventListener(evento, (e) => {
    e.preventDefault();
    el.soltar.classList.add('ativo');
  });
}
for (const evento of ['dragleave', 'drop']) {
  el.soltar.addEventListener(evento, () => el.soltar.classList.remove('ativo'));
}
el.soltar.addEventListener('drop', (e) => {
  e.preventDefault();
  carregar(e.dataTransfer.files[0]);
});

let espera;
el.lista.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(desenharTurmas, 300);
});
for (const id of ['ordenar', 'folha-por-turma', 'inicio']) $(id).addEventListener('input', atualizarResumo);

el.gerar.addEventListener('click', async () => {
  el.gerar.disabled = true;
  el.gerar.textContent = 'Gerando…';
  try {
    const { gerarPdf } = await import('./gerar-pdf.js');
    const doc = gerarPdf(posicionados(), {
      ajusteX: Number($('ajuste-x').value) || 0,
      ajusteY: Number($('ajuste-y').value) || 0,
      bordas: $('bordas').checked,
      maiusculas: $('maiusculas').checked,
      prefixoTurma: $('prefixo').checked,
    });
    if (urlPdf) URL.revokeObjectURL(urlPdf);
    urlPdf = URL.createObjectURL(doc.output('blob'));
    el.baixar.href = urlPdf;
    el.baixar.hidden = false;
    el.previa.src = urlPdf;
    el.previa.hidden = false;
    el.previa.scrollIntoView({ behavior: 'smooth' });
  } catch (erro) {
    console.error(erro);
    status('Erro ao gerar o PDF: ' + erro.message, true);
  } finally {
    el.gerar.disabled = false;
    el.gerar.textContent = 'Gerar PDF';
  }
});

desenharTurmas();
