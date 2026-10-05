export const PAGE_MODES = {
  yes: {
    modeLabel: 'YES',
    documentTitle: 'YESorNOaaS - Yes',
    heading: 'Ask a yes/no question and get a Yes! response',
    submitLabel: 'Ask for Yes!',
    emptyHint: 'Your answer lands here.',
    linkLabel: 'YESorNOaaS yes link',
    linkDesc: 'Opening this link shows the question and the Yes! reply.',
    defaultAnswer: 'yes',
    defaultAnswerText: 'Yes!',
    replays: [
      { mode: 'no', text: 'Get a "No!" replay' },
      { mode: 'random', text: 'Get a random replay' }
    ]
  },
  no: {
    modeLabel: 'NO',
    documentTitle: 'YESorNOaaS - No',
    heading: 'Ask a yes/no question and get a No! response',
    submitLabel: 'Ask for No!',
    emptyHint: 'Your answer lands here.',
    linkLabel: 'YESorNOaaS no link',
    linkDesc: 'Opening this link shows the question and the No! reply.',
    defaultAnswer: 'no',
    defaultAnswerText: 'No!',
    replays: [
      { mode: 'yes', text: 'Get a "Yes!" replay' },
      { mode: 'random', text: 'Get a random replay' }
    ]
  },
  random: {
    modeLabel: 'RANDOM',
    documentTitle: 'YESorNOaaS - Random',
    heading: 'Ask a yes/no question and get a random Yes! or No! response',
    submitLabel: 'Ask for Random!',
    emptyHint: 'Your answer lands here. Could go either way.',
    linkLabel: 'YESorNOaaS random link',
    linkDesc: 'Opening this link shows the question and a new random Yes! or No! reply.',
    defaultAnswer: 'yes',
    defaultAnswerText: '',
    replays: [
      { mode: 'yes', text: 'Get a "Yes!" replay' },
      { mode: 'no', text: 'Get a "No!" replay' }
    ]
  }
};

export function resolvePageMode(pathname) {
  if (pathname === '/no') {
    return 'no';
  }

  if (pathname === '/random') {
    return 'random';
  }

  return 'yes';
}

export function getPageConfig(mode) {
  const config = PAGE_MODES[mode];

  if (!config) {
    throw new Error(`Unknown page mode: ${mode}`);
  }

  return config;
}

function createReplayLink(replay, root = document) {
  const link = root.createElement('a');
  link.href = `/${replay.mode}`;
  link.dataset.replayMode = replay.mode;

  const label = root.createElement('span');
  label.textContent = replay.text;
  link.append(label);

  const arrow = root.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  link.append(arrow);

  return link;
}

export function applyPageCopy(mode, root = document) {
  const config = getPageConfig(mode);
  const body = root.body;

  body.dataset.mode = mode;
  root.title = config.documentTitle;

  root.querySelector('.mode').textContent = config.modeLabel;
  root.querySelector('#page-heading').textContent = config.heading;
  root.querySelector('#submit').setAttribute('aria-label', config.submitLabel);
  root.querySelector('#empty-hint').textContent = config.emptyHint;
  root.querySelector('#link-label').textContent = config.linkLabel;
  root.querySelector('#share-help').textContent = config.linkDesc;

  const answerElement = root.querySelector('#answer');
  answerElement.dataset.answer = config.defaultAnswer;
  root.querySelector('#answer-text').textContent = config.defaultAnswerText;

  const replaysNav = root.querySelector('#replays');
  replaysNav.replaceChildren(...config.replays.map((replay) => createReplayLink(replay, root)));

  return config;
}
