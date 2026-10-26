import { jsPDF } from 'jspdf';
import { ETIQUETA, posicaoEtiqueta } from './layout.js';

const PT_MM = 0.3528; // 1 ponto tipográfico em mm
const RESPIRO = 4; // margem interna da etiqueta (mm)

// Maior fonte (entre max e min) em que o texto cabe na largura; null se não couber nem no mínimo.
function tamanhoQueCabe(doc, texto, largura, max, min) {
  for (let t = max; t >= min; t -= 0.5) {
    doc.setFontSize(t);
    if (doc.getTextWidth(texto) <= largura) return t;
  }
  return null;
}

// alunos: [{ nome, turma }]; um item null deixa aquela etiqueta em branco.
export function gerarPdf(alunos, opcoes = {}) {
  const { ajusteX = 0, ajusteY = 0, bordas = false, maiusculas = false, prefixoTurma = true } = opcoes;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const larguraUtil = ETIQUETA.largura - 2 * RESPIRO;
  let folhaAtual = 0;

  alunos.forEach((aluno, i) => {
    const { folha, x, y } = posicaoEtiqueta(i, ajusteX, ajusteY);
    while (folhaAtual < folha) {
      doc.addPage();
      folhaAtual++;
    }
    if (!aluno) return; // posição deixada em branco (ex.: turma começando em folha nova)

    if (bordas) {
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, ETIQUETA.largura, ETIQUETA.altura, 2, 2);
    }

    const nome = maiusculas ? aluno.nome.toLocaleUpperCase('pt-BR') : aluno.nome;
    let turma = aluno.turma;
    if (turma && prefixoTurma && !/^turma/i.test(turma)) turma = `Turma: ${turma}`;

    // Nome em uma linha (16 a 11 pt); se não couber, quebra em duas (e, no limite, três) linhas.
    doc.setFont('helvetica', 'bold');
    let tamNome = tamanhoQueCabe(doc, nome, larguraUtil, 16, 11);
    let linhasNome = [nome];
    if (!tamNome) {
      for (const maxLinhas of [2, 3]) {
        for (let t = 13; t >= 7 && !tamNome; t -= 0.5) {
          doc.setFontSize(t);
          const quebra = doc.splitTextToSize(nome, larguraUtil);
          if (quebra.length <= maxLinhas) [tamNome, linhasNome] = [t, quebra];
        }
        if (tamNome) break;
      }
      if (!tamNome) {
        tamNome = 7;
        doc.setFontSize(tamNome);
        linhasNome = doc.splitTextToSize(nome, larguraUtil).slice(0, 3);
      }
    }

    doc.setFont('helvetica', 'normal');
    const tamTurma = turma ? tamanhoQueCabe(doc, turma, larguraUtil, 12, 8) ?? 8 : 0;

    const alturaNome = linhasNome.length * tamNome * PT_MM * 1.15;
    const espaco = turma ? 2 : 0;
    const alturaTurma = tamTurma * PT_MM;
    let cursor = y + (ETIQUETA.altura - (alturaNome + espaco + alturaTurma)) / 2;
    const centroX = x + ETIQUETA.largura / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(tamNome);
    doc.setTextColor(0);
    for (const linha of linhasNome) {
      cursor += tamNome * PT_MM * 1.15;
      doc.text(linha, centroX, cursor - tamNome * PT_MM * 0.25, { align: 'center' });
    }

    if (turma) {
      cursor += espaco + alturaTurma;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(tamTurma);
      doc.setTextColor(60);
      doc.text(turma, centroX, cursor - tamTurma * PT_MM * 0.2, { align: 'center', maxWidth: larguraUtil });
    }
  });

  return doc;
}
