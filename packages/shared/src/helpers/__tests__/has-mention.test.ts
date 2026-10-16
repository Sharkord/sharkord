import { describe, expect, test } from 'bun:test';
import { getMentions, hasMention } from '../has-mention';

describe('has-mention', () => {
  test('should return false for null, undefined, or empty content', () => {
    expect(hasMention(null, 123)).toBe(false);
    expect(hasMention(undefined, 123)).toBe(false);
    expect(hasMention('', 123)).toBe(false);
  });

  test('should return false when userId is undefined', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="123">@user</span></p>';
    expect(hasMention(content, undefined)).toBe(false);
  });

  test('should return false if content does not contain a mention', () => {
    const content = '<p>Hello world</p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return false if content contains a mention for a different user', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="456">@user</span></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return true if content contains a mention for the specified user', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="123">@user</span></p>';
    expect(hasMention(content, 123)).toBe(true);
  });

  test('should return true if content contains multiple mentions including the specified user', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="456">@user1</span> and <span data-type="mention" data-user-id="123">@user2</span></p>';
    expect(hasMention(content, 123)).toBe(true);
  });

  test('should return false if content contains a mention with missing data attributes', () => {
    const content = '<p>Hello <span data-type="mention">@user</span></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return false if content contains a mention with non-numeric user ID', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="abc">@user</span></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return false if content contains a mention with user ID as a substring', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="1234">@user</span></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return false if userId is a substring of the mentioned user ID', () => {
    const content =
      '<p>Hello <span data-type="mention" data-user-id="12">@user</span></p>';
    expect(hasMention(content, 1)).toBe(false);
  });

  test('should return true when attributes are in reversed order', () => {
    const content =
      '<p>Hello <span data-user-id="123" data-type="mention">@user</span></p>';
    expect(hasMention(content, 123)).toBe(true);
  });

  test('should return false for mention attributes on a non-span element', () => {
    const content =
      '<p>Hello <div data-type="mention" data-user-id="123">@user</div></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should return true when span has additional attributes', () => {
    const content =
      '<p>Hello <span class="mention" data-type="mention" data-user-id="123" data-name="user">@user</span></p>';
    expect(hasMention(content, 123)).toBe(true);
  });

  test('should return true when one of the given roles is mentioned', () => {
    const content =
      '<p>Hey <span data-type="role-mention" data-role-id="7" class="role-mention">@Gaming</span></p>';
    expect(hasMention(content, 123, [3, 7])).toBe(true);
  });

  test('should return false when a role the user does not have is mentioned', () => {
    const content =
      '<p>Hey <span data-type="role-mention" data-role-id="7">@Gaming</span></p>';
    expect(hasMention(content, 123, [3])).toBe(false);
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should match a role mention with the attributes in either order', () => {
    const content =
      '<p><span data-role-id="7" data-type="role-mention">@Gaming</span></p>';
    expect(hasMention(content, 123, [7])).toBe(true);
  });

  test('should not treat a role mention as a user mention with the same id', () => {
    const content =
      '<p><span data-type="role-mention" data-role-id="123">@Gaming</span></p>';
    expect(hasMention(content, 123)).toBe(false);
  });

  test('should not treat a user mention as a role mention with the same id', () => {
    const content =
      '<p><span data-type="mention" data-user-id="7">@user</span></p>';
    expect(hasMention(content, 123, [7])).toBe(false);
  });
});

describe('get-mentions', () => {
  test('should return the mentioned users and roles once each', () => {
    const content =
      '<p><span data-type="mention" data-user-id="5">@a</span> <span data-user-id="5" data-type="mention">@a</span> <span data-type="role-mention" data-role-id="2">@Mods</span> <span data-type="mention" data-user-id="9">@b</span></p>';

    expect(getMentions(content)).toEqual({ userIds: [5, 9], roleIds: [2] });
  });

  test('should return nothing for empty content', () => {
    expect(getMentions(null)).toEqual({ userIds: [], roleIds: [] });
    expect(getMentions('')).toEqual({ userIds: [], roleIds: [] });
  });

  test('should not count mention attributes typed as plain text', () => {
    const content =
      '<p>data-type="mention" data-user-id="5" and <code>data-role-id="2"</code></p>';

    expect(getMentions(content)).toEqual({ userIds: [], roleIds: [] });
  });

  test('should not count a span without the mention node type', () => {
    const content =
      '<p><span data-user-id="5">hi</span> <span data-type="channel-reference" data-channel-id="1" data-role-id="2">#general</span></p>';

    expect(getMentions(content)).toEqual({ userIds: [], roleIds: [] });
  });
});
