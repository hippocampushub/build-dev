from . import ebrains, hippocampome, internal, modeldb, neuromorpho

PROVIDERS = {p.NAME: p for p in (internal, neuromorpho, modeldb, ebrains, hippocampome)}
