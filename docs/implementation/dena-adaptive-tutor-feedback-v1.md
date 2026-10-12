# Dena adaptive tutor feedback v1

## What this adds

The student can separately opt in to retaining a small outcome aggregate for practice from their most recently saved topic. The server stores only total attempts and correct answers on that student's topic row. The selected option, prompt, and free-text response are not retained.

When the latest retained result for a topic is incorrect, the next practice response includes a reviewed step-by-step hint for that starter-corpus topic, and a later tutor answer for that same topic includes the same fixed hint. Saving a correct result clears the guidance flag for that topic. Unrecorded answers do not change it. The hint is fixed authored content; it is not generated from the student's answer. The aggregate is not a grade, ability estimate, or trained model.

## Controls and access

- Saving a topic and saving practice outcomes use separate, unchecked-by-default choices.
- The practice API grades answers on the server and returns no answer key.
- Practice and tutor access continue to require student role, active course entitlement, and no active exam.
- The student can delete all saved tutor topics and associated outcome aggregates from the student tutor panel.
- Per-topic attempt and correct counters are bounded at 10,000.

## Current limits

This is deterministic adaptation over Dena's reviewed starter corpus, not model training or fine-tuning. It does not generate new answers, process institute videos, or use other students' data. Video ingestion and model training remain future work requiring separate product, data-rights, and infrastructure decisions.
