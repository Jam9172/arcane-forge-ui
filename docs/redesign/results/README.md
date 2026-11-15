# Results

One file per batch, named after it (`M1-mode-bar.md`), written by the agent that built it and finished by the agent that checked it. Keep to this shape so the lead and the integration batches can read every file the same way.

```markdown
# <batch>

## Built
What exists now that did not before, in a few lines.

## Test output
The last run of the brief's "Check" commands, pasted.

## Choices the bible did not cover
Each choice, and why. "None" if none.

## Asked of other files
Changes this batch needs in files it does not own. "None" if none.

## Not done
Anything in the brief that is not finished, and why. "Nothing" if it is all done.

## Check
Written by the checking agent: PASS or FAIL, then one line of evidence for each item it checked.
```
