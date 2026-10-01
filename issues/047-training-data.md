# Vertical-expanded training data

Status: done
Labels: data

Built scripts/train-data/nsfw-v2.json (348 balanced rows: rollout harm + 10 business verticals x intents). 6th training run (GRU, forced iterations): 3/4 harmful, 1/8 clean — still collapses, model NOT shipped. Keyword scorer stands.
