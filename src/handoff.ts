/**
 * Multi-entity handoff: Entity A produces signed artifact -> Entity B consumes as input.
 */

import { Store, getInbox, putInbox } from "./persistence.js";
import { artifactHash, signArtifact, verifyArtifact } from "./signing.js";
import type { ReceivedArtifact } from "./types.js";

/**
 * Sign artifact and deliver to recipient's inbox. Returns artifact_ref.
 * recipientStore is the recipient entity's Store (entity_id = recipient).
 */
export function sendArtifact(
  senderEntityId: string,
  recipientStore: Store,
  artifactContent: string,
  artifactRef?: string
): string {
  const ref = artifactRef ?? `artifact_${senderEntityId}_${Date.now()}`;
  const payloadHash = artifactHash(artifactContent);
  const signature = signArtifact(senderEntityId, artifactContent);

  putInbox(
    recipientStore,
    senderEntityId,
    ref,
    payloadHash,
    signature,
    artifactContent.slice(0, 100_000)
  );

  return ref;
}

/**
 * Get inbox artifacts for this entity. If verify=true, only return entries
 * where the signature is valid for the sender. Each entry includes
 * from_entity_id, artifact_ref, payload_text, verified.
 */
export function receiveArtifacts(
  store: Store,
  options: { limit?: number; verify?: boolean } = {}
): ReceivedArtifact[] {
  const { limit = 20, verify = true } = options;
  const entries = getInbox(store, limit);

  return entries.map((e) => {
    let ok = true;
    if (verify && e.payload_text && e.signature) {
      ok = verifyArtifact(e.from_entity_id, e.payload_text, e.signature);
    }
    return {
      from_entity_id: e.from_entity_id,
      artifact_ref: e.artifact_ref,
      payload_text: e.payload_text ?? "",
      verified: ok,
    };
  });
}
