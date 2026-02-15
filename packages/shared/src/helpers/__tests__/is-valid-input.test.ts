import { describe, test, expect } from "bun:test";
import { isValidInput } from "../is-valid-input";

describe("is-valid-input", () => {
  test("should return true for empty string", () => {
    expect(isValidInput("")).toBe(true);
  });

  test("should return true for whitespace only", () => {
    expect(isValidInput("   ")).toBe(true);
    expect(isValidInput("\n\n")).toBe(true);
    expect(isValidInput("\t")).toBe(true);
  });

  test("should return true for &nbsp; entities only", () => {
    expect(isValidInput("&nbsp;")).toBe(true);
    expect(isValidInput("&nbsp;&nbsp;&nbsp;")).toBe(true);
  });

  test("should return true for unicode non-breaking spaces only", () => {
    expect(isValidInput("\u00A0")).toBe(true);
    expect(isValidInput("\u00A0\u00A0\u00A0")).toBe(true);
  });

  test("should return true for empty HTML tags", () => {
    expect(isValidInput("<p></p>")).toBe(true);
    expect(isValidInput("<div><span></span></div>")).toBe(true);
    expect(isValidInput("<br>")).toBe(true);
    expect(isValidInput("<p><br></p>")).toBe(true);
  });

  test("should return true for ProseMirror separator elements", () => {
    expect(isValidInput('<img class="ProseMirror-separator">')).toBe(true);
    expect(isValidInput('<img src="" class="ProseMirror-separator" />')).toBe(
      true,
    );
  });

  test("should return true for ProseMirror trailing break elements", () => {
    expect(isValidInput('<br class="ProseMirror-trailingBreak">')).toBe(true);
    expect(isValidInput('<br class="ProseMirror-trailingBreak" />')).toBe(
      true,
    );
  });

  test("should return true for combination of empty elements", () => {
    expect(
      isValidInput(
        '<p>&nbsp;</p><img class="ProseMirror-separator"><br class="ProseMirror-trailingBreak">',
      ),
    ).toBe(true);
    expect(isValidInput("<p>   </p><div>\u00A0</div>")).toBe(true);
  });

  test("should return false for text content", () => {
    expect(isValidInput("Hello")).toBe(false);
    expect(isValidInput("a")).toBe(false);
    expect(isValidInput("  text  ")).toBe(false);
  });

  test("should return false for text inside HTML tags", () => {
    expect(isValidInput("<p>Hello</p>")).toBe(false);
    expect(isValidInput("<div><span>World</span></div>")).toBe(false);
    expect(isValidInput("<strong>Bold text</strong>")).toBe(false);
  });

  test("should return false for img tags (media)", () => {
    expect(isValidInput('<img src="image.jpg">')).toBe(false);
    expect(isValidInput('<img src="test.png" alt="test">')).toBe(false);
  });

  test("should return false for video tags (media)", () => {
    expect(isValidInput('<video src="video.mp4"></video>')).toBe(false);
    expect(isValidInput("<video><source src='v.mp4'></video>")).toBe(false);
  });

  test("should return false for audio tags (media)", () => {
    expect(isValidInput('<audio src="audio.mp3"></audio>')).toBe(false);
    expect(isValidInput("<audio><source src='a.mp3'></audio>")).toBe(false);
  });

  test("should return false for iframe tags (media)", () => {
    expect(isValidInput('<iframe src="page.html"></iframe>')).toBe(false);
    expect(isValidInput('<iframe src="https://example.com"></iframe>')).toBe(
      false,
    );
  });

  test("should return false for media with ProseMirror elements", () => {
    expect(
      isValidInput(
        '<img src="emoji.png"><img class="ProseMirror-separator">',
      ),
    ).toBe(false);
    expect(
      isValidInput(
        '<video src="v.mp4"></video><br class="ProseMirror-trailingBreak">',
      ),
    ).toBe(false);
  });

  test("should return false for text mixed with empty elements", () => {
    expect(
      isValidInput('<p>Text</p><img class="ProseMirror-separator">'),
    ).toBe(false);
    expect(isValidInput("<p>&nbsp;</p><p>Content</p>")).toBe(false);
  });

  test("should handle complex real-world scenarios", () => {
    expect(
      isValidInput(
        '<p><br class="ProseMirror-trailingBreak"></p><img class="ProseMirror-separator">',
      ),
    ).toBe(true);

    expect(
      isValidInput(
        '<p><img src="emoji/smile.png" alt="😊"></p><img class="ProseMirror-separator">',
      ),
    ).toBe(false);

    expect(isValidInput("<p>&nbsp;</p><p>   </p><p>\u00A0</p>")).toBe(true);

    expect(
      isValidInput("<p><strong>Bold</strong> and <em>italic</em></p>"),
    ).toBe(false);
  });
});
