import ipaddr from 'ipaddr.js';
import type { IceCandidate } from 'mediasoup/types';
import { isIpOfFamily } from './network';

const addInternalIceCandidates = (
  candidates: IceCandidate[],
  internalAddress: string | undefined
): IceCandidate[] => {
  if (!internalAddress) return candidates;

  const internalAddressParsed = ipaddr.parse(internalAddress);
  const internalKind = internalAddressParsed.kind();

  const internalCandidates = candidates
    .filter(
      ({ address }) =>
        address !== internalAddress && isIpOfFamily(address, internalKind)
    )
    .map((candidate) => ({
      ...candidate,
      foundation: `${candidate.foundation}internal`,
      priority: candidate.priority + 1,
      ip: internalAddress,
      address: internalAddress
    }));

  return [...internalCandidates, ...candidates];
};

export { addInternalIceCandidates };
