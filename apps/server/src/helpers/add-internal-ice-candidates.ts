import type { IceCandidate } from 'mediasoup/types';

const addInternalIceCandidates = (
  candidates: IceCandidate[],
  internalAddress: string | undefined
): IceCandidate[] => {
  if (!internalAddress) return candidates;

  const internalCandidates = candidates
    .filter(({ address }) => address !== internalAddress)
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
