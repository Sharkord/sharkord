const onLoad = (ctx) => {
  ctx.logger.log('Hooks plugin loaded');

  ctx.hooks.onBeforeMessageSave(async ({ textContent }) => {
    if (textContent.includes('rejectme')) {
      return { reject: 'Blocked by the test filter' };
    }

    if (textContent.includes('crashme')) {
      throw new TypeError('the plugin has a bug');
    }

    if (textContent.includes('rewriteme')) {
      return { update: { content: '<p>rewritten by plugin</p>' } };
    }

    if (textContent.includes('emptyme')) {
      return { update: { content: '<p></p>' } };
    }

    if (textContent.includes('injectme')) {
      return { update: { content: '<p>ok</p><script>alert(1)</script>' } };
    }
  });

  ctx.hooks.onBeforeChannelCreate(async ({ name }) => {
    if (name.includes('rejectme')) {
      return { reject: 'That channel name is not allowed' };
    }

    if (name.includes('renameme')) {
      return { update: { name: 'renamed-by-plugin' } };
    }
  });

  ctx.hooks.onBeforeVoiceJoin(async ({ channelId }) => {
    if (channelId === 2) {
      return { reject: 'Voice is closed right now' };
    }
  });

  ctx.hooks.onBeforeLogin(async ({ identity }) => {
    if (identity === 'blockedidentity') {
      return { reject: 'This account is not allowed to sign in' };
    }
  });
};

const onUnload = () => {};

export { onLoad, onUnload };
