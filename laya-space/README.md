---
title: Murmur Laya
emoji: 🌊
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

Runs [Laya](https://github.com/NandhaKishorM/laya), an open decision model, as an HTTP service for
[Murmur](https://github.com/chndr-prksh/murmur). Murmur sends it one sentence per news source and
Laya returns whether the report is critical, neutral or supportive.

Endpoint: `POST /v1/systemone/batch`
