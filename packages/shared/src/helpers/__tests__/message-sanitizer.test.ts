import { describe, expect, test } from 'bun:test';
import {
  isEmojiOnlyMessage,
  isEmptyMessage,
  removeCommandElements,
  removeEmojiElements
} from '../message-sanitizer';

describe('isEmptyMessage', () => {
  test('should return true for empty string', () => {
    expect(isEmptyMessage('')).toBe(true);
  });

  test('should return true for whitespace only', () => {
    expect(isEmptyMessage('   ')).toBe(true);
    expect(isEmptyMessage('\n\n')).toBe(true);
    expect(isEmptyMessage('\t')).toBe(true);
  });

  test('should return true for &nbsp; entities only', () => {
    expect(isEmptyMessage('&nbsp;')).toBe(true);
    expect(isEmptyMessage('&nbsp;&nbsp;&nbsp;')).toBe(true);
  });

  test('should return true for unicode non-breaking spaces only', () => {
    expect(isEmptyMessage('\u00A0')).toBe(true);
    expect(isEmptyMessage('\u00A0\u00A0\u00A0')).toBe(true);
  });

  test('should return true for empty HTML tags', () => {
    expect(isEmptyMessage('<p></p>')).toBe(true);
    expect(isEmptyMessage('<div><span></span></div>')).toBe(true);
    expect(isEmptyMessage('<br>')).toBe(true);
    expect(isEmptyMessage('<p><br></p>')).toBe(true);
  });

  test('should return true for ProseMirror separator elements', () => {
    expect(isEmptyMessage('<img class="ProseMirror-separator">')).toBe(true);
    expect(isEmptyMessage('<img src="" class="ProseMirror-separator" />')).toBe(
      true
    );
  });

  test('should return true for ProseMirror trailing break elements', () => {
    expect(isEmptyMessage('<br class="ProseMirror-trailingBreak">')).toBe(true);
    expect(isEmptyMessage('<br class="ProseMirror-trailingBreak" />')).toBe(
      true
    );
  });

  test('should return true for combination of empty elements', () => {
    expect(
      isEmptyMessage(
        '<p>&nbsp;</p><img class="ProseMirror-separator"><br class="ProseMirror-trailingBreak">'
      )
    ).toBe(true);
    expect(isEmptyMessage('<p>   </p><div>\u00A0</div>')).toBe(true);
  });

  test('should return false for text content', () => {
    expect(isEmptyMessage('Hello')).toBe(false);
    expect(isEmptyMessage('a')).toBe(false);
    expect(isEmptyMessage('  text  ')).toBe(false);
  });

  test('should return false for text inside HTML tags', () => {
    expect(isEmptyMessage('<p>Hello</p>')).toBe(false);
    expect(isEmptyMessage('<div><span>World</span></div>')).toBe(false);
    expect(isEmptyMessage('<strong>Bold text</strong>')).toBe(false);
  });

  test('should return false for img tags (media)', () => {
    expect(isEmptyMessage('<img src="image.jpg">')).toBe(false);
    expect(isEmptyMessage('<img src="test.png" alt="test">')).toBe(false);
  });

  test('should return false for video tags (media)', () => {
    expect(isEmptyMessage('<video src="video.mp4"></video>')).toBe(false);
    expect(isEmptyMessage("<video><source src='v.mp4'></video>")).toBe(false);
  });

  test('should return false for audio tags (media)', () => {
    expect(isEmptyMessage('<audio src="audio.mp3"></audio>')).toBe(false);
    expect(isEmptyMessage("<audio><source src='a.mp3'></audio>")).toBe(false);
  });

  test('should return false for iframe tags (media)', () => {
    expect(isEmptyMessage('<iframe src="page.html"></iframe>')).toBe(false);
    expect(isEmptyMessage('<iframe src="https://example.com"></iframe>')).toBe(
      false
    );
  });

  test('should return false for media with ProseMirror elements', () => {
    expect(
      isEmptyMessage('<img src="emoji.png"><img class="ProseMirror-separator">')
    ).toBe(false);
    expect(
      isEmptyMessage(
        '<video src="v.mp4"></video><br class="ProseMirror-trailingBreak">'
      )
    ).toBe(false);
  });

  test('should return false for text mixed with empty elements', () => {
    expect(
      isEmptyMessage('<p>Text</p><img class="ProseMirror-separator">')
    ).toBe(false);
    expect(isEmptyMessage('<p>&nbsp;</p><p>Content</p>')).toBe(false);
  });

  test('should handle complex real-world scenarios', () => {
    expect(
      isEmptyMessage(
        '<p><br class="ProseMirror-trailingBreak"></p><img class="ProseMirror-separator">'
      )
    ).toBe(true);

    expect(
      isEmptyMessage(
        '<p><img src="emoji/smile.png" alt="😊"></p><img class="ProseMirror-separator">'
      )
    ).toBe(false);

    expect(isEmptyMessage('<p>&nbsp;</p><p>   </p><p>\u00A0</p>')).toBe(true);

    expect(
      isEmptyMessage('<p><strong>Bold</strong> and <em>italic</em></p>')
    ).toBe(false);
  });
});

