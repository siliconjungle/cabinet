# cabinet
A key value store & subscriptions wrapping a json blob crdt (shelf).

Based on the work here:
https://github.com/dglittle/shelf

Expanded to include more robust type checking and splits the shelf out into value, versions and history.
Spaces are a store for a list of cabinets; this is useful for splitting out data types.
