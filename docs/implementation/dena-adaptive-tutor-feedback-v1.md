# Dena adaptive tutor feedback v1

## What this adds

The student can separately opt in to retaining a small outcome aggregate for practice from their most recently saved topic. The server stores only total attempts and correct answers on that student's topic row. The selected option, prompt, and free-text response are not retained.

When a student has at least one retained incorrect result, the next practice response includes a reviewed step-by-step hint for the relevant starter-corpus topic. The hint is fixed authored content; it is not generated from the student's answer. The aggregate is not a grade, ability estimate, or trained model.

## Controls and access

- Saving a topic and saving practice outcomes use separate, unchecked-by-default choices.
- The practice API grades answers on the server and returns no answer key.
- Practice and tutor access continue to require student role, active course entitlement, and no active exam.
- The student can delete all saved tutor topics and associated outcome aggregates from the student tutor panel.
- Per-topic attempt and correct counters are bounded at 10,000.

## Current limits

This is a deterministic feature over Dena's reviewed starter corpus. It does not train or fine-tune a model, process institute videos, change the tutor's generated responses, or learn from other students' data. Video ingestion and model training remain future work requiring separate product, data-rights, and infrastructure decisions.