describe('isEmojiOnlyMessage', () => {
  test('should return false for null/undefined/empty', () => {
    expect(isEmojiOnlyMessage(null)).toBe(false);
    expect(isEmojiOnlyMessage(undefined)).toBe(false);
    expect(isEmojiOnlyMessage('')).toBe(false);
  });

  test('should return false for plain text', () => {
    expect(isEmojiOnlyMessage('Hello')).toBe(false);
    expect(isEmojiOnlyMessage('<p>Hello world</p>')).toBe(false);
  });

  test('should return true for a single native emoji', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span></p>'
      )
    ).toBe(true);
  });

  test('should return true for multiple native emojis', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span><span data-type="emoji" data-name="heart" class="emoji-image">❤️</span></p>'
      )
    ).toBe(true);
  });

  test('should return true for a single custom emoji image', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><img src="https://cdn.example.com/emoji.png" alt="custom" class="emoji-image"></p>'
      )
    ).toBe(true);
  });

  test('should return true for mixed native and custom emojis', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span><img src="https://cdn.example.com/emoji.png" alt="custom" class="emoji-image"></p>'
      )
    ).toBe(true);
  });

  test('should return false for emoji mixed with text', () => {
    expect(
      isEmojiOnlyMessage(
        '<p>Hello <span data-type="emoji" data-name="smile" class="emoji-image">😄</span></p>'
      )
    ).toBe(false);
  });

  test('should return false for emoji followed by text', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span> world</p>'
      )
    ).toBe(false);
  });

  test('should return true for emojis across multiple paragraphs', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span></p><p><span data-type="emoji" data-name="heart" class="emoji-image">❤️</span></p>'
      )
    ).toBe(true);
  });

  test('should return false for non-emoji images', () => {
    expect(
      isEmojiOnlyMessage('<p><img src="https://example.com/photo.jpg"></p>')
    ).toBe(false);
  });

  test('should return false for non-emoji spans', () => {
    expect(
      isEmojiOnlyMessage('<p><span class="highlight">text</span></p>')
    ).toBe(false);
  });

  test('should return true for emojis with surrounding whitespace', () => {
    expect(
      isEmojiOnlyMessage(
        '<p> <span data-type="emoji" data-name="smile" class="emoji-image">😄</span> </p>'
      )
    ).toBe(true);
  });

  test('should return false for empty tags without emojis', () => {
    expect(isEmojiOnlyMessage('<p></p>')).toBe(false);
    expect(isEmojiOnlyMessage('<p><br></p>')).toBe(false);
  });

  test('should return true for self-closing custom emoji img', () => {
    expect(
      isEmojiOnlyMessage(
        '<p><img src="https://cdn.example.com/emoji.png" alt="custom" class="emoji-image" /></p>'
      )
    ).toBe(true);
  });
});

