import { describe, expect, test } from 'bun:test';
import type { IceCandidate } from 'mediasoup/types';
import { addInternalIceCandidates } from '../add-internal-ice-candidates';

const PUBLIC_IP = '203.0.113.7';
const INTERNAL_IP = '192.168.1.10';

const udpCandidate: IceCandidate = {
  foundation: 'udpcandidate',
  priority: 1076302079,
  ip: PUBLIC_IP,
  address: PUBLIC_IP,
  protocol: 'udp',
  port: 40000,
  type: 'host'
};

const tcpCandidate: IceCandidate = {
  foundation: 'tcpcandidate',
  priority: 1076276479,
  ip: PUBLIC_IP,
  address: PUBLIC_IP,
  protocol: 'tcp',
  port: 40000,
  type: 'host',
  tcpType: 'passive'
};

const PUBLIC_IPV6 = '2001:db8::7';

const udpCandidateV6: IceCandidate = {
  ...udpCandidate,
  foundation: 'udpcandidatev6',
  ip: PUBLIC_IPV6,
  address: PUBLIC_IPV6
};

describe('addInternalIceCandidates', () => {
  test('returns the candidates untouched when no internal address is set', () => {
    const candidates = [udpCandidate, tcpCandidate];

    expect(addInternalIceCandidates(candidates, undefined)).toBe(candidates);
  });

  test('keeps every public candidate so remote clients can still connect', () => {
    const result = addInternalIceCandidates(
      [udpCandidate, tcpCandidate],
      INTERNAL_IP
    );

    expect(result).toContainEqual(udpCandidate);
    expect(result).toContainEqual(tcpCandidate);
    expect(result).toHaveLength(4);
  });

  test('adds an internal copy of each candidate on the same port and protocol', () => {
    const result = addInternalIceCandidates(
      [udpCandidate, tcpCandidate],
      INTERNAL_IP
    );

    const internal = result.filter(({ address }) => address === INTERNAL_IP);

    expect(internal).toHaveLength(2);

    for (const candidate of internal) {
      expect(candidate.ip).toBe(INTERNAL_IP);
      expect(candidate.port).toBe(40000);
      expect(candidate.type).toBe('host');
    }

    expect(internal.map(({ protocol }) => protocol).sort()).toEqual([
      'tcp',
      'udp'
    ]);
    expect(internal.find(({ protocol }) => protocol === 'tcp')?.tcpType).toBe(
      'passive'
    );
  });

  // two candidates with one foundation are treated as the same network path by ice
  test('gives the internal candidates their own foundations', () => {
    const result = addInternalIceCandidates(
      [udpCandidate, tcpCandidate],
      INTERNAL_IP
    );

    const foundations = result.map(({ foundation }) => foundation);

    expect(new Set(foundations).size).toBe(foundations.length);

    for (const foundation of foundations) {
      expect(foundation).toMatch(/^[a-zA-Z0-9+/]{1,32}$/);
    }
  });

  test('prefers the internal path, without ranking udp below tcp', () => {
    const result = addInternalIceCandidates(
      [udpCandidate, tcpCandidate],
      INTERNAL_IP
    );

    const priorityOf = (address: string, protocol: string) =>
      result.find((c) => c.address === address && c.protocol === protocol)
        ?.priority ?? 0;

    expect(priorityOf(INTERNAL_IP, 'udp')).toBeGreaterThan(
      priorityOf(PUBLIC_IP, 'udp')
    );
    expect(priorityOf(INTERNAL_IP, 'tcp')).toBeGreaterThan(
      priorityOf(PUBLIC_IP, 'tcp')
    );
    expect(priorityOf(PUBLIC_IP, 'udp')).toBeGreaterThan(
      priorityOf(INTERNAL_IP, 'tcp')
    );
  });

  test('adds nothing when the internal address is the announced one', () => {
    const candidates = [udpCandidate, tcpCandidate];

    expect(addInternalIceCandidates(candidates, PUBLIC_IP)).toEqual(candidates);
  });

  test('only copies candidates of the same address family', () => {
    const result = addInternalIceCandidates(
      [udpCandidate, udpCandidateV6],
      INTERNAL_IP
    );

    const internal = result.filter(({ address }) => address === INTERNAL_IP);

    expect(internal).toHaveLength(1);
    expect(internal[0]?.foundation).toBe(`${udpCandidate.foundation}internal`);
    expect(result).toContainEqual(udpCandidateV6);
  });

  test('copies ipv6 candidates for an ipv6 internal address', () => {
    const internalIpV6 = 'fd00::10';
    const result = addInternalIceCandidates(
      [udpCandidate, udpCandidateV6],
      internalIpV6
    );

    const internal = result.filter(({ address }) => address === internalIpV6);

    expect(internal).toHaveLength(1);
    expect(internal[0]?.foundation).toBe(
      `${udpCandidateV6.foundation}internal`
    );
  });
});
