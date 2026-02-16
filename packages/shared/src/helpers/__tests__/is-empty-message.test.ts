import { describe, test, expect } from "bun:test";
import { isEmptyMessage } from "../is-empty-message";

describe("is-empty-message", () => {
  test("should return true for empty string", () => {
    expect(isEmptyMessage("")).toBe(true);
  });

  test("should return true for whitespace only", () => {
    expect(isEmptyMessage("   ")).toBe(true);
    expect(isEmptyMessage("\n\n")).toBe(true);
    expect(isEmptyMessage("\t")).toBe(true);
  });

  test("should return true for &nbsp; entities only", () => {
    expect(isEmptyMessage("&nbsp;")).toBe(true);
    expect(isEmptyMessage("&nbsp;&nbsp;&nbsp;")).toBe(true);
  });

  test("should return true for unicode non-breaking spaces only", () => {
    expect(isEmptyMessage("\u00A0")).toBe(true);
    expect(isEmptyMessage("\u00A0\u00A0\u00A0")).toBe(true);
  });

  test("should return true for empty HTML tags", () => {
    expect(isEmptyMessage("<p></p>")).toBe(true);
    expect(isEmptyMessage("<div><span></span></div>")).toBe(true);
    expect(isEmptyMessage("<br>")).toBe(true);
    expect(isEmptyMessage("<p><br></p>")).toBe(true);
  });

  test("should return true for ProseMirror separator elements", () => {
    expect(isEmptyMessage('<img class="ProseMirror-separator">')).toBe(true);
    expect(isEmptyMessage('<img src="" class="ProseMirror-separator" />')).toBe(
      true,
    );
  });

  test("should return true for ProseMirror trailing break elements", () => {
    expect(isEmptyMessage('<br class="ProseMirror-trailingBreak">')).toBe(true);
    expect(isEmptyMessage('<br class="ProseMirror-trailingBreak" />')).toBe(
      true,
    );
  });

  test("should return true for combination of empty elements", () => {
    expect(
      isEmptyMessage(
        '<p>&nbsp;</p><img class="ProseMirror-separator"><br class="ProseMirror-trailingBreak">',
      ),
    ).toBe(true);
    expect(isEmptyMessage("<p>   </p><div>\u00A0</div>")).toBe(true);
  });

  test("should return false for text content", () => {
    expect(isEmptyMessage("Hello")).toBe(false);
    expect(isEmptyMessage("a")).toBe(false);
    expect(isEmptyMessage("  text  ")).toBe(false);
  });

  test("should return false for text inside HTML tags", () => {
    expect(isEmptyMessage("<p>Hello</p>")).toBe(false);
    expect(isEmptyMessage("<div><span>World</span></div>")).toBe(false);
    expect(isEmptyMessage("<strong>Bold text</strong>")).toBe(false);
  });

  test("should return false for img tags (media)", () => {
    expect(isEmptyMessage('<img src="image.jpg">')).toBe(false);
    expect(isEmptyMessage('<img src="test.png" alt="test">')).toBe(false);
  });

  test("should return false for video tags (media)", () => {
    expect(isEmptyMessage('<video src="video.mp4"></video>')).toBe(false);
    expect(isEmptyMessage("<video><source src='v.mp4'></video>")).toBe(false);
  });

  test("should return false for audio tags (media)", () => {
    expect(isEmptyMessage('<audio src="audio.mp3"></audio>')).toBe(false);
    expect(isEmptyMessage("<audio><source src='a.mp3'></audio>")).toBe(false);
  });

  test("should return false for iframe tags (media)", () => {
    expect(isEmptyMessage('<iframe src="page.html"></iframe>')).toBe(false);
    expect(isEmptyMessage('<iframe src="https://example.com"></iframe>')).toBe(
      false,
    );
  });

  test("should return false for media with ProseMirror elements", () => {
    expect(
      isEmptyMessage(
        '<img src="emoji.png"><img class="ProseMirror-separator">',
      ),
    ).toBe(false);
    expect(
      isEmptyMessage(
        '<video src="v.mp4"></video><br class="ProseMirror-trailingBreak">',
      ),
    ).toBe(false);
  });

  test("should return false for text mixed with empty elements", () => {
    expect(
      isEmptyMessage('<p>Text</p><img class="ProseMirror-separator">'),
    ).toBe(false);
    expect(isEmptyMessage("<p>&nbsp;</p><p>Content</p>")).toBe(false);
  });

  test("should handle complex real-world scenarios", () => {
    expect(
      isEmptyMessage(
        '<p><br class="ProseMirror-trailingBreak"></p><img class="ProseMirror-separator">',
      ),
    ).toBe(true);

    expect(
      isEmptyMessage(
        '<p><img src="emoji/smile.png" alt="😊"></p><img class="ProseMirror-separator">',
      ),
    ).toBe(false);

    expect(isEmptyMessage("<p>&nbsp;</p><p>   </p><p>\u00A0</p>")).toBe(true);

    expect(
      isEmptyMessage("<p><strong>Bold</strong> and <em>italic</em></p>"),
    ).toBe(false);
  });
});
