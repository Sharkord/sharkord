import { describe, expect, test } from 'bun:test';
import { Element, htmlToDOM } from 'html-react-parser';
import { getEmbedOnlyParagraphAnchor } from '../embed-paragraph';

const parseFirst = (html: string) => {
  const [node] = htmlToDOM(html);

  return node;
};

const hrefOf = (node: ReturnType<typeof parseFirst>) => {
  const anchor = getEmbedOnlyParagraphAnchor(node);

  return anchor instanceof Element ? anchor.attribs.href : undefined;
};

describe('getEmbedOnlyParagraphAnchor', () => {
  // this is the message a hydration error comes from: the server sends the link
  // wrapped in a paragraph, and the override that replaces the anchor is a block
  test('should find the anchor when the paragraph holds only the link', () => {
    expect(
      hrefOf(
        parseFirst(
          '<p><a href="https://youtu.be/abc">https://youtu.be/abc</a></p>'
        )
      )
    ).toBe('https://youtu.be/abc');
  });

  test('should ignore the whitespace and breaks the editor leaves around the link', () => {
    expect(
      hrefOf(
        parseFirst('<p>\n  <a href="https://youtu.be/abc">x</a>\n  <br>\n</p>')
      )
    ).toBe('https://youtu.be/abc');
  });

  test('should not treat a link with text before it as embed only', () => {
    expect(
      hrefOf(
        parseFirst('<p>watch this <a href="https://youtu.be/abc">x</a></p>')
      )
    ).toBeUndefined();
  });

  test('should not treat a link with text after it as embed only', () => {
    expect(
      hrefOf(
        parseFirst('<p><a href="https://youtu.be/abc">x</a> it is good</p>')
      )
    ).toBeUndefined();
  });

  // the paragraph keeps its own structure when anything richer is in it, so the
  // override is not hoisted out from under children it would have to carry
  test('should not treat a paragraph with formatting as embed only', () => {
    expect(
      hrefOf(
        parseFirst(
          '<p><strong><a href="https://youtu.be/abc">x</a></strong></p>'
        )
      )
    ).toBeUndefined();
  });

  test('should not treat a paragraph with two links as embed only', () => {
    expect(
      hrefOf(
        parseFirst(
          '<p><a href="https://youtu.be/abc">x</a> <a href="https://youtu.be/def">y</a></p>'
        )
      )
    ).toBeUndefined();
  });

  test('should not treat a paragraph with no link as embed only', () => {
    expect(hrefOf(parseFirst('<p>just text</p>'))).toBeUndefined();
  });

  test('should not treat an empty paragraph as embed only', () => {
    expect(getEmbedOnlyParagraphAnchor(parseFirst('<p></p>'))).toBeUndefined();
    expect(
      getEmbedOnlyParagraphAnchor(parseFirst('<p>   </p>'))
    ).toBeUndefined();
  });

  test('should ignore an anchor whose href is not a parsable url', () => {
    expect(
      hrefOf(parseFirst('<p><a href="/relative">x</a></p>'))
    ).toBeUndefined();
  });

  test('should ignore the same anchor shape outside a paragraph', () => {
    expect(
      hrefOf(parseFirst('<div><a href="https://youtu.be/abc">x</a></div>'))
    ).toBeUndefined();
  });
});
