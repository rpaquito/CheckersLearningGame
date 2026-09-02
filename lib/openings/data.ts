import type { Opening } from './types';

export const OPENINGS: Opening[] = [
  {
    id: 'old-fourteenth',
    name: { pt: 'A Décima Quarta Antiga', en: 'Old Fourteenth' },
    description: {
      pt: 'Uma das respostas mais estudadas ao movimento de abertura mais popular do jogo (11-15), levando a uma luta equilibrada pelo centro.',
      en: "One of the most studied replies to the game's most popular opening move (11-15), leading to a balanced fight for the center.",
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-15', explanation: { pt: 'A jogada de abertura mais popular do jogo: ocupa logo a diagonal central.', en: "The game's most popular opening move: occupies the central diagonal right away." } },
          { notation: '23-19', explanation: { pt: 'A resposta que dá nome a esta linha, disputando o centro pelo lado oposto.', en: "The reply that gives this line its name, contesting the center from the opposite side." } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-23', explanation: { pt: 'O branco faz o mesmo: reocupa o espaço deixado pela peça que avançou.', en: 'White does the same: refills the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro, ampliando a presença nessa zona.', en: 'Develops a second piece toward the center, extending the presence there.' } },
          { notation: '24-20', explanation: { pt: 'Resposta simétrica, completando o desenvolvimento inicial de ambos os lados.', en: "A symmetric reply, rounding out both sides' initial development." } },
        ],
      },
    ],
  },
  {
    id: 'single-corner',
    name: { pt: 'Canto Simples', en: 'Single Corner' },
    description: {
      pt: 'Também nasce de 11-15, mas a resposta branca evita o contacto direto no centro, preferindo desenvolver pelo lado do canto simples.',
      en: 'Also starts from 11-15, but White replies away from direct central contact, developing instead on the single-corner side.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-15', explanation: { pt: 'A jogada de abertura mais popular do jogo: ocupa logo a diagonal central.', en: "The game's most popular opening move: occupies the central diagonal right away." } },
          { notation: '21-17', explanation: { pt: 'Em vez de disputar o centro de imediato, o branco desenvolve pelo lado do canto simples.', en: "Instead of contesting the center right away, White develops on the single-corner side." } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '25-21', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço junto ao canto.', en: 'White does the same, refilling the space near the corner.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '24-20', explanation: { pt: 'O branco desenvolve pelo outro flanco, equilibrando a posição.', en: 'White develops on the other flank, balancing the position.' } },
        ],
      },
    ],
  },
  {
    id: 'defiance',
    name: { pt: 'Desafio', en: 'Defiance' },
    description: {
      pt: 'Um sistema mais agressivo para as pretas, que ocupa cedo a coluna central esquerda em vez da clássica 11-15.',
      en: 'A more aggressive system for Black, occupying the left-center column early instead of the classic 11-15.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '10-14', explanation: { pt: 'Ocupa cedo a coluna central esquerda, um plano mais direto do que 11-15.', en: 'Occupies the left-center column early, a more direct plan than 11-15.' } },
          { notation: '23-19', explanation: { pt: 'O branco desenvolve pelo flanco direito, evitando contacto imediato.', en: "White develops on the right flank, avoiding immediate contact." } },
          { notation: '6-10', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça, alargando a presença no centro-direita.', en: 'Develops a second piece, extending the presence toward the center-right.' } },
          { notation: '22-18', explanation: { pt: 'O branco responde no centro, equilibrando o desenvolvimento.', en: 'White replies in the center, balancing development.' } },
        ],
      },
    ],
  },
  {
    id: 'alma',
    name: { pt: 'A Alma', en: 'Alma' },
    description: {
      pt: 'Preta abre pelo lado do canto duplo com 9-13, construindo uma estrutura sólida e paciente.',
      en: 'Black opens on the double-corner side with 9-13, building a solid, patient structure.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '9-13', explanation: { pt: 'Abre pelo lado do canto duplo, uma das sete jogadas de abertura legais.', en: "Opens on the double-corner side, one of the seven legal opening moves." } },
          { notation: '23-18', explanation: { pt: 'O branco desenvolve pelo centro, sem entrar em contacto direto.', en: 'White develops through the center, without direct contact.' } },
          { notation: '5-9', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '27-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '10-14', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '22-17', explanation: { pt: 'O branco desenvolve pelo lado do canto simples, completando o quadro inicial.', en: "White develops on the single-corner side, rounding out the initial picture." } },
        ],
      },
    ],
  },
  {
    id: 'cross',
    name: { pt: 'Cruz', en: 'Cross' },
    description: {
      pt: 'O movimento 10-14 cria uma disposição em cruz no centro do tabuleiro, dando nome à abertura.',
      en: 'The move 10-14 creates a cross-shaped arrangement in the center of the board, giving the opening its name.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '10-14', explanation: { pt: 'Cria uma disposição em cruz no centro, dando nome a esta abertura.', en: 'Creates a cross-shaped arrangement in the center, giving this opening its name.' } },
          { notation: '23-19', explanation: { pt: 'O branco disputa o centro pelo lado oposto.', en: 'White contests the center from the opposite side.' } },
          { notation: '6-10', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '26-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '24-20', explanation: { pt: 'O branco desenvolve pelo outro flanco, completando o quadro inicial.', en: 'White develops on the other flank, rounding out the initial picture.' } },
        ],
      },
    ],
  },
  {
    id: 'switcher',
    name: { pt: 'A Alternadora', en: 'Switcher' },
    description: {
      pt: 'Preta troca a diagonal habitual com 10-15, alternando o padrão de desenvolvimento mais comum.',
      en: 'Black switches the usual diagonal with 10-15, alternating away from the most common development pattern.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '10-15', explanation: { pt: 'Troca a diagonal habitual, alternando o padrão de desenvolvimento mais comum.', en: 'Switches the usual diagonal, alternating away from the most common development pattern.' } },
          { notation: '22-17', explanation: { pt: 'O branco desenvolve pelo canto simples, sem contacto direto.', en: 'White develops on the single-corner side, without direct contact.' } },
          { notation: '6-10', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '25-22', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço junto ao canto.', en: 'White does the same, refilling the space near the corner.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça pelo lado do canto duplo.', en: 'Develops a second piece on the double-corner side.' } },
          { notation: '24-19', explanation: { pt: 'O branco desenvolve pelo centro-direita, completando o quadro inicial.', en: "White develops toward the center-right, rounding out the initial picture." } },
        ],
      },
    ],
  },
  {
    id: 'double-corner',
    name: { pt: 'Canto Duplo', en: 'Double Corner' },
    description: {
      pt: 'Preta avança para o lado do canto duplo com 11-16, preparando uma estrutura defensiva sólida nesse flanco.',
      en: 'Black advances toward the double-corner side with 11-16, preparing a solid defensive structure on that flank.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '11-16', explanation: { pt: 'Avança para o lado do canto duplo, preparando uma estrutura defensiva sólida.', en: 'Advances toward the double-corner side, preparing a solid defensive structure.' } },
          { notation: '21-17', explanation: { pt: 'O branco desenvolve pelo lado do canto simples, mantendo a estrutura compacta.', en: 'White develops on the single-corner side, keeping the structure compact.' } },
          { notation: '7-11', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '25-21', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço junto ao canto.', en: 'White does the same, refilling the space near the corner.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça em direção ao centro.', en: 'Develops a second piece toward the center.' } },
          { notation: '24-20', explanation: { pt: 'O branco desenvolve pelo outro flanco, equilibrando a posição.', en: 'White develops on the other flank, balancing the position.' } },
        ],
      },
    ],
  },
  {
    id: 'laird-and-lady',
    name: { pt: 'O Senhor e a Dama', en: 'Laird and Lady' },
    description: {
      pt: 'Uma abertura clássica que começa com 12-16, uma das sete jogadas de abertura legais mais raramente vista nas outras aberturas desta lista.',
      en: 'A classic opening starting with 12-16, one of the seven legal opening moves rarely seen among the other openings in this list.',
    },
    lines: [
      {
        name: { pt: 'Linha principal', en: 'Main line' },
        moves: [
          { notation: '12-16', explanation: { pt: 'Uma das sete jogadas de abertura legais, pouco vista nas outras aberturas desta lista.', en: 'One of the seven legal opening moves, rarely seen among the other openings in this list.' } },
          { notation: '23-18', explanation: { pt: 'O branco desenvolve pelo centro, sem entrar em contacto direto.', en: 'White develops through the center, without direct contact.' } },
          { notation: '8-12', explanation: { pt: 'Preenche a casa que a primeira peça deixou livre, mantendo a retaguarda coesa.', en: 'Fills the square the first piece left behind, keeping the back ranks cohesive.' } },
          { notation: '27-23', explanation: { pt: 'O branco faz o mesmo, reocupando o espaço deixado pela peça que avançou.', en: 'White does the same, refilling the space left by the piece that advanced.' } },
          { notation: '9-13', explanation: { pt: 'Desenvolve uma segunda peça pelo lado do canto duplo.', en: 'Develops a second piece on the double-corner side.' } },
          { notation: '21-17', explanation: { pt: 'O branco desenvolve pelo canto simples, completando o quadro inicial.', en: "White develops on the single-corner side, rounding out the initial picture." } },
        ],
      },
    ],
  },
];
