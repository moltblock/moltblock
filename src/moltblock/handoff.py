"""Multi-entity handoff: Entity A produces signed artifact -> Entity B consumes as input."""

from .persistence import Store, get_inbox, put_inbox
from .signing import artifact_hash, sign_artifact, verify_artifact


def send_artifact(
    sender_entity_id: str,
    recipient_store: Store,
    artifact_content: str,
    artifact_ref: str | None = None,
) -> str:
    """
    Sign artifact and deliver to recipient's inbox. Returns artifact_ref.
    recipient_store is the recipient entity's Store (entity_id = recipient).
    """
    import time
    ref = artifact_ref or f"artifact_{sender_entity_id}_{int(time.time() * 1000)}"
    payload_hash = artifact_hash(artifact_content)
    signature = sign_artifact(sender_entity_id, artifact_content)
    put_inbox(
        recipient_store,
        from_entity_id=sender_entity_id,
        artifact_ref=ref,
        payload_hash=payload_hash,
        signature=signature,
        payload_text=artifact_content[:100_000],
    )
    return ref


def receive_artifacts(
    store: Store,
    limit: int = 20,
    verify: bool = True,
) -> list[dict]:
    """
    Get inbox artifacts for this entity. If verify=True, only return entries
    where the signature is valid for the sender. Each entry includes
    from_entity_id, artifact_ref, payload_text, verified.
    """
    entries = get_inbox(store, limit=limit)
    result = []
    for e in entries:
        ok = True
        if verify and e.get("payload_text") and e.get("signature"):
            ok = verify_artifact(e["from_entity_id"], e["payload_text"], e["signature"])
        result.append({
            "from_entity_id": e["from_entity_id"],
            "artifact_ref": e["artifact_ref"],
            "payload_text": e.get("payload_text", ""),
            "verified": ok,
        })
    return result
