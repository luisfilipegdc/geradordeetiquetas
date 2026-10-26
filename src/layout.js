// Folha A4 Pimaco 38,1 x 99,0 mm — 2 colunas x 7 linhas = 14 etiquetas.
// Medidas em milímetros. As margens podem ser ajustadas na tela (calibração da impressora).
export const FOLHA = { largura: 210, altura: 297 };

export const ETIQUETA = {
  largura: 99.0,
  altura: 38.1,
  colunas: 2,
  linhas: 7,
  margemSuperior: 15.15,
  margemEsquerda: 4.7,
  espacoEntreColunas: 2.5,
};

export const POR_FOLHA = ETIQUETA.colunas * ETIQUETA.linhas;

// Posição (canto superior esquerdo) da etiqueta `indice` (0 = primeira da folha),
// preenchendo da esquerda para a direita, de cima para baixo.
export function posicaoEtiqueta(indice, ajusteX = 0, ajusteY = 0) {
  const pos = indice % POR_FOLHA;
  const coluna = pos % ETIQUETA.colunas;
  const linha = Math.floor(pos / ETIQUETA.colunas);
  return {
    folha: Math.floor(indice / POR_FOLHA),
    x: ETIQUETA.margemEsquerda + coluna * (ETIQUETA.largura + ETIQUETA.espacoEntreColunas) + ajusteX,
    y: ETIQUETA.margemSuperior + linha * ETIQUETA.altura + ajusteY,
  };
}
