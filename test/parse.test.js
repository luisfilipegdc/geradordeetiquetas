import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  linhasParaAlunos, itensPdfParaLinhas, linhasPdfParaMatriz, textoParaAlunos, ordenar, separarPorFolha,
} from '../src/parse.js';
import { posicaoEtiqueta } from '../src/layout.js';

test('planilha com cabeçalho em qualquer ordem de colunas', () => {
  const linhas = [
    ['Matrícula', 'Turma', 'Nome Completo'],
    ['10320200070', 'EF2AM', 'ENZO MONTEIRO DUARTE'],
    ['', '', ''],
    ['10320200141', 'EF2AM', 'LUÍSA PONCE DE LÉON'],
  ];
  assert.deepEqual(linhasParaAlunos(linhas).alunos, [
    { nome: 'ENZO MONTEIRO DUARTE', turma: 'EF2AM' },
    { nome: 'LUÍSA PONCE DE LÉON', turma: 'EF2AM' },
  ]);
});

test('cabeçalho abaixo de um título e sem coluna de turma', () => {
  const linhas = [['Escola X'], [], ['Nº', 'Aluno'], ['1', 'Ana'], ['2', 'Bruno']];
  assert.deepEqual(linhasParaAlunos(linhas).alunos, [
    { nome: 'Ana', turma: '' },
    { nome: 'Bruno', turma: '' },
  ]);
});

test('coluna "Situação do contrato": fica só com Confirmado', () => {
  const linhas = [
    ['Situação do contrato:', 'Confirmado'], // linha de filtro do relatório, antes do cabeçalho
    ['Matrícula', 'Nome Completo', 'Turma', 'Situação do Contrato'],
    ['1', 'Ana', 'EF2AM', 'Confirmado'],
    ['2', 'Bruno', 'EF2AM', 'Cancelado'],
    ['3', 'Caio', 'EF3BM', ' CONFIRMADO '],
    ['4', 'Duda', 'EF3BM', 'Não confirmado'],
  ];
  assert.deepEqual(linhasParaAlunos(linhas), {
    alunos: [{ nome: 'Ana', turma: 'EF2AM' }, { nome: 'Caio', turma: 'EF3BM' }],
    temSituacao: true,
    ignorados: 2,
  });
});

test('sem cabeçalho: ignora coluna numérica', () => {
  assert.deepEqual(linhasParaAlunos([['1', 'Ana Souza', '6º A']]).alunos, [{ nome: 'Ana Souza', turma: '6º A' }]);
});

test('PDF: alinha células pelo cabeçalho e ignora cabeçalho repetido', () => {
  const item = (str, x, y, largura = str.length * 5) => ({ str, x, y, largura });
  const linhas = itensPdfParaLinhas([
    item('Nome', 50, 700), item('Turma', 300, 700),
    item('Ana', 50, 680), item('Souza', 70, 680), item('6º A', 300, 680),
    item('Bruno Lima', 50, 660),
    item('Nome', 50, 640), item('Turma', 300, 640),
  ]);
  assert.deepEqual(linhasParaAlunos(linhasPdfParaMatriz(linhas)).alunos, [
    { nome: 'Ana Souza', turma: '6º A' },
    { nome: 'Bruno Lima', turma: '' },
  ]);
});

test('texto editável aceita ; e tab', () => {
  assert.deepEqual(textoParaAlunos('Ana ; 6A\nBruno\t7B\n\n  Caio  '), [
    { nome: 'Ana', turma: '6A' },
    { nome: 'Bruno', turma: '7B' },
    { nome: 'Caio', turma: '' },
  ]);
});

test('ordena por turma e depois nome, respeitando acentos', () => {
  const r = ordenar([
    { nome: 'Érica', turma: 'EF2' }, { nome: 'Bia', turma: 'EF10' }, { nome: 'Ana', turma: 'EF2' },
  ]);
  assert.deepEqual(r.map((a) => a.nome), ['Ana', 'Érica', 'Bia']);
});

test('cada turma em folha nova', () => {
  const a = (turma) => ({ nome: 'x', turma });
  const r = separarPorFolha([a('A'), a('A'), a('B')], 14);
  assert.equal(r.length, 15);
  assert.equal(r[14].turma, 'B');
  const r2 = separarPorFolha([a('A'), a('B')], 14, 14); // começando na última etiqueta
  assert.equal(r2.length, 2);
});

test('geometria Pimaco 38,1 x 99,0', () => {
  assert.deepEqual(posicaoEtiqueta(0), { folha: 0, x: 4.7, y: 15.15 });
  const ultima = posicaoEtiqueta(13);
  assert.equal(ultima.folha, 0);
  assert.ok(Math.abs(ultima.x + 99 - 205.2) < 1e-9);
  assert.ok(Math.abs(ultima.y + 38.1 - 281.85) < 1e-9);
  assert.equal(posicaoEtiqueta(14).folha, 1);
});
