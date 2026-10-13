enum HotkeyGroup {
  CORE = 'core'
}

enum CoreHotkeyAction {
  TOGGLE_MIC = `${HotkeyGroup.CORE}:toggle-mic`,
  TOGGLE_SOUND = `${HotkeyGroup.CORE}:toggle-sound`,
  PUSH_TO_TALK = `${HotkeyGroup.CORE}:push-to-talk`
}

const getHotkeyActionGroup = (actionId: string) => {
  const separator = actionId.indexOf(':');

  if (separator === -1) {
    return actionId;
  }

  return actionId.slice(0, separator);
};

export { CoreHotkeyAction, HotkeyGroup, getHotkeyActionGroup };
