# Dena institute video transcript retrieval v1

## Delivered

An active member of the responsible institute can enter a transcript for a ready video in an institute-owned course or a currently supervised independent-educator course, after the latest per-video AI permission event is a grant. Independent-educator courses also require the approved institute affiliation and supervision grant to remain active. The submitted text is normalized, fingerprinted with SHA-256, split into bounded chunks, and stored against the exact video and course. The institute page displays chunk counts without returning transcript text.

When a student asks a question the reviewed Dena starter set cannot answer, Dena performs deterministic word-overlap retrieval against transcript chunks for that course. It returns one matching excerpt as a quotation with the video title. It does not summarize, infer, or generate new claims from the transcript. No question is retained.

Every transcript submission and retrieval checks current scope. Student retrieval rechecks active course entitlement, ready media status, current institute ownership or active independent-educator supervision, and the latest permission grant. It is also behind the tutor endpoint's active-exam block. Verified-provider-owned video remains unavailable. An independent educator's video is available only to students with course entitlement, while the supervising institute's affiliation, course supervision and per-video permission remain valid.

A revocation serializes on the video row, appends the permission event, and deletes that video's transcript chunks in the same transaction. Retrieval also filters on the latest grant, so a withdrawn or revoked source cannot be used.

## Current limits

This is text ingestion, not video processing. An authorized institute operator must supply the transcript; Dena does not extract speech from MP4, create embeddings, call an external model, fine-tune a model, or change a model's weights. The tutor returns a matching source quotation only. The current lexical method is an initial baseline and needs relevance evaluation before expansion.

## Before production use

The permission event's `rightsReviewRef` is an institute-provided audit pointer; Dena does not verify the underlying rights record. Production use remains blocked until the rights review operation is independently validated and the production database role is confirmed unable to update or delete permission events. Verified-provider content remains blocked pending a separate authorization workflow. Rights references remain human-reviewed audit pointers, not proof. These are release gates; this PR does not deploy or enable them in production.


## Learning-concept tags

Each institute-reviewed transcript is assigned one versioned Dena learning-concept ID from the bounded taxonomy. That tag is stored with each transcript chunk, exposed only in institute transcript status, and used as a secondary retrieval preference when the same student has asked for more guidance on a tagged video. A tag is not a mastery score and does not train or fine-tune model weights. Existing transcripts remain untagged until an institute operator replaces them with a tagged transcript.
