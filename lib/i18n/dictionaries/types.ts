export interface Dictionary {
  common: {
    mainMenu: string;
    close: string;
    cancel: string;
    thinking: string;
    backToTutorial: string;
  };
  menu: {
    title: string;
    playVsComputer: string;
    twoPlayers: string;
    learnToPlay: string;
    options: string;
  };
  opcoes: {
    title: string;
    defaultDifficultyLegend: string;
    defaultColorLegend: string;
    boardTheme: string;
    pieceStyle: string;
    backgroundImage: string;
    language: string;
    portuguese: string;
    english: string;
    toastDifficultyChanged: string;
    toastColorChanged: string;
    toastBoardThemeChanged: string;
    toastPieceStyleChanged: string;
    toastBackgroundChanged: string;
    toastLanguageChanged: string;
  };
  difficulty: { facil: string; medio: string; dificil: string };
  color: { black: string; white: string; random: string };
  pieceStyleLabel: { classico: string; moderno: string; anime: string };
  boardThemeLabel: { sakura: string; nebulosa: string; neon: string };
  backgroundThemeLabel: { templo: string; dojo: string; cosmico: string };
  configurar: { title: string; difficultyLegend: string; colorLegend: string; start: string };
  jogar: {
    turnBlack: string;
    turnWhite: string;
    gameOver: string;
    engineUnavailable: string;
    chooseCapture: string;
    restart: string;
    rules: string;
    confirmRestartTitle: string;
    confirmRestartMessage: string;
    confirmRestartButton: string;
    confirmMenuTitle: string;
    confirmMenuMessage: string;
    confirmMenuButton: string;
  };
  learningPanel: {
    enable: string;
    disable: string;
    suggestMove: string;
    suggestionLoading: string;
  };
  rulesModal: {
    title: string;
    movementTitle: string;
    man: { title: string; text: string };
    king: { title: string; text: string };
    mandatoryCaptureTitle: string;
    mandatoryCapture: { title: string; text: string };
    multiJump: { title: string; text: string };
    promotionTitle: string;
    promotion: { title: string; text: string };
    drawTitle: string;
    repetition: { title: string; text: string };
    noCaptureDraw: { title: string; text: string };
  };
  gameEndModal: { playAgain: string };
  gameEndMessage: {
    aiLose: string;
    aiWin: string;
    localBlackWins: string;
    localWhiteWins: string;
    drawRepetition: string;
    drawNoCapture: string;
  };
  aprenderHub: {
    title: string;
    piecesTitle: string;
    piecesDesc: string;
    specialRulesTitle: string;
    specialRulesDesc: string;
    endgameTitle: string;
    endgameDesc: string;
    strategyTitle: string;
    strategyDesc: string;
    centipawnsTitle: string;
    centipawnsDesc: string;
    openingsTitle: string;
    openingsDesc: string;
  };
  pecas: {
    title: string;
    manMovement: { title: string; desc: string };
    kingMovement: { title: string; desc: string };
    promotion: { title: string; desc: string };
  };
  regrasEspeciais: {
    title: string;
    mandatoryCapture: { title: string; desc: string };
    multiJump: { title: string; desc: string };
  };
  fimDeJogo: {
    title: string;
    noLegalMoves: { title: string; desc: string };
    drawTitle: string;
    drawText: string;
  };
  estrategia: {
    title: string;
    principles: { title: string; text: string }[];
  };
  centipawnsPage: {
    title: string;
    positionEvaluation: { title: string; text: string };
    evalLoss: { title: string; text: string };
    levelsHeading: string;
    qualityTexts: { boa: string; imprecisao: string; erro: string };
  };
  openings: {
    hubTitle: string;
    disclaimer: string;
    backToOpenings: string;
    practiceThisOpening: string;
    practiceTitle: (name: string) => string;
    backToStudy: string;
    linesTablistLabel: string;
    previous: string;
    next: string;
    startPosition: string;
    lineComplete: string;
    practiceAgain: string;
    wrongMove: (notation: string) => string;
    yourTurn: string;
  };
  interactiveDemo: { reset: string };
}
