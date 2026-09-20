import { Element, Text, type DOMNode } from 'html-react-parser';

// a paragraph that holds nothing but a link override, plus the whitespace and <br>
// the editor leaves behind. text and `br` are the only things allowed next to the
// anchor, so a paragraph that also holds formatting is not a candidate and keeps
// its own structure
const getEmbedOnlyParagraphAnchor = (domNode: DOMNode): Element | undefined => {
  if (!(domNode instanceof Element) || domNode.name !== 'p') {
    return undefined;
  }

  const anchors = domNode.children.filter(
    (child): child is Element =>
      child instanceof Element &&
      child.name === 'a' &&
      !!child.attribs.href &&
      URL.canParse(child.attribs.href)
  );

  if (anchors.length !== 1) {
    return undefined;
  }

  const anchor = anchors[0];

  const onlyWhitespaceAndBreaks = domNode.children.every((child) => {
    if (child === anchor) return true;
    if (child instanceof Element) return child.name === 'br';
    if (child instanceof Text) return child.data.trim().length === 0;
    // comments and directives are not rendered, so they do not break the structure
    return true;
  });

  return onlyWhitespaceAndBreaks ? anchor : undefined;
};

export { getEmbedOnlyParagraphAnchor };