describe('removeEmojiElements', () => {
  test('should remove native emoji spans', () => {
    const html =
      '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span></p>';
    expect(removeEmojiElements(html)).toBe('<p></p>');
  });

  test('should remove custom emoji img with class on parent span', () => {
    const html =
      '<p><span data-name="cool_doge" class="emoji-image" data-type="emoji"><img src="https://rc.sharkord.com/public/Cool%20Doge.gif" draggable="false" loading="lazy" align="absmiddle" alt="cool_doge emoji" /></span></p>';
    expect(removeEmojiElements(html)).toBe('<p></p>');
  });

  test('should remove bare emoji img tags', () => {
    const html =
      '<p><img src="https://cdn.example.com/emoji.png" alt="custom" class="emoji-image"></p>';
    expect(removeEmojiElements(html)).toBe('<p></p>');
  });

  test('should remove self-closing emoji img tags', () => {
    const html =
      '<p><img src="https://cdn.example.com/emoji.png" alt="custom" class="emoji-image" /></p>';
    expect(removeEmojiElements(html)).toBe('<p></p>');
  });

  test('should preserve non-emoji content', () => {
    const html =
      '<p>Hello <span data-type="emoji" data-name="smile" class="emoji-image">😄</span> world</p>';
    expect(removeEmojiElements(html)).toBe('<p>Hello  world</p>');
  });

  test('should remove multiple emojis', () => {
    const html =
      '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span><span data-type="emoji" data-name="heart" class="emoji-image">❤️</span></p>';
    expect(removeEmojiElements(html)).toBe('<p></p>');
  });

  test('should not remove non-emoji images', () => {
    const html = '<p><img src="https://example.com/photo.jpg" alt="photo"></p>';
    expect(removeEmojiElements(html)).toBe(html);
  });

  test('should not remove non-emoji spans', () => {
    const html = '<p><span class="highlight">text</span></p>';
    expect(removeEmojiElements(html)).toBe(html);
  });

  test('should return unchanged string with no emoji elements', () => {
    const html = '<p>Just some text</p>';
    expect(removeEmojiElements(html)).toBe(html);
  });
});

describe('removeCommandElements', () => {
  test('should remove a command element', () => {
    const html = `<command data-plugin-id="sharkord-music-bot" data-plugin-logo="https://i.imgur.com/uVBNUK9.png" data-command="stop" data-args='[]' data-status='completed' data-response=''></command>`;
    expect(removeCommandElements(html)).toBe('');
  });

  test('should remove a command element with inner content', () => {
    const html = `<command data-plugin-id="test" data-command="play">some content</command>`;
    expect(removeCommandElements(html)).toBe('');
  });

  test('should remove command element and preserve surrounding content', () => {
    const html = `<p>Hello</p><command data-plugin-id="sharkord-music-bot" data-command="stop" data-args='[]' data-status='completed' data-response=''></command><p>World</p>`;
    expect(removeCommandElements(html)).toBe('<p>Hello</p><p>World</p>');
  });

  test('should remove multiple command elements', () => {
    const html = `<command data-plugin-id="a" data-command="play"></command><p>text</p><command data-plugin-id="b" data-command="stop"></command>`;
    expect(removeCommandElements(html)).toBe('<p>text</p>');
  });

  test('should not affect non-command elements', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(removeCommandElements(html)).toBe(html);
  });

  test('should not affect emoji elements', () => {
    const html =
      '<p><span data-type="emoji" data-name="smile" class="emoji-image">😄</span></p>';
    expect(removeCommandElements(html)).toBe(html);
  });

  test('should return unchanged string with no command elements', () => {
    const html = '<p>Just some text</p>';
    expect(removeCommandElements(html)).toBe(html);
  });
});
