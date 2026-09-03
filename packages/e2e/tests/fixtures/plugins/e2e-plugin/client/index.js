// a real browser bundle: no bare imports, because nothing resolves them in a
// page. the host exposes its own React so hooks and context work
const React = window.__SHARKORD_REACT__;

const testable = (testId, label) => () =>
  React.createElement('div', { 'data-testid': testId }, label);

// mirrors what a real plugin does: ask whether the user may run the action and
// disable the control rather than let the call fail
const ActionButtons = () => {
  const { useCanUse } = window.__SHARKORD_STORE__.hooks;

  return React.createElement(
    'div',
    { 'data-testid': 'e2e-plugin-actions' },
    React.createElement(
      'button',
      {
        'data-testid': 'e2e-plugin-restricted-action',
        disabled: !useCanUse('action', 'e2e-restricted')
      },
      'restricted'
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'e2e-plugin-open-action',
        disabled: !useCanUse('action', 'e2e-open')
      },
      'open'
    )
  );
};

const UserSettings = () => {
  const { data, loading, save } = window.__SHARKORD_STORE__.hooks.useUserData();

  return React.createElement(
    'div',
    { 'data-testid': 'e2e-plugin-user-settings' },
    // its own node, so a test can read the stored value without also matching
    // the button's label
    React.createElement(
      'span',
      { 'data-testid': 'e2e-plugin-note' },
      loading ? 'loading' : String(data.note ?? 'empty')
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'e2e-plugin-save',
        onClick: () => save({ note: 'saved' })
      },
      'save'
    )
  );
};

export const components = {
  // the topbar is on screen for the whole session, unlike chat_actions which
  // needs a channel open first
  topbar_right: [testable('e2e-plugin-topbar', 'topbar'), ActionButtons],
  chat_actions: [testable('e2e-plugin-chat-action', 'chat action')],
  user_settings: [UserSettings]
};

export const tabs = [
  {
    id: 'e2e-tab',
    label: 'E2E Tab',
    component: testable('e2e-plugin-tab', 'tab content')
  }
];
