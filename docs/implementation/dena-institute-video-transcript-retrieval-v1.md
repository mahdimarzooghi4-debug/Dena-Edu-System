# Dena institute video transcript retrieval v1

## Delivered

An active institute member can enter a transcript for a ready video in an institute-owned course only after the latest per-video AI permission event is a grant. The submitted text is normalized, fingerprinted with SHA-256, split into bounded chunks, and stored against the exact video and course. The institute page displays chunk counts without returning transcript text.

When a student asks a question the reviewed Dena starter set cannot answer, Dena performs deterministic word-overlap retrieval against transcript chunks for that course. It returns one matching excerpt as a quotation with the video title. It does not summarize, infer, or generate new claims from the transcript. No question is retained.

Every transcript submission and retrieval checks current scope. Student retrieval rechecks active course entitlement, ready media status, institute ownership, and the latest permission grant. It is also behind the tutor endpoint's active-exam block. Provider-owned and independent-educator-owned video remain unavailable to this route.

A revocation serializes on the video row, appends the permission event, and deletes that video's transcript chunks in the same transaction. Retrieval also filters on the latest grant, so a withdrawn or revoked source cannot be used.

## Current limits

This is text ingestion, not video processing. An authorized institute operator must supply the transcript; Dena does not extract speech from MP4, create embeddings, call an external model, fine-tune a model, or change a model's weights. The tutor returns a matching source quotation only. The current lexical method is an initial baseline and needs relevance evaluation before expansion.

## Before production use

The permission event's `rightsReviewRef` is an institute-provided audit pointer; Dena does not verify the underlying rights record. Production use remains blocked until the rights review operation is independently validated and the production database role is confirmed unable to update or delete permission events. Non-institute content owners also need a separate authorization workflow before their videos can be processed. These are release gates; this PR does not deploy or enable them in production.
